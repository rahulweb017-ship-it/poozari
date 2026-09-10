import { Link } from '@/i18n/navigation';
import { PackagePicker } from '@/components/package-picker';
import { getPuja } from '@/lib/server-api';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

export const revalidate = 60;

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  try {
    const puja = await getPuja(params.slug);
    return { title: `${puja.title} — poozari.com`, description: puja.summary };
  } catch {
    return { title: 'Puja — poozari.com' };
  }
}

export default async function PujaDetailPage({ params }: { params: { slug: string } }) {
  let puja;
  try {
    puja = await getPuja(params.slug);
  } catch {
    notFound();
  }

  return (
    <div>
      {/* Breadcrumb nav */}
      <div className="border-b" style={{ borderColor: 'hsl(var(--border) / 0.3)', background: 'hsl(var(--card))' }}>
        <div className="app-container py-3.5">
          <nav className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>
            <Link href="/" className="hover:text-accent transition-colors">Home</Link>
            <span>/</span>
            <Link href="/puja" className="hover:text-accent transition-colors">Puja</Link>
            <span>/</span>
            <span className="font-extrabold" style={{ color: 'hsl(var(--foreground))' }}>{puja.title}</span>
          </nav>
        </div>
      </div>

      <div className="app-container grid gap-8 py-10 lg:grid-cols-3 lg:gap-12">
        {/* Left Column: Media & details */}
        <div className="lg:col-span-2">
          {/* Main media container */}
          <div className="overflow-hidden rounded-3xl border-2 shadow-md bg-gradient-to-br from-accent-soft to-saffron-100"
               style={{ aspectRatio: '16/9', borderColor: 'hsl(var(--border) / 0.5)' }}>
            {puja.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={puja.imageUrl} alt={puja.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-7xl">🪔</div>
            )}
          </div>

          <h1 className="mt-8 font-display text-3xl font-extrabold tracking-wide" style={{ color: 'hsl(var(--foreground))' }}>
            {puja.title}
          </h1>
          {puja.temple ? (
            <p className="mt-2 text-xs font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>
              📍 {puja.temple.name}
              {puja.city ? `, ${puja.city.name}` : ''}
            </p>
          ) : null}

          {/* Verification labels */}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="trust-badge">
              <span className="trust-badge__icon">✓</span>
              Verified Pujari
            </span>
            <span className="trust-badge">
              <span className="trust-badge__icon">📦</span>
              Samagri Included
            </span>
            <span className="trust-badge">
              <span className="trust-badge__icon">🎥</span>
              Recorded Video Proof
            </span>
          </div>

          {/* Description content */}
          <p className="mt-8 whitespace-pre-line text-sm leading-relaxed"
             style={{ color: 'hsl(var(--foreground) / 0.8)' }}>
            {puja.description}
          </p>

          {/* Linked entities: deities */}
          {puja.deities.length ? (
            <div className="mt-8 border-t pt-6" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
              <h3 className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">Deities</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {puja.deities.map((d) => (
                  <span key={d.id} className="badge bg-accent-soft text-accent border" style={{ borderColor: 'hsl(var(--accent) / 0.15)' }}>
                    {d.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Linked entities: benefits */}
          {puja.benefits.length ? (
            <div className="mt-6">
              <h3 className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">Benefits</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {puja.benefits.map((b) => (
                  <span key={b.id} className="badge bg-emerald-50 text-emerald-700 border border-emerald-100">
                    {b.name}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {/* Features container */}
          <div className="mt-8 card p-6" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
            <h3 className="font-display text-base font-bold text-foreground">Coordinated features list</h3>
            <ul className="mt-5 grid gap-4 text-xs font-semibold sm:grid-cols-2" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {[
                'Verified pandit trained in scriptural procedures',
                'Organic, premium samagri elements organized beforehand',
                'Rigorous rituals scheduled on correct shastric muhurats',
                'Recorded video updates and prasad delivery included',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <span className="mt-0.5 text-accent font-bold">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Sticky package picker */}
        <aside className="lg:col-span-1">
          <div className="sticky top-20">
            <PackagePicker slug={puja.slug} packages={puja.packages} pujaTitle={puja.title} />
          </div>
        </aside>
      </div>
    </div>
  );
}
