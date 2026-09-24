import { EntityGrid } from '@/components/entity-grid';
import { getDeities } from '@/lib/server-api';
import { getTranslations } from 'next-intl/server';

export const revalidate = 60;

export default async function DeityPage() {
  const deities = await getDeities().catch(() => []);
  const t = await getTranslations('catalogue');
  return (
    <div>
      {/* Header Banner */}
      <section className="border-b bg-gradient-to-b from-accent-soft to-transparent" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
        <div className="app-container py-12 sm:py-16">
          <div className="flex flex-col items-center text-center">
            <span className="section-pill">{t('deity.pill')}</span>
            <h1 className="section-heading mt-3">
              {t('deity.titleLead')} <span className="text-accent">{t('deity.titleAccent')}</span>
            </h1>
            <div className="section-bar mx-auto" aria-hidden="true" />
            <p className="section-subheading mx-auto">
              {t('deity.lead')}
            </p>
          </div>
        </div>
      </section>
      <section className="section--compact">
        <div className="app-container">
          <EntityGrid items={deities} queryKey="deityId" emoji="🙏" />
        </div>
      </section>
    </div>
  );
}
