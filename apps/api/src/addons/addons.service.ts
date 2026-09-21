import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Addon, AddonInput, UpdateAddonInput } from '@poozari/shared';
import { serializeAddon } from '../catalog/serializers';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Checkout add-ons — fruits, flowers, samagri, a hawan kund.
 *
 * Deliberately global rather than attached to a puja: the same short list is
 * offered on every booking, so there is no per-puja join to maintain and
 * editing a puja (which deletes and recreates its packages) cannot orphan
 * them.
 */
@Injectable()
export class AddonsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public list: what the booking page offers. */
  async listActive(): Promise<Addon[]> {
    const rows = await this.prisma.addon.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map(serializeAddon);
  }

  /** Admin list: includes deactivated add-ons. */
  async listAll(): Promise<Addon[]> {
    const rows = await this.prisma.addon.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    return rows.map(serializeAddon);
  }

  async create(input: AddonInput): Promise<Addon> {
    const existing = await this.prisma.addon.findUnique({ where: { slug: input.slug } });
    if (existing) throw new BadRequestException(`An add-on with the slug "${input.slug}" already exists`);
    return serializeAddon(await this.prisma.addon.create({ data: input }));
  }

  async update(id: string, input: UpdateAddonInput): Promise<Addon> {
    if (input.slug) {
      const clash = await this.prisma.addon.findUnique({ where: { slug: input.slug } });
      if (clash && clash.id !== id) {
        throw new BadRequestException(`An add-on with the slug "${input.slug}" already exists`);
      }
    }
    try {
      return serializeAddon(await this.prisma.addon.update({ where: { id }, data: input }));
    } catch {
      throw new NotFoundException('Add-on not found');
    }
  }

  /**
   * Bookings keep their own snapshot of what they bought, and the foreign key
   * is SetNull, so deleting an add-on leaves past bookings intact. Deactivating
   * is still the better move — it keeps the link for reporting.
   */
  async remove(id: string) {
    try {
      await this.prisma.addon.delete({ where: { id } });
      return { ok: true as const };
    } catch {
      throw new NotFoundException('Add-on not found');
    }
  }
}
