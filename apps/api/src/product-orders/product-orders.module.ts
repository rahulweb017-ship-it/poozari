import { Module } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { ProductOrdersController } from './product-orders.controller';
import { ProductOrdersService } from './product-orders.service';

@Module({
  imports: [PaymentsModule],
  controllers: [ProductOrdersController],
  providers: [ProductOrdersService],
  exports: [ProductOrdersService],
})
export class ProductOrdersModule {}
