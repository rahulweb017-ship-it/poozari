import { Module } from '@nestjs/common';
import { LiveModule } from '../../live/live.module';
import { ProductOrdersModule } from '../../product-orders/product-orders.module';
import { PaymentsModule } from '../payments.module';
import { RazorpayWebhookController } from './razorpay-webhook.controller';
import { RazorpayWebhookService } from './razorpay-webhook.service';

/**
 * Deliberately a separate module rather than part of PaymentsModule.
 *
 * The webhook needs all three payment flows, but ProductOrdersModule and
 * LiveModule already import PaymentsModule for the gateway. Putting the
 * webhook inside PaymentsModule would close that loop into a circular
 * dependency; as a leaf that imports all three, nothing points back at it.
 */
@Module({
  imports: [PaymentsModule, ProductOrdersModule, LiveModule],
  controllers: [RazorpayWebhookController],
  providers: [RazorpayWebhookService],
})
export class RazorpayWebhookModule {}
