import { LegalPage } from '@/components/legal-page';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

type Props = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'legal.shipping' });
  return { title: `${t('title')} — poozari.com`, description: t('lead') };
}

export default async function Page({ params: { locale } }: Props) {
  setRequestLocale(locale);
  return <LegalPage page="shipping" />;
}
