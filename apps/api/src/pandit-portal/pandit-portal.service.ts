import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { UpdatePanditProfileInput, UploadVideoInput } from '@poozari/shared';
import { AssignmentStatus, BookingStatus } from '@poozari/shared';
import { bookingInclude, serializeBooking } from '../bookings/booking.serializer';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE } from '../storage/storage.module';
import type { ObjectStorage } from '../storage/storage.service';

/** Status transitions a pandit is allowed to make on their assigned booking. */
const PANDIT_ALLOWED_STATUSES: BookingStatus[] = [
  BookingStatus.ACCEPTED,
  BookingStatus.SCHEDULED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
];

@Injectable()
export class PanditPortalService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE) private readonly storage: ObjectStorage,
  ) {}

  private async panditProfileId(userId: string): Promise<string> {
    const profile = await this.prisma.panditProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Pandit profile not found');
    return profile.id;
  }

  async getProfile(userId: string) {
    const profile = await this.prisma.panditProfile.findUnique({
      where: { userId },
      include: { user: { select: { email: true } } },
    });
    if (!profile) throw new NotFoundException('Pandit profile not found');
    const { user, ...data } = profile;
    return { ...data, email: user.email };
  }

  async updateProfile(userId: string, input: UpdatePanditProfileInput) {
    const current = await this.prisma.panditProfile.findUnique({ where: { userId } });
    if (!current) throw new NotFoundException('Pandit profile not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.panditProfile.update({
        where: { userId },
        data: input,
      });
      if (input.displayName !== undefined) {
        await tx.user.update({
          where: { id: userId },
          data: { name: input.displayName },
        });
      }
    });
    return this.getProfile(userId);
  }

  async setAvailability(userId: string, isAvailable: boolean) {
    const profile = await this.prisma.panditProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Pandit profile not found');
    if (!profile.isActive) {
      throw new ForbiddenException('Your profile has been deactivated by the administrator');
    }
    await this.prisma.panditProfile.update({
      where: { userId },
      data: { isAvailable },
    });
    return this.getProfile(userId);
  }

  async listBookings(userId: string) {
    const panditId = await this.panditProfileId(userId);
    const bookings = await this.prisma.booking.findMany({
      where: { assignment: { panditId } },
      include: bookingInclude,
      orderBy: { preferredDate: 'asc' },
    });
    return bookings.map(serializeBooking);
  }

  private async ownedBooking(userId: string, bookingId: string) {
    const panditId = await this.panditProfileId(userId);
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { assignment: true },
    });
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.assignment?.panditId !== panditId) throw new ForbiddenException();
    return booking;
  }

  async updateStatus(userId: string, bookingId: string, status: string) {
    await this.ownedBooking(userId, bookingId);
    if (!PANDIT_ALLOWED_STATUSES.includes(status as BookingStatus)) {
      throw new BadRequestException('Invalid status transition');
    }
    if (status === BookingStatus.ACCEPTED) {
      await this.prisma.assignment.update({
        where: { bookingId },
        data: { status: AssignmentStatus.ACCEPTED },
      });
    }
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { status: status as BookingStatus },
    });
    return this.serialized(bookingId);
  }

  async uploadVideo(userId: string, bookingId: string, input: UploadVideoInput) {
    await this.ownedBooking(userId, bookingId);
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: {
        videoUrl: input.videoUrl,
        thumbnailUrl: input.thumbnailUrl,
        status: BookingStatus.COMPLETED,
      },
    });
    return this.serialized(bookingId);
  }

  /** Store an in-app recorded video file and mark the booking completed. */
  async uploadVideoFile(userId: string, bookingId: string, file: Express.Multer.File) {
    await this.ownedBooking(userId, bookingId);
    const videoUrl = await this.storage.savePublicFile(file.buffer, file.originalname);
    await this.prisma.booking.update({
      where: { id: bookingId },
      data: { videoUrl, status: BookingStatus.COMPLETED },
    });
    return this.serialized(bookingId);
  }

  private async serialized(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: bookingInclude,
    });
    return serializeBooking(booking);
  }
}
