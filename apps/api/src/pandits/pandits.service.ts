import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { PanditProfileInput, UpdatePanditInput } from '@poozari/shared';
import { UserRole } from '@poozari/shared';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PanditsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.panditProfile.findMany({
      include: { user: { select: { email: true, name: true } } },
      orderBy: { displayName: 'asc' },
    });
  }

  async getByUserId(userId: string) {
    const profile = await this.prisma.panditProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Pandit profile not found');
    return profile;
  }

  /** Create a pandit login + profile in one step (Super Admin action). */
  async create(input: PanditProfileInput & { email: string; password: string }) {
    const passwordHash = await bcrypt.hash(input.password, 10);
    const { email, password: _pw, ...profile } = input;
    const user = await this.prisma.user.create({
      data: {
        email,
        name: input.displayName,
        role: UserRole.PANDIT,
        passwordHash,
        panditProfile: {
          create: {
            displayName: profile.displayName,
            bio: profile.bio,
            phone: profile.phone,
            experienceYears: profile.experienceYears,
            specializations: profile.specializations,
            serviceCityIds: profile.serviceCityIds,
            servicePincodes: profile.servicePincodes,
            isAvailable: profile.isAvailable,
          },
        },
      },
      include: { panditProfile: true },
    });
    return user.panditProfile;
  }

  async update(id: string, input: Partial<PanditProfileInput>) {
    return this.prisma.panditProfile.update({ where: { id }, data: input });
  }

  /** Super Admin edit: update profile fields and optionally reset the login password. */
  async adminUpdate(id: string, input: UpdatePanditInput) {
    const profile = await this.prisma.panditProfile.findUnique({ where: { id } });
    if (!profile) throw new NotFoundException('Pandit not found');
    const { password, ...data } = input;
    const updated = await this.prisma.panditProfile.update({
      where: { id },
      data: {
        ...data,
        // Admin deactivation always makes the pandit permanently offline.
        ...(input.isActive === false ? { isAvailable: false } : {}),
      },
    });
    if (input.displayName) {
      await this.prisma.user.update({
        where: { id: profile.userId },
        data: { name: input.displayName },
      });
    }
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      await this.prisma.user.update({ where: { id: profile.userId }, data: { passwordHash } });
    }
    return updated;
  }

  /**
   * Super Admin delete: removes the pandit's login (cascades to the profile).
   * Refused while the pandit still has assignments or live sessions — set them
   * deactivate them instead.
   */
  async remove(id: string) {
    const profile = await this.prisma.panditProfile.findUnique({
      where: { id },
      include: { _count: { select: { assignments: true, liveSessions: true } } },
    });
    if (!profile) throw new NotFoundException('Pandit not found');
    if (profile._count.assignments > 0 || profile._count.liveSessions > 0) {
      throw new BadRequestException(
        'Cannot delete a pandit who has bookings or live sessions. Deactivate them instead.',
      );
    }
    await this.prisma.user.delete({ where: { id: profile.userId } });
    return { ok: true };
  }

  /**
   * Pick the best-fit available pandit for a booking based on service area.
   * Scoring: exact pincode match > service city match > specialization match.
   * Returns null when no available pandit fits, so the booking falls back to
   * the Super Admin's manual assignment queue.
   */
  async findBestMatch(booking: {
    pincode?: string | null;
    city?: string | null;
    cityId?: string | null;
    pujaTitle?: string;
  }): Promise<{ id: string } | null> {
    const candidates = await this.prisma.panditProfile.findMany({
      where: { isActive: true, isAvailable: true },
      include: { _count: { select: { assignments: true } } },
    });
    if (candidates.length === 0) return null;

    const scored = candidates
      .map((p) => {
        let score = 0;
        if (booking.pincode && p.servicePincodes.includes(booking.pincode)) score += 100;
        if (booking.cityId && p.serviceCityIds.includes(booking.cityId)) score += 50;
        if (
          booking.city &&
          p.servicePincodes.length === 0 &&
          p.serviceCityIds.length === 0
        ) {
          // Generalist pandit with no declared area — usable as a fallback.
          score += 5;
        }
        if (
          booking.pujaTitle &&
          p.specializations.some((s) =>
            booking.pujaTitle!.toLowerCase().includes(s.toLowerCase()),
          )
        ) {
          score += 20;
        }
        // Prefer pandits with a lighter current load.
        score -= p._count.assignments;
        return { pandit: p, score };
      })
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.length ? { id: scored[0].pandit.id } : null;
  }
}
