import { PageHeader } from '@/components/page-header';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { PujariApplication } from './pujari-application';

type Props = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'becomePujari' });
  return { title: `${t('title')} — poozari.com`, description: t('lead') };
}

export default async function BecomePujariPage({ params: { locale } }: Props) {
  setRequestLocale(locale);
  const t = await getTranslations('becomePujari');

  return (
    <div>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />
      <PujariApplication />
    </div>
  );
}
