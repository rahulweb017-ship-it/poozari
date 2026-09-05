import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AssignmentMode, AssignmentStatus, BookingStatus } from '@poozari/shared';
import { bookingInclude, serializeBooking } from '../bookings/booking.serializer';
import { PanditsService } from '../pandits/pandits.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pandits: PanditsService,
  ) {}

  /** Attempt area-based automatic assignment. Returns the booking regardless. */
  async autoAssign(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { puja: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const match = await this.pandits.findBestMatch({
      pincode: booking.pincode,
      city: booking.city,
      cityId: booking.puja.cityId,
      pujaTitle: booking.puja.title,
    });

    if (!match) {
      // No fit — leave in PAID state for the Super Admin's manual queue.
      return this.getBooking(bookingId);
    }
    return this.applyAssignment(bookingId, match.id, AssignmentMode.AUTO);
  }

  /** Super Admin manual (re)assignment. */
  async manualAssign(bookingId: string, panditId: string) {
    const pandit = await this.prisma.panditProfile.findUnique({ where: { id: panditId } });
    if (!pandit) throw new BadRequestException('Pandit not found');
    if (!pandit.isActive) throw new BadRequestException('This pandit profile is deactivated');
    if (!pandit.isAvailable) throw new BadRequestException('This pandit is currently offline');
    return this.applyAssignment(bookingId, panditId, AssignmentMode.MANUAL);
  }

  private async applyAssignment(bookingId: string, panditId: string, mode: AssignmentMode) {
    await this.prisma.assignment.upsert({
      where: { bookingId },
      update: { panditId, mode, status: AssignmentStatus.ASSIGNED },
      create: { bookingId, panditId, mode, status: AssignmentStatus.ASSIGNED },
    });
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: BookingStatus.ASSIGNED },
    });
    return this.getBooking(bookingId);
  }

  private async getBooking(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: bookingInclude,
    });
    return serializeBooking(booking);
  }
}
