import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
   * Generate and store a one-time code.
   * Dev mode: the code is returned in the API response and no SMS is sent.
   * Otherwise: the code is sent to the phone via Fast2SMS.
   */
  async requestOtp(input: RequestOtpInput): Promise<{ ok: true; devCode?: string }> {
    const phone = this.normalizePhone(input.phone);
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await bcrypt.hash(code, 8);
    await this.prisma.otpCode.create({
      data: { phone, codeHash, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
    });
    const devMode = this.config.get('OTP_DEV_MODE') !== 'false';
    if (devMode) {
      return { ok: true, devCode: code };
    }
    await this.sms.sendOtp(phone, code);
    return { ok: true };
  }

  async verifyOtp(input: VerifyOtpInput): Promise<AuthResponse> {
    const phone = this.normalizePhone(input.phone);
    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp || !(await bcrypt.compare(input.code, otp.codeHash))) {
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
