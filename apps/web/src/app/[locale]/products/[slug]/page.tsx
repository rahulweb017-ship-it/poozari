import { Link } from '@/i18n/navigation';
import { ProductBuyPanel } from '@/components/product-buy-panel';
import { getProduct } from '@/lib/server-api';
import { notFound } from 'next/navigation';

export const revalidate = 0;

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const product = await getProduct(params.slug).catch(() => null);
  if (!product) notFound();

  return (
    <div>
      <div className="border-b bg-white">
        <div className="app-container py-3.5">
          <nav className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wider text-muted-foreground">
            <Link href="/products" className="transition-colors hover:text-accent">
              Products
            </Link>
            <span>/</span>
            <span className="text-foreground">{product.name}</span>
          </nav>
        </div>
      </div>

      <main className="app-container py-10 sm:py-14">
        <div className="grid gap-9 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14">
          <div
            className="elevated-card overflow-hidden bg-gradient-to-br from-saffron-100 to-orange-200"
            style={{ aspectRatio: '1/1' }}
          >
            {product.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-8xl">🪔</div>
            )}
          </div>

          <div className="lg:py-3">
            <span className="section-pill">{product.category}</span>
            <h1 className="mt-5 font-display text-3xl font-black leading-tight text-foreground sm:text-4xl">
              {product.name}
            </h1>
            <div className="section-bar mt-5" aria-hidden="true" />
            <p className="mt-6 text-sm leading-7 text-muted-foreground">
              {product.description ||
                'An authentic devotional essential selected for traditional worship and sacred rituals.'}
            </p>

            <div className="mt-8">
              <ProductBuyPanel product={product} />
            </div>
          </div>
        </div>

        <section className="mt-12 grid gap-4 sm:grid-cols-3">
          {[
            ['Authentically sourced', 'Selected with care for traditional puja and devotional use.'],
            ['Secure checkout', 'Protected online payment powered by Razorpay.'],
            ['Delivery support', 'Your order is carefully packed and delivered to your address.'],
          ].map(([title, text]) => (
            <div key={title} className="card bg-white p-6">
              <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
