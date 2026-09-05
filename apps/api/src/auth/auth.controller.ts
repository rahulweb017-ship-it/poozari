import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import {
  changePasswordSchema,
  createStaffSchema,
  customerPasswordLoginSchema,
  requestOtpSchema,
  staffLoginSchema,
  updateCustomerProfileSchema,
  UserRole,
  verifyOtpSchema,
} from '@poozari/shared';
import { CurrentUser, JwtPayload, Public, Roles } from '../common/decorators';
import { RolesGuard } from '../common/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('otp/request')
  requestOtp(@Body(new ZodValidationPipe(requestOtpSchema)) body: any) {
    return this.auth.requestOtp(body);
  }

  @Public()
  @Post('otp/verify')
  verifyOtp(@Body(new ZodValidationPipe(verifyOtpSchema)) body: any) {
    return this.auth.verifyOtp(body);
  }

  @Public()
  @Post('login')
  login(@Body(new ZodValidationPipe(staffLoginSchema)) body: any) {
    return this.auth.staffLogin(body);
  }

  @Public()
  @Post('customer/login')
  customerLogin(@Body(new ZodValidationPipe(customerPasswordLoginSchema)) body: any) {
    return this.auth.customerPasswordLogin(body);
  }

  @Get('me')
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.me(user.sub);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.CUSTOMER)
  @Patch('me')
  updateMe(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(updateCustomerProfileSchema)) body: any,
  ) {
    return this.auth.updateCustomerProfile(user.sub, body);
  }

  @Patch('me/password')
  changePassword(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(changePasswordSchema)) body: any,
  ) {
    return this.auth.changePassword(user.sub, body);
  }

  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Post('staff')
  createStaff(@Body(new ZodValidationPipe(createStaffSchema)) body: any) {
    return this.auth.createStaff(body);
  }
}
