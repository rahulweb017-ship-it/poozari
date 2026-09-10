import type {
  BlogPost,
  City,
  LiveSession,
  NamedEntity,
  Product,
  Puja,
  Temple,
} from '@poozari/shared';

const API_URL = process.env.API_URL ?? 'http://localhost:4000/api';

/** Server-side fetch for public catalog data (used by server components). */
async function get<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { next: { revalidate } });
  if (!res.ok) {
    throw new Error(`API ${path} failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getPujas(params?: Record<string, string | undefined>): Promise<Puja[]> {
  const qs = params
    ? '?' +
      new URLSearchParams(
        Object.entries(params).filter(([, v]) => v) as [string, string][],
      ).toString()
    : '';
  return get<Puja[]>(`/pujas${qs}`);
}

export function getPuja(slug: string): Promise<Puja> {
  return get<Puja>(`/pujas/${slug}`);
}

export function getCities(): Promise<City[]> {
  return get<City[]>('/cities');
}

export function getTemples(): Promise<Temple[]> {
  return get<Temple[]>('/temples');
}

export function getDeities(): Promise<NamedEntity[]> {
  return get<NamedEntity[]>('/deities');
}

export function getFestivals(): Promise<NamedEntity[]> {
  return get<NamedEntity[]>('/festivals');
}

export function getBenefits(): Promise<NamedEntity[]> {
  return get<NamedEntity[]>('/benefits');
}

export function getProducts(params?: Record<string, string | undefined>): Promise<Product[]> {
  const qs = params
    ? `?${new URLSearchParams(
        Object.entries(params).filter(([, value]) => value) as [string, string][],
      ).toString()}`
    : '';
  return get<Product[]>(`/products${qs}`, 0);
}

export function getProduct(slug: string): Promise<Product> {
  return get<Product>(`/products/${slug}`, 0);
}

/** Public live-darshan sessions. Use revalidate 0-ish so "live now" stays fresh. */
export function getLiveSessions(status?: 'live' | 'upcoming' | 'ended'): Promise<LiveSession[]> {
  return get<LiveSession[]>(`/live${status ? `?status=${status}` : ''}`, 15);
}

export function getLiveSession(id: string): Promise<LiveSession> {
  return get<LiveSession>(`/live/${id}`, 15);
}

/* ------------------------------- Blog ------------------------------- */

export function getBlogPosts(category?: string): Promise<BlogPost[]> {
  return get<BlogPost[]>(
    `/blog${category ? `?category=${encodeURIComponent(category)}` : ''}`,
    30,
  );
}

export function getBlogCategories(): Promise<string[]> {
  return get<string[]>('/blog/categories', 30);
}

export function getBlogPost(slug: string): Promise<BlogPost> {
  return get<BlogPost>(`/blog/${slug}`, 30);
}
