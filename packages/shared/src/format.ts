import { BookingStatus } from './enums';

/** Format an INR integer amount, e.g. 6100 -> "₹6,100". */
export function formatInr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
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
