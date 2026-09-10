import { Link } from '@/i18n/navigation';
import { Price } from '@/lib/currency';
import { getProducts } from '@/lib/server-api';

// Product changes made by Super Admin should appear immediately.
export const revalidate = 0;

export default async function ProductsPage() {
  const products = await getProducts().catch(() => []);
  const categories = Array.from(new Set(products.map((product) => product.category)));

  return (
    <div>
      <section className="relative overflow-hidden border-b bg-white py-14 sm:py-20" style={{ borderColor: 'hsl(var(--border) / 0.4)' }}>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-accent-soft via-white to-primary/10" />
        <div className="app-container relative text-center">
          <span className="section-pill">Sacred Essentials</span>
          <h1 className="section-heading mt-4">
            Puja <span className="text-accent">Products</span>
          </h1>
          <div className="section-bar mx-auto" aria-hidden="true" />
          <p className="section-subheading mx-auto">
            Discover authentic rudraksha, havan samagri, puja kits, and devotional essentials selected for traditional worship.
          </p>
          {categories.length ? (
            <div className="mt-7 flex flex-wrap justify-center gap-2">
              {categories.map((category) => (
                <span key={category} className="rounded-full border bg-white px-4 py-2 text-2xs font-bold uppercase tracking-wider text-accent shadow-sm" style={{ borderColor: 'hsl(var(--accent) / 0.15)' }}>
                  {category}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section className="app-container py-12 sm:py-16">
        {products.length ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <article key={product.id} className="elevated-card gold-glow group flex h-full flex-col bg-white">
                <div className="relative overflow-hidden bg-gradient-to-br from-saffron-100 to-orange-200" style={{ aspectRatio: '4/3' }}>
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-6xl">🪔</div>
                  )}
                  <span className="absolute left-3 top-3 rounded-full bg-[#0b0f19]/90 px-3 py-1.5 text-3xs font-bold uppercase tracking-widest text-white">
                    {product.category}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-5">
                  <h2 className="font-display text-lg font-bold text-foreground transition-colors group-hover:text-accent">
                    {product.name}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
                    {product.description || 'Authentic devotional essential for your daily worship and sacred rituals.'}
                  </p>
                  <div className="mt-auto flex items-end justify-between gap-3 border-t pt-5" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
                    <div>
                      <div className="text-3xs font-bold uppercase tracking-widest text-muted-foreground">Price</div>
                      <div className="mt-0.5 text-lg font-black text-accent"><Price amountInr={product.priceInr} /></div>
                    </div>
                    <span className={`badge ${product.stockQuantity > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                      {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of stock'}
                    </span>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-2">
                    <Link
                      href={`/products/${product.slug}`}
                      className="btn-outline justify-center text-3xs uppercase tracking-wider"
                    >
                      View Details
                    </Link>
                    {product.stockQuantity > 0 ? (
                      <Link
                        href={`/checkout/product/${product.slug}?quantity=1`}
                        className="btn-primary justify-center text-3xs uppercase tracking-wider"
                      >
                        Buy Now
                      </Link>
                    ) : (
                      <button className="btn-primary text-3xs uppercase tracking-wider" disabled>
                        Sold Out
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="card mx-auto max-w-xl bg-white p-12 text-center">
            <div className="text-5xl">🪔</div>
            <h2 className="mt-4 font-display text-xl font-bold text-foreground">Products coming soon</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Our sacred essentials catalog is being prepared. Please check back shortly.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
