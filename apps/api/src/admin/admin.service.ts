import { Injectable } from '@nestjs/common';
import { BookingStatus } from '@poozari/shared';
import { bookingInclude, serializeBooking } from '../bookings/booking.serializer';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async listBookings(status?: string) {
    const bookings = await this.prisma.booking.findMany({
      where: status ? { status: status as BookingStatus } : {},
      include: bookingInclude,
      orderBy: { createdAt: 'desc' },
    });
    return bookings.map(serializeBooking);
  }

  /** Bookings that are paid but not yet assigned to any pandit. */
  async unassignedQueue() {
    const bookings = await this.prisma.booking.findMany({
      where: { status: BookingStatus.PAID, assignment: null },
      include: bookingInclude,
      orderBy: { createdAt: 'asc' },
    });
    return bookings.map(serializeBooking);
  }

  async dashboard() {
    const [total, paid, assigned, completed, revenue, pandits, customers] = await Promise.all([
      this.prisma.booking.count(),
      this.prisma.booking.count({ where: { status: BookingStatus.PAID } }),
      this.prisma.booking.count({ where: { status: BookingStatus.ASSIGNED } }),
      this.prisma.booking.count({ where: { status: BookingStatus.COMPLETED } }),
      this.prisma.payment.aggregate({
        _sum: { amountInr: true },
        where: { status: 'PAID' },
      }),
      this.prisma.panditProfile.count(),
      this.prisma.user.count({ where: { role: 'CUSTOMER' } }),
    ]);
    return {
      totalBookings: total,
      awaitingAssignment: paid,
      assigned,
      completed,
      revenueInr: revenue._sum.amountInr ?? 0,
      pandits,
      customers,
    };
  }
}
