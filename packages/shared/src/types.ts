import type {
  AssignmentMode,
  AssignmentStatus,
  BookingStatus,
  EarningStatus,
  LiveAccessStatus,
  LiveCaptionLang,
  LiveSessionStatus,
  PaymentStatus,
  ProductOrderStatus,
  PujaLocationType,
  SettlementStatus,
  UserRole,
} from './enums';

export interface ApiError {
  statusCode: number;
  message: string | string[];
  error?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AuthUser {
  id: string;
  role: UserRole;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface AccountProfile extends AuthUser {
  hasPassword: boolean;
  /** ISO date string, or null when the devotee has not given one. */
  dateOfBirth?: string | null;
  gender?: string;
  gotra?: string;
  addressLine?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface PujaPackage {
  id: string;
  name: string;
  description: string;
  /** Hindi copy. Empty means untranslated — render the English. See `localized`. */
  nameHi: string;
  descriptionHi: string;
  priceInr: number;
  inclusions: string[];
}

/** A paid extra offered on every puja, managed under Admin -> Add-ons. */
export interface Addon {
  id: string;
  name: string;
  nameHi: string;
  slug: string;
  description: string;
  descriptionHi: string;
  priceInr: number;
  imageUrl?: string | null;
  isActive: boolean;
  sortOrder: number;
}

/** The words on a home slider banner, in one language. */
export interface HomeSlideText {
  pill: string;
  title: string;
  subtitle: string;
  cta: string;
}

/** Locales a slide can be translated into; English lives on the slide itself. */
export const HOME_SLIDE_LOCALES = ['hi', 'fr', 'es'] as const;
export type HomeSlideLocale = (typeof HOME_SLIDE_LOCALES)[number];

/** A home page banner, managed under Admin -> Home Slider. */
export interface HomeSlide extends HomeSlideText {
  id: string;
  imageUrl: string;
  mobileImageUrl: string | null;
  /** A site path such as `/puja`, or a full URL. Blank means no button. */
  linkUrl: string;
  /** Blank or missing fields show the English. */
  translations: Partial<Record<HomeSlideLocale, Partial<HomeSlideText>>>;
  isActive: boolean;
  sortOrder: number;
}

/** An add-on as bought: a price snapshot that later edits never rewrite. */
export interface BookingAddonLine {
  id: string;
  addonId?: string | null;
  name: string;
  nameHi: string;
  priceInr: number;
}

export interface NamedEntity {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string | null;
}

export interface City extends NamedEntity {
  state?: string;
  templeCount?: number;
}

export interface Temple extends NamedEntity {
  cityId: string;
  city?: City;
  state?: string;
}

export interface Puja {
  id: string;
  title: string;
  slug: string;
  summary: string;
  description: string;
  /** Hindi copy. Empty means untranslated — render the English. See `localized`. */
  titleHi: string;
  summaryHi: string;
  descriptionHi: string;
  /** Feature bullets on the puja page; `featuresHi` empty means show the English. */
  features: string[];
  featuresHi: string[];
  imageUrl?: string | null;
  locationType: PujaLocationType;
  isActive: boolean;
  temple?: Temple | null;
  city?: City | null;
  deities: NamedEntity[];
  festivals: NamedEntity[];
  benefits: NamedEntity[];
  packages: PujaPackage[];
  startingPriceInr: number;
  rating?: number;
  reviewCount?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  description: string;
  /** Cover image, always `images[0]` when there is a gallery. */
  imageUrl?: string | null;
  /** Gallery, cover first. */
  images: string[];
  /** An uploaded video file or a YouTube / hosted video URL. */
  videoUrl?: string | null;
  priceInr: number;
  stockQuantity: number;
  isActive: boolean;
  createdAt: string;
}

export interface ProductOrder {
  id: string;
  reference: string;
  customerId: string;
  productId: string;
  product?: Product;
  status: ProductOrderStatus;
  productName: string;
  productImageUrl?: string | null;
  unitPriceInr: number;
  quantity: number;
  totalAmountInr: number;
  customerName: string;
  contactPhone: string;
  contactEmail?: string | null;
  addressLine: string;
  city: string;
  state: string;
  pincode: string;
  paymentStatus: PaymentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface PanditProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string;
  phone: string;
  experienceYears: number;
  specializations: string[];
  serviceCityIds: string[];
  servicePincodes: string[];
  /** Super Admin controlled account status. */
  isActive: boolean;
  /** Pandit controlled assignment availability. */
  isAvailable: boolean;
  rating?: number;
  email?: string | null;
  /** Per-pandit share override in percent; null uses the platform default. */
  commissionPercent?: number | null;
}

export interface PanditEarning {
  id: string;
  bookingId: string;
  bookingReference: string;
  pujaTitle: string;
  devoteeName: string;
  panditId: string;
  panditName: string;
  bookingAmountInr: number;
  percent: number;
  earningInr: number;
  status: EarningStatus;
  settlementId: string | null;
  /** When the booking was completed. */
  createdAt: string;
}

export interface Settlement {
  id: string;
  panditId: string;
  panditName: string;
  periodStart: string;
  periodEnd: string;
  totalInr: number;
  status: SettlementStatus;
  paidAt: string | null;
  reference: string;
  notes: string;
  earningsCount: number;
  createdAt: string;
}

/** One booking as seen from the admin payments ledger. */
export interface PaymentLedgerRow {
  bookingId: string;
  reference: string;
  pujaTitle: string;
  devoteeName: string;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus | null;
  amountInr: number;
  createdAt: string;
  paidAt: string | null;
  panditId: string | null;
  panditName: string | null;
  earningInr: number | null;
  earningPercent: number | null;
  earningStatus: EarningStatus | null;
  platformShareInr: number | null;
}

export interface PaymentsSummary {
  receivedInr: number;
  pendingCustomerInr: number;
  pujariPayablePendingInr: number;
  paidToPujarisInr: number;
  platformShareInr: number;
}

export interface PanditEarningsSummary {
  completedPujas: number;
  totalEarningsInr: number;
  paidInr: number;
  pendingInr: number;
}

export interface AdminPanditBookingRow {
  bookingId: string;
  reference: string;
  pujaTitle: string;
  devoteeName: string;
  city: string;
  preferredDate: string;
  amountInr: number;
  status: BookingStatus;
  assignedAt: string;
  earningInr: number | null;
  earningStatus: EarningStatus | null;
}

/** Everything the admin's per-pandit dashboard shows, in one response. */
export interface AdminPanditOverview {
  pandit: {
    id: string;
    displayName: string;
    email: string | null;
    phone: string;
    bio: string;
    experienceYears: number;
    specializations: string[];
    servicePincodes: string[];
    serviceCities: string[];
    isActive: boolean;
    isAvailable: boolean;
    rating: number;
    commissionPercent: number | null;
    effectiveCommissionPercent: number;
    createdAt: string;
  };
  bookings: {
    total: number;
    /** Assigned but not yet completed, cancelled or refunded. */
    active: number;
    completed: number;
    cancelled: number;
    byStatus: Partial<Record<BookingStatus, number>>;
  };
  earnings: PanditEarningsSummary;
  /** Sum of booking amounts for this pandit's completed pujas. */
  completedBookingValueInr: number;
  reviews: { count: number; averageRating: number | null };
  liveSessions: number;
  recentBookings: AdminPanditBookingRow[];
  settlements: Settlement[];
}

/** Returned once when an application is approved; the password is never stored in clear. */
export interface ApproveApplicationResult {
  panditId: string;
  userId: string;
  email: string;
  tempPassword: string;
  emailSent: boolean;
}

export interface Assignment {
  id: string;
  bookingId: string;
  panditId: string;
  pandit?: PanditProfile;
  status: AssignmentStatus;
  mode: AssignmentMode;
  createdAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  amountInr: number;
  status: PaymentStatus;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  createdAt: string;
}

export interface Booking {
  id: string;
  reference: string;
  customerId: string;
  puja: Puja;
  package: PujaPackage;
  status: BookingStatus;
  devoteeName: string;
  gotra: string;
  contactPhone: string;
  contactEmail?: string | null;
  preferredDate: string;
  preferredTime: string;
  addressLine: string;
  city: string;
  pincode?: string | null;
  notes: string;
  /** Grand total: package + add-ons. This is what Razorpay charges. */
  amountInr: number;
  /** The package's share of `amountInr`, snapshotted at booking time. */
  packageAmountInr: number;
  addons: BookingAddonLine[];
  assignment?: Assignment | null;
  payment?: Payment | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface LiveSession {
  id: string;
  title: string;
  description: string;
  thumbnailUrl?: string | null;
  joinPriceInr: number;
  status: LiveSessionStatus;
  scheduledAt: string;
  startedAt?: string | null;
  endedAt?: string | null;
  /** Only present when the current user has paid access and the session is live. */
  playbackUrl?: string | null;
  recordingUrl?: string | null;
  puja?: { id: string; title: string; slug: string } | null;
  pandit?: { id: string; displayName: string; experienceYears: number } | null;
  /** True when the authenticated customer has a PAID ticket for this session. */
  hasAccess?: boolean;
  viewerCount?: number;
  createdAt: string;
}

export interface LiveAccess {
  id: string;
  liveSessionId: string;
  customerId: string;
  amountInr: number;
  status: LiveAccessStatus;
  createdAt: string;
}

export interface LiveCaption {
  id: string;
  liveSessionId: string;
  /** Ordering within the session; the highest seq is the current caption. */
  seq: number;
  /** Caption text keyed by language code; not every language is required. */
  translations: Partial<Record<LiveCaptionLang, string>>;
  createdAt: string;
}
