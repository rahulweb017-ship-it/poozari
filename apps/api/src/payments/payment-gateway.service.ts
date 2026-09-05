import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';

export interface GatewayOrder {
  orderId: string;
  amountInr: number;
  keyId: string;
  devMode: boolean;
}

/**
 * Thin wrapper around Razorpay order creation + signature verification,
 * shared by booking payments and live-darshan join payments.
 *
 * When real Razorpay keys are absent it runs in dev/mock mode: order ids are
 * synthetic and verifySignature() accepts anything, so the full flow works
 * locally without a Razorpay account.
 */
@Injectable()
export class PaymentGatewayService {
  readonly keyId: string;
  private readonly keySecret: string;
  readonly liveMode: boolean;
  private readonly rzp?: Razorpay;

  constructor(private readonly config: ConfigService) {
    this.keyId = this.config.get<string>('RAZORPAY_KEY_ID') ?? '';
    this.keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET') ?? '';
    // Live mode only when real-looking keys are configured.
    this.liveMode = this.keyId.startsWith('rzp_') && this.keySecret.length > 8;
    if (this.liveMode) {
      this.rzp = new Razorpay({ key_id: this.keyId, key_secret: this.keySecret });
    }
  }

  /** Create a payment order for the given amount. Returns a dev order id in mock mode. */
  async createOrder(amountInr: number, receipt: string, devOrderId: string): Promise<GatewayOrder> {
    let orderId: string;
    if (this.liveMode && this.rzp) {
      const order = await this.rzp.orders.create({
        amount: amountInr * 100,
        currency: 'INR',
        receipt,
      });
      orderId = order.id;
    } else {
      orderId = devOrderId;
    }
    return {
      orderId,
      amountInr,
      keyId: this.keyId || 'rzp_test_dev',
      devMode: !this.liveMode,
    };
  }

  /**
   * Verify a Razorpay payment signature. In dev/mock mode always returns true.
   * Returns false (rather than throwing) so callers can record a FAILED state.
   */
  verifySignature(data: {
    razorpay_order_id?: string;
    razorpay_payment_id?: string;
    razorpay_signature?: string;
  }): boolean {
    if (!this.liveMode) return true;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = data;
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) return false;
    const expected = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');
    return expected === razorpay_signature;
  }
}
