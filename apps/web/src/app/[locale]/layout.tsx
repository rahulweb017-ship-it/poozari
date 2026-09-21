import { Footer } from '@/components/footer';
import { Navbar } from '@/components/navbar';
import { WhatsappFab } from '@/components/whatsapp';
import { routing } from '@/i18n/routing';
import { AuthProvider } from '@/lib/auth';
import { CurrencyProvider } from '@/lib/currency';
import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { Cormorant_Garamond, Noto_Sans_Devanagari, Plus_Jakarta_Sans } from 'next/font/google';
import { notFound } from 'next/navigation';
import '../globals.css';

const displayFont = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-display',
});

const sansFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
  variable: '--font-sans',
});

// Plus Jakarta Sans has no Devanagari glyphs, so Hindi would otherwise fall
// back to whatever the device happens to have. This keeps हिन्दी on-brand.
const devanagariFont = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-devanagari',
});

type LocaleParams = { locale: string };

/** Pre-render one shell per language. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params: { locale },
}: {
  params: LocaleParams;
}): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    title: t('title'),
    description: t('description'),
  };
}

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: LocaleParams;
}) {
  if (!hasLocale(routing.locales, locale)) notFound();
  // Lets pages below render statically instead of per-request.
  setRequestLocale(locale);
  const messages = await getMessages();

  /*
   * Only the namespaces client components actually read are handed to the
   * browser. Server components keep using `getTranslations`, which reads the
   * full catalogue — so the long policy text (over half of every catalogue)
   * never ships in the page payload.
   *
   * Add a namespace here when a *client* component starts translating with it,
   * or `useTranslations` will not find its keys.
   */
  const clientNamespaces = [
    'nav',
    'common',
    'currencyNote',
    'whatsapp',
    'contact',
    'enquiry',
    'becomePujari',
    'booking',
  ] as const;
  const clientMessages = Object.fromEntries(
    clientNamespaces.filter((key) => key in messages).map((key) => [key, messages[key]]),
  );

  return (
    <html
      lang={locale}
      className={`${displayFont.variable} ${sansFont.variable} ${devanagariFont.variable}`}
    >
      <head>
        <meta name="theme-color" content="#faf6f0" />
      </head>
      <body className="min-h-screen bg-transparent antialiased">
        <NextIntlClientProvider locale={locale} messages={clientMessages}>
          <AuthProvider>
            <CurrencyProvider>
              <Navbar />
              <main id="main-content" className="min-h-[70vh]">
                {children}
              </main>
              <Footer />
              {/* Persistent chat button, public pages only. */}
              <WhatsappFab />
            </CurrencyProvider>
          </AuthProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
