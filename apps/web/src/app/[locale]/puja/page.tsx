import { PujaCard } from '@/components/puja-card';
import { getPujas } from '@/lib/server-api';
import { getTranslations } from 'next-intl/server';

export const revalidate = 60;

export default async function PujaListingPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  const pujas = await getPujas({
    locationType: searchParams.locationType,
    cityId: searchParams.cityId,
    templeId: searchParams.templeId,
    deityId: searchParams.deityId,
    festivalId: searchParams.festivalId,
    benefitId: searchParams.benefitId,
    q: searchParams.q,
  }).catch(() => []);
  const atHome = searchParams.locationType === 'HOME';
  const t = await getTranslations('pujaList');

  return (
    <div>
      {/* Header Banner */}
      <section className="border-b bg-gradient-to-b from-accent-soft to-transparent" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
        <div className="app-container py-12 sm:py-16">
          <div className="flex flex-col items-center text-center">
            <span className="section-pill">{t('pill')}</span>
            {atHome ? (
              <h1 className="section-heading mt-3">
                {t('homeTitleLead')} <span className="text-accent">{t('homeTitleAccent')}</span>
              </h1>
            ) : (
              <h1 className="section-heading mt-3">
                {t('titleLead')} <span className="text-accent">{t('titleAccent')}</span>
              </h1>
            )}
            <div className="section-bar mx-auto" aria-hidden="true" />
            <p className="section-subheading mx-auto">
              {t('lead', { count: pujas.length })}
            </p>
          </div>
        </div>
      </section>

      {/* Main Grid */}
      <section className="section--compact">
        <div className="app-container">
          {pujas.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {pujas.map((p) => (
                <PujaCard key={p.id} puja={p} />
              ))}
            </div>
          ) : (
            <div className="card p-12 text-center">
              <div className="text-4xl">🕉️</div>
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
