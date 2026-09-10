import { PageHeader } from '@/components/page-header';
import { getTranslations } from 'next-intl/server';

/** The four policy pages share this shape; only the namespace differs. */
export type LegalKey = 'privacy' | 'terms' | 'refund' | 'shipping';

interface Section {
  heading: string;
  body: string;
}

/**
 * The date the policy copy was last revised. Bumping this by hand — rather
 * than printing today's date — keeps the page honest about when the terms
 * actually changed.
 */
export const POLICY_REVISED = '2026-09-01';

export async function LegalPage({ page }: { page: LegalKey }) {
  const t = await getTranslations(`legal.${page}`);
  const shared = await getTranslations('legal');
  const sections = t.raw('sections') as Section[] | undefined;
  const revised = new Date(POLICY_REVISED);

  return (
    <div>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />

      <section className="section--compact">
        <div className="app-container max-w-3xl">
          <div
            className="rounded-2xl border bg-white/60 p-4 text-xs leading-relaxed text-muted-foreground"
            style={{ borderColor: 'hsl(var(--border) / 0.6)' }}
          >
            <p className="font-bold uppercase tracking-wider text-foreground">
              {shared('lastUpdated', {
                date: revised.toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                }),
              })}
            </p>
            <p className="mt-1.5">{shared('reviewNotice')}</p>
          </div>

          {sections?.length ? (
            <ol className="mt-10 space-y-9">
              {sections.map((section, index) => (
                <li key={section.heading}>
                  <h2 className="font-display text-lg font-bold text-foreground">
                    <span className="mr-2 text-accent">{index + 1}.</span>
                    {section.heading}
                  </h2>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    {section.body}
                  </p>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      </section>
    </div>
  );
}
