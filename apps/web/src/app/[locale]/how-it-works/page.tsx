import { PageHeader } from '@/components/page-header';
import { Link } from '@/i18n/navigation';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

type Props = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'howItWorks' });
  return { title: `${t('title')} — poozari.com`, description: t('lead') };
}

interface Step {
  title: string;
  body: string;
}

export default async function HowItWorksPage({ params: { locale } }: Props) {
  setRequestLocale(locale);
  const t = await getTranslations('howItWorks');
  const steps = t.raw('steps') as Step[];

  return (
    <div>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />

      {/* Steps */}
      <section className="section--compact">
        <div className="app-container max-w-4xl">
          <ol className="relative space-y-6">
            {steps.map((step, index) => (
              <li key={step.title} className="card flex gap-5 bg-white p-6">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-black text-white shadow-sm"
                  aria-hidden="true"
                >
                  {index + 1}
                </div>
                <div className="min-w-0">
                  <h2 className="font-display text-base font-bold text-foreground">{step.title}</h2>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pointer to the FAQ rather than repeating it here */}
      <section
        className="section--compact border-t"
        style={{ borderColor: 'hsl(var(--border) / 0.3)' }}
      >
        <div className="app-container flex flex-col items-center gap-4 text-center">
          <h2 className="font-display text-xl font-extrabold tracking-tight">
            {t('faqHeading')}
          </h2>
          <Link href="/faq" className="btn-outline text-2xs uppercase tracking-wider">
            {t('faqCta')}
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section
        className="section--compact border-t bg-accent-soft"
        style={{ borderColor: 'hsl(var(--border) / 0.3)' }}
      >
        <div className="app-container flex flex-col items-center gap-5 text-center">
          <h2 className="font-display text-2xl font-extrabold tracking-tight">
            {t('ctaHeading')}
          </h2>
          <p className="max-w-xl text-sm text-muted-foreground">{t('ctaBody')}</p>
          <Link href="/puja" className="btn-primary text-2xs uppercase tracking-widest">
            {t('ctaBrowse')}
          </Link>
        </div>
      </section>
    </div>
  );
}
