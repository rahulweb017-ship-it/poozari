import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import {
  commissionSettingSchema,
  generateSettlementsSchema,
  paySettlementSchema,
  UserRole,
} from '@poozari/shared';
import { CurrentUser, JwtPayload, Roles } from '../common/decorators';
import { RolesGuard } from '../common/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { EarningsService } from './earnings.service';

@UseGuards(RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
@Controller('admin')
export class AdminEarningsController {
  constructor(private readonly earnings: EarningsService) {}

  @Get('settings/commission')
  async getCommission() {
    return { percent: await this.earnings.getCommissionPercent() };
  }

  @Patch('settings/commission')
  setCommission(@Body(new ZodValidationPipe(commissionSettingSchema)) body: any) {
    return this.earnings.setCommissionPercent(body.percent);
  }

  @Get('pandits/:id/overview')
  panditOverview(@Param('id') id: string) {
    return this.earnings.adminPanditOverview(id);
  }

  @Get('payments')
  listPayments(
    @Query('tab') tab?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('panditId') panditId?: string,
  ) {
    return this.earnings.listPayments(tab, { from, to, panditId });
  }

  @Get('payments/summary')
  paymentsSummary(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('panditId') panditId?: string,
  ) {
    return this.earnings.paymentsSummary({ from, to, panditId });
  }

  @Get('settlements')
  listSettlements(@Query('status') status?: string, @Query('panditId') panditId?: string) {
    return this.earnings.listSettlements({ status, panditId });
  }

  @Post('settlements')
  generateSettlements(@Body(new ZodValidationPipe(generateSettlementsSchema)) body: any) {
    return this.earnings.generateWeekly(body.weekStart);
  }

  @Post('settlements/:id/pay')
  paySettlement(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(paySettlementSchema)) body: any,
  ) {
    return this.earnings.markSettlementPaid(id, body);
  }
}

@UseGuards(RolesGuard)
@Roles(UserRole.PANDIT)
@Controller('pandit')
export class PanditEarningsController {
  constructor(private readonly earnings: EarningsService) {}

  @Get('earnings')
  list(@CurrentUser() user: JwtPayload, @Query('from') from?: string, @Query('to') to?: string) {
    return this.earnings.panditEarnings(user.sub, from, to);
  }

  @Get('earnings/summary')
  summary(@CurrentUser() user: JwtPayload, @Query('from') from?: string, @Query('to') to?: string) {
    return this.earnings.panditSummary(user.sub, from, to);
  }

  @Get('settlements')
  settlements(@CurrentUser() user: JwtPayload) {
    return this.earnings.panditSettlements(user.sub);
  }
}
