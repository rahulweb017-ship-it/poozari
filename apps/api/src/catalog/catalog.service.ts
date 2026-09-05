import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type {
  CreateBenefitInput,
  CreateCityInput,
  CreateDeityInput,
  CreateFestivalInput,
  CreatePujaInput,
  CreateProductInput,
  CreateTempleInput,
  UpdateBenefitInput,
  UpdateCityInput,
  UpdateDeityInput,
  UpdateFestivalInput,
  UpdatePujaInput,
  UpdateProductInput,
  UpdateTempleInput,
} from '@poozari/shared';
import { PrismaService } from '../prisma/prisma.service';
import {
  pujaInclude,
  serializeCity,
  serializePuja,
  serializeProduct,
  serializeTemple,
  toNamed,
} from './serializers';

/** Translate a Prisma foreign-key violation into a friendly "in use" error. */
function guardInUse(e: any, label: string): never {
  if (e?.code === 'P2003' || e?.code === 'P2014') {
    throw new BadRequestException(
      `Cannot delete this ${label} because other records reference it. Remove those first.`,
    );
  }
  if (e?.code === 'P2025') throw new NotFoundException(`${label} not found`);
  throw e;
}

function guardProductWrite(error: any): never {
  if (error?.code === 'P2002') {
    throw new BadRequestException('A product with this slug already exists');
  }
  guardInUse(error, 'product');
}

export interface PujaFilter {
  locationType?: string;
  cityId?: string;
  templeId?: string;
  deityId?: string;
  festivalId?: string;
  benefitId?: string;
  q?: string;
  includeInactive?: boolean;
}

