import { Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { PaymentGatewayService } from './payment-gateway.service';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [AdminModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentGatewayService],
  exports: [PaymentGatewayService],
})
export class PaymentsModule {}
