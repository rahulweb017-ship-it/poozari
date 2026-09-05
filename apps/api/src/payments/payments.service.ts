import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookingStatus, PaymentStatus } from '@poozari/shared';
import { AssignmentService } from '../admin/assignment.service';
import { bookingInclude, serializeBooking } from '../bookings/booking.serializer';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentGatewayService } from './payment-gateway.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PaymentGatewayService,
    private readonly assignment: AssignmentService,
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
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerId !== customerId) throw new ForbiddenException();

    if (!this.gateway.verifySignature(data)) {
      await this.prisma.payment.update({
        where: { bookingId },
        data: { status: PaymentStatus.FAILED },
      });
      throw new BadRequestException('Payment signature verification failed');
    }

    await this.prisma.payment.update({
      where: { bookingId },
      data: {
        status: PaymentStatus.PAID,
        razorpayPaymentId: data.razorpay_payment_id ?? `pay_dev_${booking.id}`,
        razorpaySignature: data.razorpay_signature ?? 'dev',
      },
    });
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.PAID },
    });

    // Trigger area-based auto-assignment right after payment.
    await this.assignment.autoAssign(bookingId).catch(() => undefined);

    const updated = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: bookingInclude,
    });
    return serializeBooking(updated);
  }
}
