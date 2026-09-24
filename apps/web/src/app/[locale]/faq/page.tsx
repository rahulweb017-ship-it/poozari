import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

type Props = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'faq' });
  return { title: `${t('titleLead')} ${t('titleAccent')} — poozari.com`, description: t('subtitle') };
}

interface Faq {
  q: string;
  a: string;
}

export default async function FaqPage({ params: { locale } }: Props) {
  setRequestLocale(locale);
  const t = await getTranslations('faq');
  const faqs = t.raw('items') as Faq[];

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
              {t('subtitle')}
            </p>
          </div>
        </div>
      </section>

      <section className="section--compact">
        <div className="mx-auto max-w-3xl px-4">
          <div className="space-y-4">
            {faqs.map((f) => (
              <details key={f.q} className="card group overflow-hidden bg-white">
                <summary className="flex cursor-pointer items-center justify-between p-5 font-display text-sm font-bold text-foreground transition-colors duration-300 hover:text-accent">
                  <span className="pr-4">{f.q}</span>
                  <span className="shrink-0 text-lg transition-transform duration-300 group-open:rotate-45"
                        style={{ color: 'hsl(var(--muted-foreground))' }}>
                    +
                  </span>
                </summary>
                <div className="border-t px-5 pb-5 pt-3" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    {f.a}
                  </p>
                </div>
              </details>
            ))}
          </div>

          {/* Support CTA card */}
          <div className="mt-12 card p-8 text-center bg-white">
            <div className="text-3xl">🙏</div>
            <h3 className="font-display text-lg font-bold mt-4" style={{ color: 'hsl(var(--foreground))' }}>
              {t('ctaTitle')}
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              {t('ctaBody')}
            </p>
            <p className="mt-4 text-2xs font-extrabold uppercase tracking-widest text-accent">
              <span className="mr-1.5 text-emerald-500">●</span>
              {t('ctaStatus')}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
