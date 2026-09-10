import { formatWhatsappNumber, normalizeWhatsappNumber } from '@poozari/shared';

/**
 * The business WhatsApp number.
 *
 * Set `NEXT_PUBLIC_WHATSAPP_NUMBER` to change it. The fallback is the live
 * number so the buttons work in a fresh checkout without extra configuration.
 * Changing it needs a rebuild — it is baked into the client bundle.
 */
export const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.trim() || '+919041399200';

/** Digits only, for `wa.me` paths. */
export const WHATSAPP_DIGITS = normalizeWhatsappNumber(WHATSAPP_NUMBER);

/** Human-readable, for display next to the buttons. */
export const WHATSAPP_DISPLAY = formatWhatsappNumber(WHATSAPP_NUMBER);

/** Absolute URL of the current page, for the pre-filled message. */
export function currentPageUrl(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  return `${window.location.origin}${window.location.pathname}`;
}
