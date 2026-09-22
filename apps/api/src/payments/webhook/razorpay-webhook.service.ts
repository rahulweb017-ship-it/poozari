import { Injectable, Logger } from '@nestjs/common';
import { LiveService } from '../../live/live.service';
import { ProductOrdersService } from '../../product-orders/product-orders.service';
import { PaymentsService } from '../payments.service';

/**
 * Routes a verified Razorpay webhook to whichever record owns the order.
 *
 * A Razorpay order id is unique across the account, so exactly one of the
 * three flows owns any given one. Each `settleByOrderId` returns false when
 * the order is not its own, and we stop at the first that claims it.
 */
@Injectable()
export class RazorpayWebhookService {
  private readonly logger = new Logger(RazorpayWebhookService.name);

  constructor(
    private readonly payments: PaymentsService,
    private readonly productOrders: ProductOrdersService,
    private readonly live: LiveService,
  ) {}

  async handle(event: string, payload: any): Promise<void> {
    const payment = payload?.payment?.entity;
    const orderId: string | undefined = payment?.order_id;
    const paymentId: string | undefined = payment?.id;

    if (!orderId || !paymentId) {
      this.logger.warn(`Webhook ${event} carried no order/payment id — ignoring.`);
      return;
    }

    if (event === 'payment.captured' || event === 'order.paid') {
      const settled =
        (await this.payments.settleByOrderId(orderId, paymentId)) ||
        (await this.productOrders.settleByOrderId(orderId, paymentId)) ||
        (await this.live.settleByOrderId(orderId, paymentId));

      if (settled) {
        this.logger.log(`Webhook ${event}: settled ${orderId} (${paymentId}).`);
      } else {
        // Not an error: an order created by another integration, or a test
        // fired from the dashboard against an order we never stored.
        this.logger.warn(`Webhook ${event}: no record owns order ${orderId} — ignored.`);
      }
      return;
    }

    if (event === 'payment.failed') {
      const marked =
        (await this.payments.failByOrderId(orderId)) ||
        (await this.productOrders.failByOrderId(orderId));
      if (marked) this.logger.log(`Webhook payment.failed: marked ${orderId} failed.`);
      return;
    }

    // Everything else (refunds, settlements, disputes) is accepted and
    // ignored, so Razorpay does not retry deliveries we have no use for.
    this.logger.debug(`Webhook ${event} ignored.`);
  }
}
