import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, PaymentStatus } from '@poozari/shared';
import { ConfigService } from '@nestjs/config';
import { AssignmentService } from '../admin/assignment.service';
import { EmailService } from '../email/email.service';
import { bookingConfirmation } from '../email/email.templates';
import { bookingInclude, serializeBooking } from '../bookings/booking.serializer';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentGatewayService } from './payment-gateway.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PaymentGatewayService,
    private readonly assignment: AssignmentService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  async createOrder(customerId: string, bookingId: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerId !== customerId) throw new ForbiddenException();
    if (booking.status !== BookingStatus.PENDING_PAYMENT) {
      throw new BadRequestException('This booking is already paid');
    }

    const order = await this.gateway.createOrder(
      booking.amountInr,
      booking.reference,
      `order_dev_${booking.id}`,
    );

    await this.prisma.payment.upsert({
      where: { bookingId },
      update: { razorpayOrderId: order.orderId, status: PaymentStatus.CREATED },
      create: {
        bookingId,
        amountInr: booking.amountInr,
        razorpayOrderId: order.orderId,
        status: PaymentStatus.CREATED,
      },
    });

    return order;
  }

  async verify(
    customerId: string,
    bookingId: string,
    data: {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    },
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { payment: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerId !== customerId) throw new ForbiddenException();

    // Already settled — most likely the webhook won the race with this
    // callback. Return the booking rather than erroring at a customer who
    // did nothing wrong and has in fact paid.
    if (booking.payment?.status === PaymentStatus.PAID) {
      return serializeBooking(
        await this.prisma.booking.findUnique({ where: { id: bookingId }, include: bookingInclude }),
      );
    }

    if (!booking.payment?.razorpayOrderId) {
      throw new BadRequestException('Create a payment order before verifying payment');
    }

    // Bind the signature to *this* booking's order. Without this a genuine
    // triple from any cheap payment of one's own could be replayed against an
    // expensive unpaid booking — the signature would verify, because it is
    // validly signed, just not for this order.
    if (data.razorpay_order_id && data.razorpay_order_id !== booking.payment.razorpayOrderId) {
      throw new BadRequestException('Payment order does not match this booking');
    }

    if (!this.gateway.verifySignature(data)) {
      await this.prisma.payment.update({
        where: { bookingId },
        data: { status: PaymentStatus.FAILED },
      });
      throw new BadRequestException('Payment signature verification failed');
    }

    const updated = await this.settle(
      bookingId,
      data.razorpay_payment_id ?? `pay_dev_${booking.id}`,
      data.razorpay_signature ?? 'dev',
    );

    return serializeBooking(updated);
  }

  /**
   * Settle a booking whose order was paid, whichever route told us: the
   * browser callback or the Razorpay webhook.
   *
   * The status change is a conditional updateMany rather than an update, so
   * when both routes arrive at once exactly one of them claims the booking and
   * the loser does no work. That keeps auto-assignment and the confirmation
   * email firing once, not twice.
   */
  private async settle(bookingId: string, paymentId: string, signature: string) {
    const claimed = await this.prisma.booking.updateMany({
      where: { id: bookingId, status: BookingStatus.PENDING_PAYMENT },
      data: { status: BookingStatus.PAID },
    });

    await this.prisma.payment.updateMany({
      where: { bookingId, status: { not: PaymentStatus.PAID } },
      data: {
        status: PaymentStatus.PAID,
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
      },
    });

    if (claimed.count === 1) {
      // Area-based auto-assignment, only for the caller that won the claim.
      await this.assignment.autoAssign(bookingId).catch(() => undefined);
    }

    const updated = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: bookingInclude,
    });

    if (claimed.count === 1 && updated?.contactEmail) {
      this.sendConfirmation(updated);
    }

    return updated;
  }

  /**
   * Settle whatever booking owns this Razorpay order. Called by the webhook,
   * which knows the order id but not our booking id.
   *
   * Returns false when no booking owns the order — the webhook then tries the
   * other payment flows rather than treating it as an error.
   */
  async settleByOrderId(razorpayOrderId: string, paymentId: string): Promise<boolean> {
    const payment = await this.prisma.payment.findFirst({ where: { razorpayOrderId } });
    if (!payment) return false;
    if (payment.status === PaymentStatus.PAID) return true;
    await this.settle(payment.bookingId, paymentId, 'webhook');
    return true;
  }

  /** Record a failed payment reported by webhook, without touching a paid one. */
  async failByOrderId(razorpayOrderId: string): Promise<boolean> {
    const payment = await this.prisma.payment.findFirst({ where: { razorpayOrderId } });
    if (!payment) return false;
    await this.prisma.payment.updateMany({
      where: { id: payment.id, status: { not: PaymentStatus.PAID } },
      data: { status: PaymentStatus.FAILED },
    });
    return true;
  }

  private sendConfirmation(booking: any) {
    const webBase = (
      this.config.get<string>('WEB_BASE_URL') ?? 'http://localhost:3000'
    ).replace(/\/$/, '');
    // Not awaited: the payment has already succeeded and a mail failure must
    // not make a paid booking look like it failed.
    void this.email.send({
      to: booking.contactEmail,
      ...bookingConfirmation({
        reference: booking.reference,
        devoteeName: booking.devoteeName,
        pujaTitle: booking.puja.title,
        packageName: booking.package.name,
        amountInr: booking.amountInr,
        packageAmountInr: booking.packageAmountInr || booking.amountInr,
        addons: booking.addons.map((a: any) => ({ name: a.name, priceInr: a.priceInr })),
        preferredDate: booking.preferredDate,
        gotra: booking.gotra,
        accountUrl: `${webBase}/account/bookings/${booking.id}`,
      }),
    });
  }
}
