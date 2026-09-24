import { Link } from '@/i18n/navigation';
import { PujaCard } from '@/components/puja-card';
import { getCities, getPujas } from '@/lib/server-api';
import { getTranslations } from 'next-intl/server';

export const revalidate = 60;

export default async function TeerthPujaPage() {
  const [pujas, cities] = await Promise.all([
    getPujas({ locationType: 'TEERTH' }).catch(() => []),
    getCities().catch(() => []),
  ]);
  const t = await getTranslations('teerth');

  return (
    <div>
      {/* Header Banner */}
      <section className="border-b bg-gradient-to-b from-accent-soft to-transparent" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
        <div className="app-container py-12 sm:py-16">
          <div className="flex flex-col items-center text-center">
            <span className="section-pill">{t('pill')}</span>
            <h1 className="section-heading mt-3">
              {t('titleLead')} <span className="text-accent">{t('titleAccent')}</span>
            </h1>
            <div className="section-bar mx-auto" aria-hidden="true" />
            <p className="section-subheading mx-auto">
              {t('lead')}
            </p>
          </div>
        </div>
      </section>

      <section className="section--compact">
        <div className="app-container">
          {/* City filter chips */}
          {cities.length ? (
            <div className="mb-10 flex flex-wrap justify-center gap-2.5">
              {cities.map((c) => (
                <Link key={c.id} href={`/puja?cityId=${c.id}`} className="btn-outline text-2xs uppercase tracking-wider py-2">
                  🛕 {c.name}
                </Link>
              ))}
            </div>
          ) : null}

          {pujas.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pujas.map((p) => (
                <PujaCard key={p.id} puja={p} />
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <div className="text-4xl">🛕</div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t('empty')}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
