import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { HomeSlide, HomeSlideInput, UpdateHomeSlideInput } from '@poozari/shared';
import type { HomeSlide as HomeSlideRow, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const ORDER = [{ sortOrder: 'asc' }, { createdAt: 'asc' }] as const;

function serialize(row: HomeSlideRow): HomeSlide {
  return {
    id: row.id,
    imageUrl: row.imageUrl,
    mobileImageUrl: row.mobileImageUrl,
    linkUrl: row.linkUrl,
    pill: row.pill,
    title: row.title,
    subtitle: row.subtitle,
    cta: row.cta,
    translations: (row.translations ?? {}) as HomeSlide['translations'],
    isActive: row.isActive,
    sortOrder: row.sortOrder,
  };
}

/** Blank optional URLs are stored as null/empty rather than as invalid paths. */
function toData(input: UpdateHomeSlideInput) {
  const { mobileImageUrl, translations, ...rest } = input;
  return {
    ...rest,
    ...(mobileImageUrl !== undefined ? { mobileImageUrl: mobileImageUrl || null } : {}),
    ...(translations !== undefined ? { translations: translations as Prisma.InputJsonValue } : {}),
  };
}

@Injectable()
export class HomeSlidesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public: what the home page shows. */
  async listActive(): Promise<HomeSlide[]> {
    const rows = await this.prisma.homeSlide.findMany({
      where: { isActive: true },
      orderBy: [...ORDER],
    });
    return rows.map(serialize);
  }

  async listAll(): Promise<HomeSlide[]> {
    const rows = await this.prisma.homeSlide.findMany({ orderBy: [...ORDER] });
    return rows.map(serialize);
  }

  /** New slides go to the end unless a position is given. */
  async create(input: HomeSlideInput): Promise<HomeSlide> {
    let sortOrder = input.sortOrder;
    if (!sortOrder) {
      const last = await this.prisma.homeSlide.aggregate({ _max: { sortOrder: true } });
      sortOrder = (last._max.sortOrder ?? 0) + 1;
    }
    const row = await this.prisma.homeSlide.create({
      data: { ...toData(input), imageUrl: input.imageUrl, title: input.title, sortOrder },
    });
    return serialize(row);
  }

  async update(id: string, input: UpdateHomeSlideInput): Promise<HomeSlide> {
    try {
      return serialize(await this.prisma.homeSlide.update({ where: { id }, data: toData(input) }));
    } catch {
      throw new NotFoundException('Slide not found');
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.homeSlide.delete({ where: { id } });
      return { ok: true as const };
    } catch {
      throw new NotFoundException('Slide not found');
    }
  }

  /** `ids` is the full list, first to last. */
  async reorder(ids: string[]): Promise<HomeSlide[]> {
    const existing = await this.prisma.homeSlide.findMany({ select: { id: true } });
    const known = new Set(existing.map((s) => s.id));
    if (ids.length !== known.size || new Set(ids).size !== ids.length || ids.some((id) => !known.has(id))) {
      throw new BadRequestException('The slide list changed. Reload the page and try again.');
    }
    await this.prisma.$transaction(
      ids.map((id, index) =>
        this.prisma.homeSlide.update({ where: { id }, data: { sortOrder: index + 1 } }),
      ),
    );
    return this.listAll();
  }
}
