/** Shared domain enums. Values are stored verbatim in the database. */

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  PANDIT: 'PANDIT',
  CUSTOMER: 'CUSTOMER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

/** Where the puja is performed. */
export const PujaLocationType = {
  HOME: 'HOME',
  TEERTH: 'TEERTH',
  TEMPLE: 'TEMPLE',
} as const;
export type PujaLocationType = (typeof PujaLocationType)[keyof typeof PujaLocationType];

/** Lifecycle of a booking. */
export const BookingStatus = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAID: 'PAID',
  ASSIGNED: 'ASSIGNED',
  ACCEPTED: 'ACCEPTED',
  SCHEDULED: 'SCHEDULED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;
export type BookingStatus = (typeof BookingStatus)[keyof typeof BookingStatus];

/** Lifecycle of a pandit assignment against a booking. */
export const AssignmentStatus = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  ACCEPTED: 'ACCEPTED',
  DECLINED: 'DECLINED',
  REASSIGNED: 'REASSIGNED',
} as const;
export type AssignmentStatus = (typeof AssignmentStatus)[keyof typeof AssignmentStatus];

/** How the assignment was made. */
export const AssignmentMode = {
  AUTO: 'AUTO',
  MANUAL: 'MANUAL',
} as const;
export type AssignmentMode = (typeof AssignmentMode)[keyof typeof AssignmentMode];

export const PaymentStatus = {
  CREATED: 'CREATED',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;
export type PaymentStatus = (typeof PaymentStatus)[keyof typeof PaymentStatus];

/** Lifecycle of a live darshan session. */
export const LiveSessionStatus = {
  SCHEDULED: 'SCHEDULED',
  LIVE: 'LIVE',
  ENDED: 'ENDED',
} as const;
export type LiveSessionStatus = (typeof LiveSessionStatus)[keyof typeof LiveSessionStatus];

/** Paywall ticket status for joining a live darshan. */
export const LiveAccessStatus = {
  CREATED: 'CREATED',
  PAID: 'PAID',
} as const;
export type LiveAccessStatus = (typeof LiveAccessStatus)[keyof typeof LiveAccessStatus];

/** Lifecycle of a physical-product order. */
export const ProductOrderStatus = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  PAID: 'PAID',
  PROCESSING: 'PROCESSING',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  REFUNDED: 'REFUNDED',
} as const;
export type ProductOrderStatus = (typeof ProductOrderStatus)[keyof typeof ProductOrderStatus];

/** Caption languages for live darshan. */
export const LiveCaptionLang = {
  SA: 'sa',
  HI: 'hi',
  EN: 'en',
} as const;
export type LiveCaptionLang = (typeof LiveCaptionLang)[keyof typeof LiveCaptionLang];

/** Caption languages in display order, with native labels and short CC badges. */
export const LIVE_CAPTION_LANGS: { code: LiveCaptionLang; label: string; short: string }[] = [
  { code: LiveCaptionLang.SA, label: 'संस्कृतम्', short: 'सं' },
  { code: LiveCaptionLang.HI, label: 'हिन्दी', short: 'हिं' },
  { code: LiveCaptionLang.EN, label: 'English', short: 'EN' },
];

/** Statuses a customer sees for booking progress, in display order. */
export const BOOKING_STATUS_FLOW: BookingStatus[] = [
  BookingStatus.PAID,
  BookingStatus.ASSIGNED,
  BookingStatus.ACCEPTED,
  BookingStatus.SCHEDULED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
];