export interface ProductFilter {
  category?: string;
  q?: string;
  includeInactive?: boolean;
}

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /* ------------------------------ Pujas ------------------------------ */

  async listPujas(filter: PujaFilter = {}) {
    const where: any = {};
    if (!filter.includeInactive) where.isActive = true;
    if (filter.locationType) where.locationType = filter.locationType;
    if (filter.cityId) where.cityId = filter.cityId;
    if (filter.templeId) where.templeId = filter.templeId;
    if (filter.deityId) where.deities = { some: { id: filter.deityId } };
    if (filter.festivalId) where.festivals = { some: { id: filter.festivalId } };
    if (filter.benefitId) where.benefits = { some: { id: filter.benefitId } };
    if (filter.q) {
      where.OR = [
        { title: { contains: filter.q, mode: 'insensitive' } },
        { summary: { contains: filter.q, mode: 'insensitive' } },
      ];
    }
    const pujas = await this.prisma.puja.findMany({
      where,
      include: pujaInclude,
      orderBy: { createdAt: 'desc' },
    });
    return pujas.map(serializePuja);
  }

  async getPujaBySlug(slug: string) {
    const puja = await this.prisma.puja.findUnique({ where: { slug }, include: pujaInclude });
    if (!puja) throw new NotFoundException('Puja not found');
    return serializePuja(puja);
  }

  async getPujaById(id: string) {
    const puja = await this.prisma.puja.findUnique({ where: { id }, include: pujaInclude });
    if (!puja) throw new NotFoundException('Puja not found');
    return serializePuja(puja);
  }

  async createPuja(input: CreatePujaInput) {
    const { packages, deityIds, festivalIds, benefitIds, ...rest } = input;
    const puja = await this.prisma.puja.create({
      data: {
        ...rest,
        packages: { create: packages },
        deities: { connect: deityIds.map((id) => ({ id })) },
        festivals: { connect: festivalIds.map((id) => ({ id })) },
        benefits: { connect: benefitIds.map((id) => ({ id })) },
      },
      include: pujaInclude,
    });
    return serializePuja(puja);
  }

  async updatePuja(id: string, input: UpdatePujaInput) {
    const { packages, deityIds, festivalIds, benefitIds, ...rest } = input;
    await this.prisma.puja.update({
      where: { id },
      data: {
        ...rest,
        ...(deityIds ? { deities: { set: deityIds.map((d) => ({ id: d })) } } : {}),
        ...(festivalIds ? { festivals: { set: festivalIds.map((f) => ({ id: f })) } } : {}),
        ...(benefitIds ? { benefits: { set: benefitIds.map((b) => ({ id: b })) } } : {}),
      },
    });
    if (packages) {
      await this.prisma.package.deleteMany({ where: { pujaId: id } });
      await this.prisma.package.createMany({
        data: packages.map((p) => ({ ...p, pujaId: id })),
      });
    }
    return this.getPujaById(id);
  }

  async deletePuja(id: string) {
    try {
      await this.prisma.puja.delete({ where: { id } });
      return { ok: true };
    } catch (e) {
      guardInUse(e, 'puja (it likely has bookings — consider deactivating it instead)');
    }
  }

  /* ------------------------------ Products ------------------------------ */

  async listProducts(filter: ProductFilter = {}) {
    const where: any = {};
    if (!filter.includeInactive) where.isActive = true;
    if (filter.category) where.category = filter.category;
    if (filter.q) {
      where.OR = [
        { name: { contains: filter.q, mode: 'insensitive' } },
        { description: { contains: filter.q, mode: 'insensitive' } },
        { category: { contains: filter.q, mode: 'insensitive' } },
      ];
    }
    const products = await this.prisma.product.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    return products.map(serializeProduct);
  }

  async getProductBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: { slug, isActive: true },
    });
    if (!product) throw new NotFoundException('Product not found');
    return serializeProduct(product);
  }

  async createProduct(input: CreateProductInput) {
    try {
      return serializeProduct(await this.prisma.product.create({ data: input }));
    } catch (error) {
      guardProductWrite(error);
    }
  }

  async updateProduct(id: string, input: UpdateProductInput) {
    try {
      return serializeProduct(
        await this.prisma.product.update({ where: { id }, data: input }),
      );
    } catch (error) {
      guardProductWrite(error);
    }
  }

  async deleteProduct(id: string) {
    try {
      await this.prisma.product.delete({ where: { id } });
      return { ok: true };
    } catch (error) {
      guardInUse(error, 'product');
    }
  }

  /* ------------------------------ Cities ------------------------------ */

  async listCities() {
    const cities = await this.prisma.city.findMany({
      include: { _count: { select: { temples: true } } },
      orderBy: { name: 'asc' },
    });
    return cities.map(serializeCity);
  }

  async createCity(input: CreateCityInput) {
    const city = await this.prisma.city.create({ data: input });
    return serializeCity(city);
  }

  async updateCity(id: string, input: UpdateCityInput) {
    const city = await this.prisma.city.update({ where: { id }, data: input });
    return serializeCity(city);
  }

  async deleteCity(id: string) {
    try {
      await this.prisma.city.delete({ where: { id } });
      return { ok: true };
    } catch (e) {
      guardInUse(e, 'city (it likely has temples or pujas)');
    }
  }

  /* ------------------------------ Temples ------------------------------ */

  async listTemples() {
    const temples = await this.prisma.temple.findMany({
      include: { city: true },
      orderBy: { name: 'asc' },
    });
    return temples.map(serializeTemple);
  }

  async createTemple(input: CreateTempleInput) {
    const temple = await this.prisma.temple.create({ data: input, include: { city: true } });
    return serializeTemple(temple);
  }

  async updateTemple(id: string, input: UpdateTempleInput) {
    const temple = await this.prisma.temple.update({
      where: { id },
      data: input,
      include: { city: true },
    });
    return serializeTemple(temple);
  }

  async deleteTemple(id: string) {
    try {
      await this.prisma.temple.delete({ where: { id } });
      return { ok: true };
    } catch (e) {
      guardInUse(e, 'temple (it likely has pujas)');
    }
  }

  /* --------------------- Deities / Festivals / Benefits --------------------- */

  async listDeities() {
    return (await this.prisma.deity.findMany({ orderBy: { name: 'asc' } })).map(toNamed);
  }
  async createDeity(input: CreateDeityInput) {
    return toNamed(await this.prisma.deity.create({ data: input }));
  }
  async updateDeity(id: string, input: UpdateDeityInput) {
    return toNamed(await this.prisma.deity.update({ where: { id }, data: input }));
  }
  async deleteDeity(id: string) {
    try {
      await this.prisma.deity.delete({ where: { id } });
      return { ok: true };
    } catch (e) {
      guardInUse(e, 'deity');
    }
  }

  async listFestivals() {
    return (await this.prisma.festival.findMany({ orderBy: { name: 'asc' } })).map(toNamed);
  }
  async createFestival(input: CreateFestivalInput) {
    return toNamed(await this.prisma.festival.create({ data: input }));
  }
  async updateFestival(id: string, input: UpdateFestivalInput) {
    return toNamed(await this.prisma.festival.update({ where: { id }, data: input }));
  }
  async deleteFestival(id: string) {
    try {
      await this.prisma.festival.delete({ where: { id } });
      return { ok: true };
    } catch (e) {
      guardInUse(e, 'festival');
    }
  }

  async listBenefits() {
    return (await this.prisma.benefit.findMany({ orderBy: { name: 'asc' } })).map(toNamed);
  }
  async createBenefit(input: CreateBenefitInput) {
    return toNamed(await this.prisma.benefit.create({ data: input }));
  }
  async updateBenefit(id: string, input: UpdateBenefitInput) {
    return toNamed(await this.prisma.benefit.update({ where: { id }, data: input }));
  }
  async deleteBenefit(id: string) {
    try {
      await this.prisma.benefit.delete({ where: { id } });
      return { ok: true };
    } catch (e) {
      guardInUse(e, 'benefit');
    }
  }
}
