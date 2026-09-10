import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type {
  AuthResponse,
  ChangePasswordInput,
  CreateStaffInput,
  CustomerPasswordLoginInput,
  RequestOtpInput,
  StaffLoginInput,
  UpdateCustomerProfileInput,
  VerifyOtpInput,
} from '@poozari/shared';
import { UserRole } from '@poozari/shared';
import * as bcrypt from 'bcryptjs';
import { JwtPayload } from '../common/decorators';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from '../sms/sms.service';

const OTP_TTL_MS = 5 * 60 * 1000;
/** Wait this long before a resend is allowed, so one tap cannot spam SMS. */
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
/** Codes a single number may request per hour. Real SMS costs real money. */
const OTP_MAX_PER_HOUR = 5;
/** Wrong guesses allowed before a code is burnt. */
const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly sms: SmsService,
  ) {}

  private normalizePhone(phone: string): string {
    return phone.replace(/^\+?91/, '').replace(/\D/g, '').slice(-10);
  }

  private sign(payload: JwtPayload): string {
    return this.jwt.sign(payload);
  }

  private toAuthResponse(user: {
    id: string;
    role: UserRole;
    name: string;
    email: string | null;
    phone: string | null;
  }): AuthResponse {
    const payload: JwtPayload = {
      sub: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
    };
    return {
      token: this.sign(payload),
      user: {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        phone: user.phone,
      },
    };
  }

  /**
   * Dev mode returns the code in the response instead of sending an SMS.
   *
   * It has to be switched on deliberately (`OTP_DEV_MODE=true`): defaulting to
   * on would mean a misconfigured production deploy hands out login codes over
   * the API.
   */
  private get otpDevMode(): boolean {
    return this.config.get('OTP_DEV_MODE') === 'true';
  }

  /**
   * Generate, store and send a one-time code.
   *
   * Rate limited per number: sending real SMS costs money, and an unthrottled
   * OTP endpoint is both an abuse vector and a way to harass a phone owner.
   */
  async requestOtp(
    input: RequestOtpInput,
  ): Promise<{ ok: true; devCode?: string; resendAfterSeconds: number }> {
    const phone = this.normalizePhone(input.phone);
    const now = new Date();

    const [latest, lastHourCount] = await Promise.all([
      this.prisma.otpCode.findFirst({ where: { phone }, orderBy: { createdAt: 'desc' } }),
      this.prisma.otpCode.count({
        where: { phone, createdAt: { gt: new Date(now.getTime() - 60 * 60 * 1000) } },
      }),
    ]);

    if (latest) {
      const sinceLast = now.getTime() - latest.createdAt.getTime();
      if (sinceLast < OTP_RESEND_COOLDOWN_MS) {
        const wait = Math.ceil((OTP_RESEND_COOLDOWN_MS - sinceLast) / 1000);
        throw new HttpException(
          `Please wait ${wait} second${wait === 1 ? '' : 's'} before asking for another code.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }
    if (lastHourCount >= OTP_MAX_PER_HOUR) {
      throw new HttpException(
        'Too many codes requested for this number. Try again in an hour.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 8);

    // Retire any code still outstanding, so only the newest one can be used.
    await this.prisma.otpCode.updateMany({
      where: { phone, consumedAt: null },
      data: { consumedAt: now },
    });
    const created = await this.prisma.otpCode.create({
      data: { phone, codeHash, expiresAt: new Date(now.getTime() + OTP_TTL_MS) },
    });

    if (this.otpDevMode) {
      return { ok: true, devCode: code, resendAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000 };
    }

    try {
      await this.sms.sendOtp(phone, code);
    } catch (error) {
      // Delivery failed, so this code will never be used — retire it rather
      // than leave it counting against the hourly limit.
      await this.prisma.otpCode.update({
        where: { id: created.id },
        data: { consumedAt: new Date() },
      });
      throw error;
    }

    return { ok: true, resendAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000 };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<AuthResponse> {
    const phone = this.normalizePhone(input.phone);
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    // Six digits is guessable, so a code is burnt after a handful of misses.
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { consumedAt: new Date() },
      });
      throw new UnauthorizedException('Too many incorrect attempts. Please request a new code.');
    }
    if (!(await bcrypt.compare(input.code, otp.codeHash))) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new UnauthorizedException('Invalid or expired OTP');
    }
    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    const user = await this.prisma.user.upsert({
      where: { phone },
      update: input.name ? { name: input.name } : {},
      create: { phone, name: input.name ?? 'Devotee', role: UserRole.CUSTOMER },
    });
    return this.toAuthResponse(user);
  }

  async staffLogin(input: StaffLoginInput): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      include: { panditProfile: { select: { isActive: true } } },
    });
    if (!user?.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (user.role === UserRole.CUSTOMER) {
      throw new UnauthorizedException('Use the customer login for this account');
    }
    if (user.role === UserRole.PANDIT && !user.panditProfile?.isActive) {
      throw new UnauthorizedException(
        'Your pandit profile has been deactivated by the administrator',
      );
    }
    return this.toAuthResponse(user);
  }

  async customerPasswordLogin(input: CustomerPasswordLoginInput): Promise<AuthResponse> {
    const phone = this.normalizePhone(input.phone);
    const user = await this.prisma.user.findUnique({ where: { phone } });
    if (
      !user ||
      user.role !== UserRole.CUSTOMER ||
      !user.passwordHash ||
      !(await bcrypt.compare(input.password, user.passwordHash))
    ) {
      throw new UnauthorizedException('Invalid phone number or password');
    }
    return this.toAuthResponse(user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Account not found');
    return {
      id: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
      phone: user.phone,
      hasPassword: Boolean(user.passwordHash),
      // Devotee details. Used to pre-fill the sankalp when booking.
      dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString() : null,
      gender: user.gender,
      gotra: user.gotra,
      addressLine: user.addressLine,
      city: user.city,
      state: user.state,
      pincode: user.pincode,
    };
  }

  async updateCustomerProfile(
    userId: string,
    input: UpdateCustomerProfileInput,
  ): Promise<AuthResponse> {
    try {
      const user = await this.prisma.user.update({
        where: { id: userId },
        data: {
          name: input.name,
          email: input.email || null,
          // Only fields the form actually sent are written, so a partial save
          // never wipes details the devotee entered earlier.
          ...(input.dateOfBirth !== undefined ? { dateOfBirth: input.dateOfBirth } : {}),
          ...(input.gender !== undefined ? { gender: input.gender } : {}),
          ...(input.gotra !== undefined ? { gotra: input.gotra } : {}),
          ...(input.addressLine !== undefined ? { addressLine: input.addressLine } : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
          ...(input.state !== undefined ? { state: input.state } : {}),
          ...(input.pincode !== undefined ? { pincode: input.pincode } : {}),
        },
      });
      return this.toAuthResponse(user);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException('That email address is already in use');
      }
      throw error;
    }
  }

  async changePassword(userId: string, input: ChangePasswordInput) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Account not found');

    if (user.role !== UserRole.CUSTOMER) {
      if (
        !input.currentPassword ||
        !user.passwordHash ||
        !(await bcrypt.compare(input.currentPassword, user.passwordHash))
      ) {
        throw new UnauthorizedException('Current password is incorrect');
      }
    }

    const passwordHash = await bcrypt.hash(input.newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
    return { ok: true as const };
  }

  async createStaff(input: CreateStaffInput) {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        role: input.role,
        passwordHash,
      },
    });
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  }
}
