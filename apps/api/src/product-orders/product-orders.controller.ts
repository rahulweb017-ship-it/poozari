import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { createProductOrderSchema, UserRole } from '@poozari/shared';
import { CurrentUser, type JwtPayload, Roles } from '../common/decorators';
import { RolesGuard } from '../common/roles.guard';
import { ZodValidationPipe } from '../common/zod-validation.pipe';
import { ProductOrdersService } from './product-orders.service';

@UseGuards(RolesGuard)
@Roles(UserRole.CUSTOMER)
@Controller('product-orders')
export class ProductOrdersController {
  constructor(private readonly orders: ProductOrdersService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body(new ZodValidationPipe(createProductOrderSchema)) body: any,
  ) {
    return this.orders.create(user.sub, body);
  }

  @Get('me')
  listMine(@CurrentUser() user: JwtPayload) {
    return this.orders.listForCustomer(user.sub);
  }

  @Get(':id')
  getOne(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.orders.getForCustomer(user.sub, id);
  }

  @Post(':id/payment-order')
  createPaymentOrder(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.orders.createPaymentOrder(user.sub, id);
  }

  @Post(':id/verify-payment')
  verifyPayment(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.orders.verifyPayment(user.sub, id, body);
  }
}
