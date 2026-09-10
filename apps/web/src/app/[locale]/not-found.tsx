import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';

/** Not-found inside a language, so the reader keeps their chrome and locale. */
export default async function LocaleNotFound() {
  const t = await getTranslations('common');

  return (
    <div className="app-container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="font-display text-6xl font-black text-accent">404</p>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight">{t('notFound')}</h1>
      <Link href="/" className="btn-primary mt-8 text-2xs uppercase tracking-widest">
        {t('backHome')}
      </Link>
    </div>
  );
}
