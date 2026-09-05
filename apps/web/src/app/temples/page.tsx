import { getTemples } from '@/lib/server-api';
import Link from 'next/link';

export const revalidate = 60;

export default async function TemplesPage() {
  const temples = await getTemples().catch(() => []);
  return (
    <div>
      {/* Header Banner */}
      <section className="border-b bg-gradient-to-b from-accent-soft to-transparent" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
        <div className="app-container py-12 sm:py-16">
          <div className="flex flex-col items-center text-center">
            <span className="section-pill">Sacred Places</span>
            <h1 className="section-heading mt-3">
              Famous <span className="text-accent">Temples</span>
            </h1>
            <div className="section-bar mx-auto" aria-hidden="true" />
            <p className="section-subheading mx-auto">
              Explore famous temples and coordinate authentic puja rites.
            </p>
          </div>
        </div>
      </section>

      <section className="section--compact">
        <div className="app-container">
          {temples.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {temples.map((t) => (
                <Link
                  key={t.id}
                  href={`/puja?templeId=${t.id}`}
                  className="group elevated-card gold-glow bg-white"
                >
                  <div className="relative overflow-hidden bg-gradient-to-br from-accent-soft to-saffron-100"
                       style={{ aspectRatio: '16/10' }}>
                    {t.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={t.imageUrl}
                        alt={t.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-5xl">🛕</div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-6">
                      <div className="text-3xs font-extrabold uppercase tracking-widest text-saffron-400">
                        {t.state || t.city?.name || ''}
                      </div>
                      <h3 className="mt-1 font-display text-lg font-bold text-white transition-colors duration-300 group-hover:text-saffron-300">
                        {t.name}
                      </h3>
                      <div className="mt-1 text-xs text-white/70">{t.city?.name}</div>
                    </div>
                  </div>
                  <div className="p-4 text-center border-t border-gray-50">
                    <span className="text-xs font-bold uppercase tracking-wider text-accent">
                      View pujas <span className="arrow-slide inline-block ml-1">→</span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <div className="text-4xl">🛕</div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">No temples yet.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
