import { PujaCard } from '@/components/puja-card';
import { getPujas } from '@/lib/server-api';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export const revalidate = 60;

type Props = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'digital' });
  return { title: `${t('titleLead')} ${t('titleAccent')} — poozari.com`, description: t('subtitle') };
}

const STEPS = ['sankalp', 'perform', 'deliver'] as const;
const STEP_ICONS = { sankalp: '📜', perform: '🔥', deliver: '🎥' } as const;

export default async function DigitalPujaPage({ params: { locale } }: Props) {
  setRequestLocale(locale);
  const t = await getTranslations('digital');
  const pujas = await getPujas({ locationType: 'DIGITAL' }).catch(() => []);

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
            <p className="section-subheading mx-auto">{t('subtitle')}</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section--compact">
        <div className="app-container">
          <h2 className="text-center font-display text-lg font-extrabold uppercase tracking-wider text-foreground">
            {t('howTitle')}
          </h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step} className="card p-6 text-center">
                <div className="text-3xl" aria-hidden="true">{STEP_ICONS[step]}</div>
                <div className="mt-3 text-3xs font-extrabold uppercase tracking-widest text-accent">
                  {t('stepLabel', { n: i + 1 })}
                </div>
                <h3 className="mt-1 font-display text-sm font-extrabold uppercase tracking-wide text-foreground">
                  {t(`steps.${step}.title`)}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t(`steps.${step}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

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
              <div className="text-4xl">📿</div>
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
