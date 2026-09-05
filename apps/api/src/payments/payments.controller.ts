import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@poozari/shared';
import { CurrentUser, JwtPayload, Roles } from '../common/decorators';
import { RolesGuard } from '../common/roles.guard';
import { PaymentsService } from './payments.service';

@UseGuards(RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post(':bookingId/order')
  createOrder(@CurrentUser() user: JwtPayload, @Param('bookingId') bookingId: string) {
    return this.payments.createOrder(user.sub, bookingId);
  }

  @Post(':bookingId/verify')
  verify(
    @CurrentUser() user: JwtPayload,
    @Param('bookingId') bookingId: string,
    @Body() body: any,
  ) {
    return this.payments.verify(user.sub, bookingId, body);
  }
}
