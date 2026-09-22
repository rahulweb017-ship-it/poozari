import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Logger,
  Post,
  Req,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../../common/decorators';
import { PaymentGatewayService } from '../payment-gateway.service';
import { RazorpayWebhookService } from './razorpay-webhook.service';

/**
 * Razorpay's server-to-server confirmation.
 *
 * The browser callback is best-effort: a customer who pays and then closes
 * the tab, or whose mobile 3-D Secure redirect never returns, leaves Razorpay
 * holding the money and the booking unpaid. This endpoint is what closes that
 * gap, so it must stay reachable without a login — Razorpay has no token.
 *
 * Configure it at Razorpay -> Settings -> Webhooks:
 *   URL     <PUBLIC_BASE_URL>/api/payments/webhook
 *   Secret  the same value as RAZORPAY_WEBHOOK_SECRET
 *   Events  payment.captured, payment.failed, order.paid
 */
@Controller('payments/webhook')
export class RazorpayWebhookController {
  private readonly logger = new Logger(RazorpayWebhookController.name);

  constructor(
    private readonly gateway: PaymentGatewayService,
    private readonly webhook: RazorpayWebhookService,
  ) {}

  @Public()
  @Post()
  @HttpCode(200)
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-razorpay-signature') signature?: string,
  ) {
    if (!this.gateway.webhooksEnabled) {
      // 503 rather than 200: Razorpay retries, so deliveries are not lost if
      // the secret is simply missing from this deploy's environment.
      throw new ServiceUnavailableException('Webhooks are not configured');
    }

    const raw = req.rawBody;
    if (!raw) {
      this.logger.error('Webhook received without a raw body — check rawBody in main.ts.');
      throw new BadRequestException('Missing request body');
    }

    if (!this.gateway.verifyWebhookSignature(raw, signature)) {
      // Anyone can reach this URL, so an unverified body is treated as hostile
      // and nothing is read out of it.
      this.logger.warn('Webhook signature verification failed — rejected.');
      throw new BadRequestException('Invalid webhook signature');
    }

    const body = req.body as { event?: string; payload?: unknown };
    if (!body?.event) throw new BadRequestException('Missing event');

    try {
      await this.webhook.handle(body.event, body.payload);
    } catch (error: any) {
      // Swallow and 200: Razorpay retries a non-2xx for hours, and a bug in
      // our handling should not turn into a delivery storm. The log is the
      // record to reconcile from.
      this.logger.error(
        `Webhook ${body.event} failed: ${error?.message ?? error}`,
        error?.stack,
      );
    }

    return { ok: true };
  }
}
