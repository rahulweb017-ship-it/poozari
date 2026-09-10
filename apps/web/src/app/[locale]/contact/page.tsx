import { PageHeader } from '@/components/page-header';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { ContactForm } from './contact-form';

type Props = { params: { locale: string } };

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'contact' });
  return { title: `${t('title')} — poozari.com`, description: t('lead') };
}

export default async function ContactPage({ params: { locale } }: Props) {
  setRequestLocale(locale);
  const t = await getTranslations('contact');

  return (
    <div>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />
      <ContactForm />
    </div>
  );
}
