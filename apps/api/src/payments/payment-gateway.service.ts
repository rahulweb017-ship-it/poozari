import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';

export interface GatewayOrder {
  orderId: string;
  amountInr: number;
  keyId: string;
  devMode: boolean;
}

/** Razorpay's floor for a single payment. One rupee. */
const MIN_PAISE = 100;

/**
 * Thin wrapper around Razorpay order creation + signature verification,
 * shared by booking payments, product orders and live-darshan join payments.
 *
 * The **amount always comes from a server-side record** (a booking, an order,
 * a session), never from the request body. That is the reason there is no
 * generic "create an order for this amount" endpoint: one would let a caller
 * pay a rupee for a twenty-one-thousand-rupee puja.
 *
 * When real Razorpay keys are absent it runs in dev/mock mode: order ids are
 * synthetic and verifySignature() accepts anything, so the full flow works
 * locally without a Razorpay account.
 */
@Injectable()
export class PaymentGatewayService {
  private readonly logger = new Logger(PaymentGatewayService.name);
  readonly keyId: string;
  private readonly keySecret: string;
  readonly liveMode: boolean;
  private readonly rzp?: Razorpay;

  constructor(private readonly config: ConfigService) {
    this.keyId = this.config.get<string>('RAZORPAY_KEY_ID') ?? '';
    this.keySecret = this.config.get<string>('RAZORPAY_KEY_SECRET') ?? '';
    // Live mode only when real-looking keys are configured. `rzp_test_...` keys
    // are live in this sense: they talk to Razorpay, they just do not move money.
    this.liveMode = this.keyId.startsWith('rzp_') && this.keySecret.length > 8;
    if (this.liveMode) {
      this.rzp = new Razorpay({ key_id: this.keyId, key_secret: this.keySecret });
      this.logger.log(`Razorpay live: ${this.keyId}`);
    } else {
      this.logger.warn('Razorpay keys not configured — payments run in mock mode.');
    }
  }

  /**
   * Create a payment order for the given amount. Returns a dev order id in
   * mock mode.
   *
   * @param amountInr whole rupees, taken from the record being paid for
   */
  async createOrder(amountInr: number, receipt: string, devOrderId: string): Promise<GatewayOrder> {
    const paise = Math.round(amountInr * 100);
    if (!Number.isFinite(paise) || paise < MIN_PAISE) {
      // Guards against a zero-priced package or a corrupted amount reaching
      // Razorpay, which would reject it with an opaque error.
      throw new BadRequestException(
        `Payment amount must be at least ₹${MIN_PAISE / 100} (got ₹${amountInr})`,
      );
    }

    let orderId: string;
    if (this.liveMode && this.rzp) {
      try {
        const order = await this.rzp.orders.create({ amount: paise, currency: 'INR', receipt });
        orderId = order.id;
      } catch (error: any) {
        // Razorpay's SDK reports HTTP status on `statusCode`.
        const status = error?.statusCode;
        const detail = error?.error?.description ?? error?.message ?? 'unknown error';
        this.logger.error(`Razorpay order creation failed (${status ?? 'no status'}): ${detail}`);
        if (status === 401) {
          throw new UnauthorizedException(
            'Payment gateway rejected our credentials. Check RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.',
          );
        }
        if (status === 400) {
          throw new BadRequestException(`Payment gateway rejected the order: ${detail}`);
        }
        throw new InternalServerErrorException(
          'Could not reach the payment gateway. Please try again.',
        );
      }
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
   * Verify a Razorpay payment signature: HMAC-SHA256 of
   * `order_id|payment_id`, keyed with the secret.
   *
   * Returns false rather than throwing, so callers can record a FAILED payment
   * before rejecting the request. In dev/mock mode always returns true.
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

    // Constant-time comparison: a plain === leaks how much of a forged
    // signature was correct through its timing.
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(razorpay_signature, 'utf8');
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }
}
