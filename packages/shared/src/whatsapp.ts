/**
 * WhatsApp booking links.
 *
 * Devotees — particularly older ones and those booking from abroad — often
 * prefer to arrange a puja by chatting rather than filling in a checkout form.
 * These helpers build `wa.me` deep links whose pre-filled message already
 * carries the ritual, package and price, so the conversation starts with the
 * context instead of "which puja did you mean?".
 */

/** Strip everything a `wa.me` path cannot contain: it wants bare digits. */
export function normalizeWhatsappNumber(input: string): string {
  return input.replace(/\D/g, '');
}

/** Pretty form for display, e.g. "+91 90413 99200". */
export function formatWhatsappNumber(input: string): string {
  const digits = normalizeWhatsappNumber(input);
  if (digits.length === 12 && digits.startsWith('91')) {
    const local = digits.slice(2);
    return `+91 ${local.slice(0, 5)} ${local.slice(5)}`;
  }
  return `+${digits}`;
}

/**
 * Build a click-to-chat URL.
 *
 * `wa.me` is WhatsApp's own short domain and works on desktop, Android and
 * iOS without us detecting the platform.
 */
export function buildWhatsappUrl(phone: string, message: string): string {
  const digits = normalizeWhatsappNumber(phone);
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** What the customer was looking at when they reached for WhatsApp. */
export type WhatsappContext =
  | { kind: 'general'; url?: string }
  | { kind: 'puja'; title: string; packageName?: string; price?: string; url?: string }
  | { kind: 'product'; title: string; price?: string; url?: string }
  | { kind: 'live'; title: string; price?: string; url?: string };

/**
 * The message templates, keyed by context then by locale.
 *
 * Kept here rather than in the web app's message catalogues because the API
 * also needs them when it records the lead, and because `*bold*` is WhatsApp's
 * own markup rather than site copy.
 */
type Template = (parts: {
  title?: string;
  packageName?: string;
  price?: string;
  url?: string;
}) => string;

const TEMPLATES: Record<string, Record<WhatsappContext['kind'], Template>> = {
  en: {
    general: ({ url }) =>
      `Namaste 🙏\nI have a question about booking a puja.${url ? `\n${url}` : ''}`,
    puja: ({ title, packageName, price, url }) =>
      `Namaste 🙏\nI would like to book this puja:\n\n*${title}*` +
      (packageName ? `\nPackage: ${packageName}` : '') +
      (price ? `\nPrice: ${price}` : '') +
      (url ? `\n${url}` : ''),
    product: ({ title, price, url }) =>
      `Namaste 🙏\nI would like to order:\n\n*${title}*` +
      (price ? `\nPrice: ${price}` : '') +
      (url ? `\n${url}` : ''),
    live: ({ title, price, url }) =>
      `Namaste 🙏\nI would like to join this live darshan:\n\n*${title}*` +
      (price ? `\nJoin fee: ${price}` : '') +
      (url ? `\n${url}` : ''),
  },
  hi: {
    general: ({ url }) =>
      `नमस्ते 🙏\nमुझे पूजा बुक करने के बारे में जानकारी चाहिए।${url ? `\n${url}` : ''}`,
    puja: ({ title, packageName, price, url }) =>
      `नमस्ते 🙏\nमैं यह पूजा बुक करना चाहता/चाहती हूँ:\n\n*${title}*` +
      (packageName ? `\nपैकेज: ${packageName}` : '') +
      (price ? `\nमूल्य: ${price}` : '') +
      (url ? `\n${url}` : ''),
    product: ({ title, price, url }) =>
      `नमस्ते 🙏\nमैं यह वस्तु मंगवाना चाहता/चाहती हूँ:\n\n*${title}*` +
      (price ? `\nमूल्य: ${price}` : '') +
      (url ? `\n${url}` : ''),
    live: ({ title, price, url }) =>
      `नमस्ते 🙏\nमैं इस लाइव दर्शन में सम्मिलित होना चाहता/चाहती हूँ:\n\n*${title}*` +
      (price ? `\nशुल्क: ${price}` : '') +
      (url ? `\n${url}` : ''),
  },
  fr: {
    general: ({ url }) =>
      `Namaste 🙏\nJ'ai une question sur la réservation d'une puja.${url ? `\n${url}` : ''}`,
    puja: ({ title, packageName, price, url }) =>
      `Namaste 🙏\nJe souhaite réserver cette puja :\n\n*${title}*` +
      (packageName ? `\nFormule : ${packageName}` : '') +
      (price ? `\nPrix : ${price}` : '') +
      (url ? `\n${url}` : ''),
    product: ({ title, price, url }) =>
      `Namaste 🙏\nJe souhaite commander :\n\n*${title}*` +
      (price ? `\nPrix : ${price}` : '') +
      (url ? `\n${url}` : ''),
    live: ({ title, price, url }) =>
      `Namaste 🙏\nJe souhaite rejoindre ce darshan en direct :\n\n*${title}*` +
      (price ? `\nFrais : ${price}` : '') +
      (url ? `\n${url}` : ''),
  },
  es: {
    general: ({ url }) =>
      `Namaste 🙏\nTengo una consulta sobre reservar una puja.${url ? `\n${url}` : ''}`,
    puja: ({ title, packageName, price, url }) =>
      `Namaste 🙏\nQuiero reservar esta puja:\n\n*${title}*` +
      (packageName ? `\nPaquete: ${packageName}` : '') +
      (price ? `\nPrecio: ${price}` : '') +
      (url ? `\n${url}` : ''),
    product: ({ title, price, url }) =>
      `Namaste 🙏\nQuiero pedir:\n\n*${title}*` +
      (price ? `\nPrecio: ${price}` : '') +
      (url ? `\n${url}` : ''),
    live: ({ title, price, url }) =>
      `Namaste 🙏\nQuiero unirme a este darshan en directo:\n\n*${title}*` +
      (price ? `\nCuota: ${price}` : '') +
      (url ? `\n${url}` : ''),
  },
};

/** Compose the pre-filled message for a context, in the reader's language. */
export function buildWhatsappMessage(context: WhatsappContext, locale = 'en'): string {
  const byKind = TEMPLATES[locale] ?? TEMPLATES.en;
  const template = byKind[context.kind] ?? byKind.general;
  return template({
    title: 'title' in context ? context.title : undefined,
    packageName: 'packageName' in context ? context.packageName : undefined,
    price: 'price' in context ? context.price : undefined,
    url: context.url,
  });
}

/** Everything needed for one click-to-chat link. */
export function whatsappLink(
  phone: string,
  context: WhatsappContext,
  locale = 'en',
): string {
  return buildWhatsappUrl(phone, buildWhatsappMessage(context, locale));
}
