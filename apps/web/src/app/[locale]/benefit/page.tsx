import { EntityGrid } from '@/components/entity-grid';
import { getBenefits } from '@/lib/server-api';
import { getTranslations } from 'next-intl/server';

export const revalidate = 60;

export default async function BenefitPage() {
  const benefits = await getBenefits().catch(() => []);
  const t = await getTranslations('catalogue');
  return (
    <div>
      {/* Header Banner */}
      <section className="border-b bg-gradient-to-b from-accent-soft to-transparent" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
        <div className="app-container py-12 sm:py-16">
          <div className="flex flex-col items-center text-center">
            <span className="section-pill">{t('benefit.pill')}</span>
            <h1 className="section-heading mt-3">
              {t('benefit.titleLead')} <span className="text-accent">{t('benefit.titleAccent')}</span>
            </h1>
            <div className="section-bar mx-auto" aria-hidden="true" />
            <p className="section-subheading mx-auto">
              {t('benefit.lead')}
            </p>
          </div>
        </div>
      </section>
      <section className="section--compact">
        <div className="app-container">
          <EntityGrid items={benefits} queryKey="benefitId" emoji="✨" />
        </div>
      </section>
    </div>
  );
}
