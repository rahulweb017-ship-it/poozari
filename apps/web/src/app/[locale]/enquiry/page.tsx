import { PageHeader } from '@/components/page-header';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';
import { EnquiryForm } from './enquiry-form';

type Props = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'enquiry' });
  return { title: `${t('title')} — poozari.com`, description: t('lead') };
}

export default async function EnquiryPage({ params: { locale } }: Props) {
  setRequestLocale(locale);
  const t = await getTranslations('enquiry');
  const c = await getTranslations('common');

  return (
    <div>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />

      <section className="section--compact">
        <div className="app-container max-w-3xl">
          <Suspense
            fallback={
              <div className="card bg-white p-10 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {c('loading')}
                </p>
              </div>
            }
          >
            <EnquiryForm />
          </Suspense>
        </div>
      </section>
    </div>
  );
}
