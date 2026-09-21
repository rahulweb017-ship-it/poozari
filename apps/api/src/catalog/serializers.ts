import type { Addon, City, NamedEntity, Product, Puja, PujaPackage, Temple } from '@poozari/shared';

export const pujaInclude = {
  packages: true,
  deities: true,
  festivals: true,
  benefits: true,
  temple: { include: { city: true } },
  city: true,
} as const;

function toNamed(e: {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string | null;
}): NamedEntity {
  return {
    id: e.id,
    name: e.name,
    slug: e.slug,
    description: e.description ?? '',
    imageUrl: e.imageUrl ?? null,
  };
}

export function serializeCity(c: any): City {
  return {
    ...toNamed(c),
    state: c.state ?? '',
    templeCount: c._count?.temples,
  };
}

export function serializeTemple(t: any): Temple {
  return {
    ...toNamed(t),
    cityId: t.cityId,
    state: t.state ?? '',
    city: t.city ? serializeCity(t.city) : undefined,
  };
}

function serializePackage(p: any): PujaPackage {
  return {
    id: p.id,
    name: p.name,
    description: p.description ?? '',
    nameHi: p.nameHi ?? '',
    descriptionHi: p.descriptionHi ?? '',
    priceInr: p.priceInr,
    inclusions: p.inclusions ?? [],
  };
}

export function serializePuja(p: any): Puja {
  const packages = (p.packages ?? []).map(serializePackage);
  const startingPriceInr = packages.length
    ? Math.min(...packages.map((pk: PujaPackage) => pk.priceInr))
    : 0;
  return {
    id: p.id,
    title: p.title,
    slug: p.slug,
    summary: p.summary ?? '',
    description: p.description ?? '',
    titleHi: p.titleHi ?? '',
    summaryHi: p.summaryHi ?? '',
    descriptionHi: p.descriptionHi ?? '',
    imageUrl: p.imageUrl ?? null,
    locationType: p.locationType,
    isActive: p.isActive,
    temple: p.temple ? serializeTemple(p.temple) : null,
    city: p.city ? serializeCity(p.city) : null,
    deities: (p.deities ?? []).map(toNamed),
    festivals: (p.festivals ?? []).map(toNamed),
    benefits: (p.benefits ?? []).map(toNamed),
    packages,
    startingPriceInr,
  };
}

export function serializeAddon(a: any): Addon {
  return {
    id: a.id,
    name: a.name,
    nameHi: a.nameHi ?? '',
    slug: a.slug,
    description: a.description ?? '',
    descriptionHi: a.descriptionHi ?? '',
    priceInr: a.priceInr,
    imageUrl: a.imageUrl ?? null,
    isActive: a.isActive,
    sortOrder: a.sortOrder ?? 0,
  };
}

export function serializeProduct(product: any): Product {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: product.category,
    description: product.description ?? '',
    imageUrl: product.imageUrl ?? null,
    priceInr: product.priceInr,
    stockQuantity: product.stockQuantity,
    isActive: product.isActive,
    createdAt: product.createdAt?.toISOString?.() ?? String(product.createdAt),
  };
}

export { toNamed };
