import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { CreateBookingInput, CreateReviewInput } from '@poozari/shared';
import { BookingStatus, makeBookingReference } from '@poozari/shared';
import { PrismaService } from '../prisma/prisma.service';
import { bookingInclude, serializeBooking } from './booking.serializer';

@Injectable()
export class BookingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(customerId: string, input: CreateBookingInput) {
    const pkg = await this.prisma.package.findUnique({ where: { id: input.packageId } });
    if (!pkg || pkg.pujaId !== input.pujaId) {
      throw new BadRequestException('Selected package does not belong to this puja');
    }
    const booking = await this.prisma.booking.create({
      data: {
        reference: makeBookingReference(),
        customerId,
        pujaId: input.pujaId,
        packageId: input.packageId,
        status: BookingStatus.PENDING_PAYMENT,
        devoteeName: input.devoteeName,
        gotra: input.gotra ?? '',
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        preferredDate: input.preferredDate,
        preferredTime: input.preferredTime ?? '',
        addressLine: input.addressLine ?? '',
        city: input.city ?? '',
        pincode: input.pincode,
        notes: input.notes ?? '',
        amountInr: pkg.priceInr,
      },
      include: bookingInclude,
    });
    return serializeBooking(booking);
  }

  async listForCustomer(customerId: string) {
    const bookings = await this.prisma.booking.findMany({
      where: { customerId },
      include: bookingInclude,
      orderBy: { createdAt: 'desc' },
    });
    return bookings.map(serializeBooking);
  }

  async getForCustomer(customerId: string, id: string) {
    const booking = await this.prisma.booking.findUnique({ where: { id }, include: bookingInclude });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerId !== customerId) throw new ForbiddenException();
    return serializeBooking(booking);
  }

  async createReview(customerId: string, bookingId: string, input: CreateReviewInput) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.customerId !== customerId) throw new ForbiddenException();
    if (booking.status !== BookingStatus.COMPLETED) {
      throw new BadRequestException('You can review a puja only after it is completed');
    }
    const customer = await this.prisma.user.findUnique({ where: { id: customerId } });
    const review = await this.prisma.review.upsert({
      where: { bookingId },
      update: { rating: input.rating, comment: input.comment ?? '' },
      create: {
        bookingId,
        customerId,
        customerName: customer?.name ?? booking.devoteeName,
        rating: input.rating,
        comment: input.comment ?? '',
      },
    });
    return {
      id: review.id,
      bookingId: review.bookingId,
      customerName: review.customerName,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
    };
  }
}
