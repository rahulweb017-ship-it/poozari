import { defineRouting } from 'next-intl/routing';

/** Languages the site is published in. `en` is the source of truth for copy. */
export const locales = ['en', 'hi', 'fr', 'es'] as const;
export type Locale = (typeof locales)[number];

/** Shown in the language switcher — native names, as a reader would look for them. */
export const LOCALE_LABELS: Record<Locale, { name: string; short: string }> = {
  en: { name: 'English', short: 'EN' },
  hi: { name: 'हिन्दी', short: 'हिं' },
  fr: { name: 'Français', short: 'FR' },
  es: { name: 'Español', short: 'ES' },
};

export const routing = defineRouting({
  locales,
  defaultLocale: 'en',
  /*
   * English keeps the bare URL (/puja/rudra-abhishek); the others are prefixed
   * (/hi/puja/rudra-abhishek). Existing links and search rankings are therefore
   * untouched, and each translation still has its own indexable URL.
   */
  localePrefix: 'as-needed',
  /*
   * First visit follows the browser's Accept-Language, then the choice is
   * remembered in a cookie. Set to false to always open in English.
   */
  localeDetection: true,
});
