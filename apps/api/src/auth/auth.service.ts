import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
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
import { OtpChannel } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { JwtPayload } from '../common/decorators';
import { EmailService } from '../email/email.service';
import { loginCode } from '../email/email.templates';
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
    private readonly email: EmailService,
  ) {}

  private normalizePhone(phone: string): string {
    return phone.replace(/^\+?91/, '').replace(/\D/g, '').slice(-10);
  }

  /**
   * Resolve a login request to the one identifier it carries.
   *
   * The schemas guarantee exactly one of phone/email is present, so the throw
   * is only there to keep the return type honest.
   */
  private resolveTarget(input: { phone?: string; email?: string }): {
    identifier: string;
    channel: OtpChannel;
  } {
    if (input.phone) {
      return { identifier: this.normalizePhone(input.phone), channel: OtpChannel.SMS };
    }
    if (input.email) {
      // Already trimmed and lowercased by `emailSchema`, so it matches the
      // stored `User.email` and its own earlier codes.
      return { identifier: input.email, channel: OtpChannel.EMAIL };
    }
    throw new HttpException(
      'Enter either a mobile number or an email address',
      HttpStatus.BAD_REQUEST,
    );
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
   * SMS codes stay off until the DLT sender and template are registered, so
   * `PHONE_LOGIN_ENABLED=true` has to be set to send one. Email codes are
   * always available.
   */
  private get phoneLoginEnabled(): boolean {
    return this.config.get('PHONE_LOGIN_ENABLED') === 'true';
  }

  /**
   * Generate, store and send a one-time code to a mobile number or an email.
   *
   * Rate limited per identifier: sending real SMS costs money, and an
   * unthrottled OTP endpoint is both an abuse vector and a way to harass
   * whoever owns that number or inbox.
   */
  async requestOtp(
    input: RequestOtpInput,
  ): Promise<{ ok: true; devCode?: string; resendAfterSeconds: number }> {
    const { identifier, channel } = this.resolveTarget(input);
    if (channel === OtpChannel.SMS && !this.phoneLoginEnabled) {
      throw new HttpException(
        'Sign-in with a mobile number is not available yet. Please use your email address.',
        HttpStatus.BAD_REQUEST,
      );
    }
    const now = new Date();

    const [latest, lastHourCount] = await Promise.all([
      this.prisma.otpCode.findFirst({
        where: { identifier, channel },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.otpCode.count({
        where: { identifier, channel, createdAt: { gt: new Date(now.getTime() - 60 * 60 * 1000) } },
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
        channel === OtpChannel.EMAIL
          ? 'Too many codes requested for this email address. Try again in an hour.'
          : 'Too many codes requested for this number. Try again in an hour.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 8);

    // Retire any code still outstanding, so only the newest one can be used.
    await this.prisma.otpCode.updateMany({
      where: { identifier, channel, consumedAt: null },
      data: { consumedAt: now },
    });
    const created = await this.prisma.otpCode.create({
      data: { identifier, channel, codeHash, expiresAt: new Date(now.getTime() + OTP_TTL_MS) },
    });

    if (this.otpDevMode) {
      return { ok: true, devCode: code, resendAfterSeconds: OTP_RESEND_COOLDOWN_MS / 1000 };
    }

    try {
      if (channel === OtpChannel.EMAIL) {
        // `EmailService.send` is fire-and-forget by design: it resolves false
        // rather than throwing, including when SMTP is not configured at all.
        // A login code is the one message where that is not acceptable —
        // swallowing it would park the devotee on the code screen waiting for
        // an email that was never sent.
        const sent = await this.email.send({ to: identifier, ...loginCode({ code, minutes: 5 }) });
        if (!sent) {
          throw new ServiceUnavailableException(
            'Could not send the code to that email address. Please try again shortly.',
          );
        }
      } else {
        await this.sms.sendOtp(identifier, code);
      }
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
    const { identifier, channel } = this.resolveTarget(input);
    const otp = await this.prisma.otpCode.findFirst({
      where: { identifier, channel, consumedAt: null, expiresAt: { gt: new Date() } },
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

    // A verified code is also the sign-up: an identifier nobody has used before
    // creates the account here, which is why there is no registration form.
    const where = channel === OtpChannel.EMAIL ? { email: identifier } : { phone: identifier };

    // Staff accounts carry an email, so an emailed code would otherwise mint a
    // SUPER_ADMIN or PANDIT token and walk straight past their password login.
    // Mirrors the reciprocal check in `staffLogin`.
    const existing = await this.prisma.user.findUnique({ where });
    if (existing && existing.role !== UserRole.CUSTOMER) {
      throw new UnauthorizedException('Use the staff login for this account');
    }

    const user = await this.prisma.user.upsert({
      where,
      update: input.name ? { name: input.name } : {},
      create: { ...where, name: input.name ?? 'Devotee', role: UserRole.CUSTOMER },
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
    const { identifier, channel } = this.resolveTarget(input);
    const user = await this.prisma.user.findUnique({
      where: channel === OtpChannel.EMAIL ? { email: identifier } : { phone: identifier },
    });
    if (
      !user ||
      user.role !== UserRole.CUSTOMER ||
      !user.passwordHash ||
      !(await bcrypt.compare(input.password, user.passwordHash))
    ) {
      // One message for every failure, so this cannot be used to find out
      // which numbers or addresses have an account.
      throw new UnauthorizedException('Invalid credentials');
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
    if (!input.email) {
      // An account created by an emailed code has no mobile number, so the
      // address is its only way back in. Blanking the field would lock the
      // devotee out of their own bookings for good.
      const current = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true },
      });
      if (!current?.phone) {
        throw new BadRequestException(
          'Add a mobile number before removing your email address — it is the only way you can sign in.',
        );
      }
    }

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
