import { hasLocale } from 'next-intl';
import { getRequestConfig } from 'next-intl/server';
import { routing } from './routing';

type Messages = Record<string, unknown>;

/** Overlay `override` on `base`, key by key, all the way down. */
function deepMerge(base: Messages, override: Messages): Messages {
  const merged: Messages = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const existing = merged[key];
    const bothPlainObjects =
      existing && value && typeof existing === 'object' && typeof value === 'object' &&
      !Array.isArray(existing) && !Array.isArray(value);
    merged[key] = bothPlainObjects
      ? deepMerge(existing as Messages, value as Messages)
      : value;
  }
  return merged;
}

/**
 * Loads the catalogue for the resolved locale, layered over English.
 *
 * English is the source of truth for copy, so a key that has not been
 * translated yet renders its English text rather than a raw key or a crash.
 * That lets translations land page by page without the site ever looking
 * broken to a reader.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  const english = (await import('../../messages/en.json')).default as Messages;
  const messages =
    locale === routing.defaultLocale
      ? english
      : deepMerge(english, (await import(`../../messages/${locale}.json`)).default as Messages);

  return { locale, messages };
});
