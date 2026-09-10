import { PageHeader } from '@/components/page-header';
import { Link } from '@/i18n/navigation';
import { getCities, getPujas } from '@/lib/server-api';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export const revalidate = 300;

type Props = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'about' });
  return { title: `${t('title')} — poozari.com`, description: t('lead') };
}

interface Value {
  title: string;
  body: string;
}

export default async function AboutPage({ params: { locale } }: Props) {
  setRequestLocale(locale);
  const t = await getTranslations('about');

  // Real numbers from the catalogue, rather than invented milestones.
  const [pujas, cities] = await Promise.all([
    getPujas().catch(() => []),
    getCities().catch(() => []),
  ]);
  const values = t.raw('values') as Value[];

  return (
    <div>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />

      {/* Story */}
      <section className="section--compact">
        <div className="app-container max-w-3xl">
          <h2 className="font-display text-2xl font-extrabold tracking-tight">
            {t('storyHeading')}
          </h2>
          <div className="section-bar" aria-hidden="true" />
          <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{t('story')}</p>
        </div>
      </section>

      {/* Values */}
      <section
        className="section--compact border-t"
        style={{ borderColor: 'hsl(var(--border) / 0.3)' }}
      >
        <div className="app-container">
          <h2 className="font-display text-2xl font-extrabold tracking-tight">
            {t('valuesHeading')}
          </h2>
          <div className="section-bar" aria-hidden="true" />
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {values.map((value) => (
              <div key={value.title} className="card bg-white p-6">
                <h3 className="font-display text-base font-bold text-foreground">{value.title}</h3>
                <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{value.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reach */}
      <section
        className="section--compact border-t"
        style={{ borderColor: 'hsl(var(--border) / 0.3)' }}
      >
        <div className="app-container">
          <h2 className="font-display text-2xl font-extrabold tracking-tight">
            {t('statsHeading')}
          </h2>
          <div className="section-bar" aria-hidden="true" />
          {/* Counts come from the live catalogue. There is no public pandit
              count to read, so that figure is left out rather than invented. */}
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Stat value={cities.length} label={t('stats.cities')} />
            <Stat value={pujas.length} label={t('stats.pujas')} />
          </div>
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
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/puja" className="btn-primary text-2xs uppercase tracking-widest">
              {t('ctaBrowse')}
            </Link>
            <Link href="/contact" className="btn-outline text-2xs uppercase tracking-wider">
              {t('ctaContact')}
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="card bg-white p-6 text-center">
      <div className="font-display text-4xl font-black text-accent">{value}</div>
      <div className="mt-2 text-2xs font-extrabold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
