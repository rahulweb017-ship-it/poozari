import { BookingStatus } from './enums';

/** Format an INR integer amount, e.g. 6100 -> "₹6,100". */
export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Pick the reader's language for a catalogue field that is stored twice.
 *
 * Content rows carry `title` and `titleHi` side by side; the API serves both
 * and the page decides, which keeps every endpoint and cache key
 * locale-independent. A blank Hindi field is not a translation, so it falls
 * back to the English rather than rendering an empty heading.
 *
 * French and Spanish deliberately fall through to English — catalogue copy is
 * only translated into Hindi, matching how the policy pages already behave.
 *
 *   localized(puja, 'title', 'hi')  // "रुद्र अभिषेक", or the English if unset
 */
export function localized<T extends Record<string, any>>(
  row: T | null | undefined,
  field: string,
  locale: string,
): string {
  if (!row) return '';
  if (locale === 'hi') {
    const hi = row[`${field}Hi`];
    if (typeof hi === 'string' && hi.trim()) return hi;
  }
  const en = row[field];
  return typeof en === 'string' ? en : '';
}

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  [BookingStatus.PENDING_PAYMENT]: 'Awaiting payment',
  [BookingStatus.PAID]: 'Payment received',
  [BookingStatus.ASSIGNED]: 'Pandit assigned',
  [BookingStatus.ACCEPTED]: 'Pandit confirmed',
  [BookingStatus.SCHEDULED]: 'Scheduled',
  [BookingStatus.IN_PROGRESS]: 'Puja in progress',
  [BookingStatus.COMPLETED]: 'Completed',
  [BookingStatus.CANCELLED]: 'Cancelled',
  [BookingStatus.REFUNDED]: 'Refunded',
};

/** Human-friendly booking reference, e.g. "POZ-3F9K2A". */
export function makeBookingReference(seed?: string): string {
  const base = (seed ?? Math.random().toString(36).slice(2)).toUpperCase().replace(/[^A-Z0-9]/g, '');
  return `POZ-${base.slice(0, 6).padEnd(6, '0')}`;
}

/** Human-friendly product order reference, e.g. "PRD-3F9K2A". */
export function makeProductOrderReference(seed?: string): string {
  const base = (seed ?? Math.random().toString(36).slice(2))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return `PRD-${base.slice(0, 6).padEnd(6, '0')}`;
}

/** Slugify a title into lowercase hyphenated words, e.g. "Rudra Abhishek" -> "rudra-abhishek". */
export function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
