import type { BulkImportInput, BulkImportResult } from './csv';
import type {
  BlogPost,
  CreateBlogPostInput,
  Inquiry,
  PanditApplication,
} from './content';
import type { Currency } from './currency';
import type {
  CustomerPasswordLoginInput,
  RequestOtpInput,
  VerifyOtpInput,
} from './validation';
import type {
  Addon,
  AuthResponse,
  AccountProfile,
  Booking,
  City,
  LiveAccess,
  LiveCaption,
  LiveSession,
  NamedEntity,
  PanditProfile,
  Product,
  ProductOrder,
  Puja,
  Review,
  Temple,
} from './types';

export interface ClientOptions {
  baseUrl: string;
  /** Returns the current bearer token, if any. */
  getToken?: () => string | null | undefined;
  fetchImpl?: typeof fetch;
}

export class ApiClientError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

/**
 * Minimal typed REST client shared by the web and (later) mobile apps.
 * Framework-agnostic: pass a token getter and a fetch implementation.
 */
export class PoozariClient {
  private readonly baseUrl: string;
  private readonly getToken?: () => string | null | undefined;
  private readonly fetchImpl: (...args: Parameters<typeof fetch>) => ReturnType<typeof fetch>;

  constructor(opts: ClientOptions) {
    this.baseUrl = opts.baseUrl.replace(/\/$/, '');
    this.getToken = opts.getToken;
    // Bind fetch to the global scope: calling a bare reference to window.fetch
    // as a method throws "Illegal invocation" in browsers.
    this.fetchImpl = opts.fetchImpl ?? ((...args) => fetch(...args));
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = new Headers(init?.headers);
    headers.set('Content-Type', 'application/json');
    const token = this.getToken?.();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await this.fetchImpl(`${this.baseUrl}${path}`, { ...init, headers });
    const text = await res.text();
    const body = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      const message = Array.isArray(body?.message)
        ? body.message.join(', ')
        : (body?.message ?? res.statusText);
      throw new ApiClientError(res.status, message, body);
    }
    return body as T;
  }

  private get<T>(path: string) {
    return this.request<T>(path, { method: 'GET' });
  }
  private post<T>(path: string, data?: unknown) {
    return this.request<T>(path, { method: 'POST', body: data ? JSON.stringify(data) : undefined });
  }
  private patch<T>(path: string, data?: unknown) {
    return this.request<T>(path, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  private delete<T>(path: string) {
    return this.request<T>(path, { method: 'DELETE' });
  }

  /** Multipart upload — lets the browser set the multipart boundary. */
  private async upload<T>(path: string, form: FormData): Promise<T> {
    const headers = new Headers();
    const token = this.getToken?.();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: form,
    });
    const text = await res.text();
    const body = text ? JSON.parse(text) : undefined;
    if (!res.ok) {
      const message = Array.isArray(body?.message)
        ? body.message.join(', ')
        : (body?.message ?? res.statusText);
      throw new ApiClientError(res.status, message, body);
    }
    return body as T;
  }

  /* Auth */
  /** Send a one-time code. Pass exactly one of `phone` or `email`. */
  requestOtp(data: RequestOtpInput) {
    return this.post<{ ok: true; devCode?: string; resendAfterSeconds: number }>(
      '/auth/otp/request',
      data,
    );
  }
  /** Verifying a code for an unknown identifier creates the account. */
  verifyOtp(data: VerifyOtpInput) {
    return this.post<AuthResponse>('/auth/otp/verify', data);
  }
  staffLogin(data: { email: string; password: string }) {
    return this.post<AuthResponse>('/auth/login', data);
  }
  customerPasswordLogin(data: CustomerPasswordLoginInput) {
    return this.post<AuthResponse>('/auth/customer/login', data);
  }
  myProfile() {
    return this.get<AccountProfile>('/auth/me');
  }
  updateCustomerProfile(data: {
    name: string;
    email?: string;
    dateOfBirth?: string | null;
    gender?: string;
    gotra?: string;
    addressLine?: string;
    city?: string;
    state?: string;
    pincode?: string;
  }) {
    return this.patch<AuthResponse>('/auth/me', data);
  }
  changePassword(data: {
    currentPassword?: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    return this.patch<{ ok: true }>('/auth/me/password', data);
  }

  /* Catalog (public) */
  listPujas(params?: { locationType?: string; cityId?: string; templeId?: string; deityId?: string; festivalId?: string; benefitId?: string; q?: string }) {
    const qs = params ? '?' + new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString() : '';
    return this.get<Puja[]>(`/pujas${qs}`);
  }
  getPuja(slug: string) {
    return this.get<Puja>(`/pujas/${slug}`);
  }
  listCities() {
    return this.get<City[]>('/cities');
  }
  listTemples() {
    return this.get<Temple[]>('/temples');
  }
  listDeities() {
    return this.get<NamedEntity[]>('/deities');
  }
  listFestivals() {
    return this.get<NamedEntity[]>('/festivals');
  }
  listBenefits() {
    return this.get<NamedEntity[]>('/benefits');
  }
  /** Published blog posts, newest first. */
  listBlogPosts(category?: string) {
    return this.get<BlogPost[]>(`/blog${category ? `?category=${encodeURIComponent(category)}` : ''}`);
  }
  listBlogCategories() {
    return this.get<string[]>('/blog/categories');
  }
  getBlogPost(slug: string) {
    return this.get<BlogPost>(`/blog/${slug}`);
  }

  /* Site forms */
  submitContact(data: unknown) {
    return this.post<{ ok: true; id: string }>('/contact', data);
  }
  submitEnquiry(data: unknown) {
    return this.post<{ ok: true; id: string }>('/enquiries', data);
  }
  submitPanditApplication(data: unknown) {
    return this.post<{ ok: true; id: string }>('/pandit-applications', data);
  }
  /**
   * Log a WhatsApp booking intent. Requires a signed-in devotee — anonymous
   * calls are rejected, and callers treat this as fire-and-forget.
   */
  logWhatsappLead(data: unknown) {
    return this.post<{ ok: true; id: string }>('/whatsapp-leads', data);
  }

  /** Display currencies the admin has switched on. */
  listCurrencies() {
    return this.get<Currency[]>('/currencies');
  }
  /** Active checkout add-ons, in display order. Offered on every puja. */
  listAddons() {
    return this.get<Addon[]>('/addons');
  }
  listProducts(params?: { category?: string; q?: string }) {
    const qs = params
      ? `?${new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString()}`
      : '';
    return this.get<Product[]>(`/products${qs}`);
  }
  getProduct(slug: string) {
    return this.get<Product>(`/products/${slug}`);
  }

  /* Product orders (customer) */
  createProductOrder(data: unknown) {
    return this.post<ProductOrder>('/product-orders', data);
  }
  myProductOrders() {
    return this.get<ProductOrder[]>('/product-orders/me');
  }
  getProductOrder(id: string) {
    return this.get<ProductOrder>(`/product-orders/${id}`);
  }
  createProductPaymentOrder(id: string) {
    return this.post<{
      orderId: string;
      amountInr: number;
      keyId: string;
      devMode: boolean;
    }>(`/product-orders/${id}/payment-order`);
  }
  verifyProductPayment(id: string, data: unknown) {
    return this.post<ProductOrder>(`/product-orders/${id}/verify-payment`, data);
  }

  /* Bookings (customer) */
  createBooking(data: unknown) {
    return this.post<Booking>('/bookings', data);
  }
  myBookings() {
    return this.get<Booking[]>('/bookings/me');
  }
  getBooking(id: string) {
    return this.get<Booking>(`/bookings/${id}`);
  }
  createReview(bookingId: string, data: { rating: number; comment?: string }) {
    return this.post<Review>(`/bookings/${bookingId}/review`, data);
  }

  /* Payments */
  createPaymentOrder(bookingId: string) {
    return this.post<{ orderId: string; amountInr: number; keyId: string }>(
      `/payments/${bookingId}/order`,
    );
  }
  verifyPayment(bookingId: string, data: unknown) {
    return this.post<Booking>(`/payments/${bookingId}/verify`, data);
  }

  /* Admin */
  adminDashboard() {
    return this.get<{
      totalBookings: number;
      awaitingAssignment: number;
      assigned: number;
      completed: number;
      revenueInr: number;
      pandits: number;
      customers: number;
    }>('/admin/dashboard');
  }
  adminListBookings(status?: string) {
    return this.get<Booking[]>(`/admin/bookings${status ? `?status=${status}` : ''}`);
  }
  adminUnassigned() {
    return this.get<Booking[]>('/admin/bookings/unassigned');
  }
  adminAutoAssign(bookingId: string) {
    return this.post<Booking>(`/admin/bookings/${bookingId}/auto-assign`);
  }
  adminAssign(bookingId: string, panditId: string) {
    return this.post<Booking>(`/admin/bookings/${bookingId}/assign`, { panditId });
  }
  adminListPandits() {
    return this.get<any[]>('/admin/pandits');
  }
  adminCreatePandit(data: unknown) {
    return this.post<any>('/admin/pandits', data);
  }
  adminUpdatePandit(id: string, data: unknown) {
    return this.patch<any>(`/admin/pandits/${id}`, data);
  }
  adminDeletePandit(id: string) {
    return this.delete<{ ok: true }>(`/admin/pandits/${id}`);
  }

  /* Admin email diagnostics */
  adminEmailStatus() {
    return this.get<{
      configured: boolean;
      host: string | null;
      from: string;
      notifyAddress: string | null;
      ok: boolean;
      detail: string;
    }>('/admin/email/status');
  }
  adminSendTestEmail() {
    return this.post<{ ok: true; to: string }>('/admin/email/test');
  }

  /* Admin blog */
  adminListBlogPosts() {
    return this.get<BlogPost[]>('/admin/blog');
  }
  adminCreateBlogPost(data: CreateBlogPostInput | unknown) {
    return this.post<BlogPost>('/admin/blog', data);
  }
  adminUpdateBlogPost(id: string, data: unknown) {
    return this.patch<BlogPost>(`/admin/blog/${id}`, data);
  }
  adminDeleteBlogPost(id: string) {
    return this.delete<{ ok: true }>(`/admin/blog/${id}`);
  }

  /* Admin inbox: Contact Us + puja enquiries */
  adminListInquiries(params?: { kind?: string; status?: string }) {
    const qs = params
      ? `?${new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]).toString()}`
      : '';
    return this.get<Inquiry[]>(`/admin/inquiries${qs}`);
  }
  adminUpdateInquiry(id: string, data: unknown) {
    return this.patch<Inquiry>(`/admin/inquiries/${id}`, data);
  }

  /* Admin: "Become a Pujari" applications */
  adminListPanditApplications(status?: string) {
    return this.get<PanditApplication[]>(
      `/admin/pandit-applications${status ? `?status=${status}` : ''}`,
    );
  }
  adminUpdatePanditApplication(id: string, data: unknown) {
    return this.patch<PanditApplication>(`/admin/pandit-applications/${id}`, data);
  }

  /**
   * Upload an image for an admin form (puja/product cover, etc).
   * Resolves to the absolute URL to store in the record's `imageUrl`.
   */
  adminUploadImage(file: Blob, filename = 'image.jpg') {
    const form = new FormData();
    form.append('file', file, filename);
    return this.upload<{ url: string }>('/admin/uploads/image', form);
  }

  /* Admin currencies */
  adminListCurrencies() {
    return this.get<Currency[]>('/admin/currencies');
  }
  adminUpsertCurrency(data: unknown) {
    return this.post<Currency>('/admin/currencies', data);
  }
  adminUpdateCurrency(code: string, data: unknown) {
    return this.patch<Currency>(`/admin/currencies/${code}`, data);
  }
  adminDeleteCurrency(code: string) {
    return this.delete<{ ok: true }>(`/admin/currencies/${code}`);
  }

  /* Admin checkout add-ons */
  /** Lists every add-on including deactivated ones. */
  adminListAddons() {
    return this.get<Addon[]>('/admin/addons');
  }
  adminCreateAddon(data: unknown) {
    return this.post<Addon>('/admin/addons', data);
  }
  adminUpdateAddon(id: string, data: unknown) {
    return this.patch<Addon>(`/admin/addons/${id}`, data);
  }
  adminDeleteAddon(id: string) {
    return this.delete<{ ok: true }>(`/admin/addons/${id}`);
  }

  /* Admin bulk CSV import */
  /** Validate (dryRun) or apply a puja CSV. Nothing is written while issues remain. */
  adminImportPujas(data: BulkImportInput) {
    return this.post<BulkImportResult>('/admin/import/pujas', data);
  }
  /** Validate (dryRun) or apply a pandit CSV. Nothing is written while issues remain. */
  adminImportPandits(data: BulkImportInput) {
    return this.post<BulkImportResult>('/admin/import/pandits', data);
  }

  /* Admin products */
  adminListProducts() {
    return this.get<Product[]>('/admin/products');
  }
  adminCreateProduct(data: unknown) {
    return this.post<Product>('/admin/products', data);
  }
  adminUpdateProduct(id: string, data: unknown) {
    return this.patch<Product>(`/admin/products/${id}`, data);
  }
  adminDeleteProduct(id: string) {
    return this.delete<{ ok: true }>(`/admin/products/${id}`);
  }

  /* Admin catalog: pujas */
  /** Lists every puja including inactive/hidden ones. */
  adminListPujas() {
    return this.get<Puja[]>('/admin/pujas');
  }
  adminCreatePuja(data: unknown) {
    return this.post<Puja>('/admin/pujas', data);
  }
  adminUpdatePuja(id: string, data: unknown) {
    return this.patch<Puja>(`/admin/pujas/${id}`, data);
  }
  adminDeletePuja(id: string) {
    return this.delete<{ ok: true }>(`/admin/pujas/${id}`);
  }

  /* Admin catalog: cities */
  adminCreateCity(data: unknown) {
    return this.post<City>('/admin/cities', data);
  }
  adminUpdateCity(id: string, data: unknown) {
    return this.patch<City>(`/admin/cities/${id}`, data);
  }
  adminDeleteCity(id: string) {
    return this.delete<{ ok: true }>(`/admin/cities/${id}`);
  }

  /* Admin catalog: temples */
  adminCreateTemple(data: unknown) {
    return this.post<Temple>('/admin/temples', data);
  }
  adminUpdateTemple(id: string, data: unknown) {
    return this.patch<Temple>(`/admin/temples/${id}`, data);
  }
  adminDeleteTemple(id: string) {
    return this.delete<{ ok: true }>(`/admin/temples/${id}`);
  }

  /* Admin catalog: deities / festivals / benefits */
  adminCreateDeity(data: unknown) {
    return this.post<NamedEntity>('/admin/deities', data);
  }
  adminUpdateDeity(id: string, data: unknown) {
    return this.patch<NamedEntity>(`/admin/deities/${id}`, data);
  }
  adminDeleteDeity(id: string) {
    return this.delete<{ ok: true }>(`/admin/deities/${id}`);
  }
  adminCreateFestival(data: unknown) {
    return this.post<NamedEntity>('/admin/festivals', data);
  }
  adminUpdateFestival(id: string, data: unknown) {
    return this.patch<NamedEntity>(`/admin/festivals/${id}`, data);
  }
  adminDeleteFestival(id: string) {
    return this.delete<{ ok: true }>(`/admin/festivals/${id}`);
  }
  adminCreateBenefit(data: unknown) {
    return this.post<NamedEntity>('/admin/benefits', data);
  }
  adminUpdateBenefit(id: string, data: unknown) {
    return this.patch<NamedEntity>(`/admin/benefits/${id}`, data);
  }
  adminDeleteBenefit(id: string) {
    return this.delete<{ ok: true }>(`/admin/benefits/${id}`);
  }

  /* Pandit */
  panditBookings() {
    return this.get<Booking[]>('/pandit/bookings');
  }
  panditProfile() {
    return this.get<PanditProfile>('/pandit/profile');
  }
  panditUpdateProfile(data: unknown) {
    return this.patch<PanditProfile>('/pandit/profile', data);
  }
  panditSetAvailability(isAvailable: boolean) {
    return this.patch<PanditProfile>('/pandit/availability', { isAvailable });
  }
  panditUpdateStatus(bookingId: string, status: string) {
    return this.patch<Booking>(`/pandit/bookings/${bookingId}/status`, { status });
  }
  panditUploadVideo(bookingId: string, data: { videoUrl: string; thumbnailUrl?: string }) {
    return this.post<Booking>(`/pandit/bookings/${bookingId}/video`, data);
  }
  /** Upload a recorded video file (multipart) for a booking. */
  panditUploadVideoFile(bookingId: string, file: Blob, filename = 'pooja.webm') {
    const form = new FormData();
    form.append('file', file, filename);
    return this.upload<Booking>(`/pandit/bookings/${bookingId}/video-file`, form);
  }

  /* Live Darshan (public) */
  listLiveSessions(status?: 'live' | 'upcoming' | 'ended') {
    return this.get<LiveSession[]>(`/live${status ? `?status=${status}` : ''}`);
  }
  getLiveSession(id: string) {
    return this.get<LiveSession>(`/live/${id}`);
  }

  /* Live Darshan (customer) */
  createLiveOrder(liveSessionId: string) {
    return this.post<{ orderId: string; amountInr: number; keyId: string; accessId: string }>(
      `/live/${liveSessionId}/order`,
    );
  }
  verifyLiveAccess(liveSessionId: string, data: unknown) {
    return this.post<LiveAccess>(`/live/${liveSessionId}/verify`, data);
  }
  myLiveAccess() {
    return this.get<LiveAccess[]>('/live/me/access');
  }

  /* Live Darshan (admin) */
  adminListLive() {
    return this.get<LiveSession[]>('/admin/live');
  }
  adminCreateLive(data: unknown) {
    return this.post<LiveSession>('/admin/live', data);
  }
  adminUpdateLive(id: string, data: unknown) {
    return this.patch<LiveSession>(`/admin/live/${id}`, data);
  }
  adminGoLive(id: string, playbackUrl?: string) {
    return this.post<LiveSession>(`/admin/live/${id}/go-live`, { playbackUrl });
  }
  adminEndLive(id: string) {
    return this.post<LiveSession>(`/admin/live/${id}/end`);
  }

  /* Live Darshan (pandit) */
  panditLiveSessions() {
    return this.get<LiveSession[]>('/pandit/live');
  }
  panditGoLive(id: string, playbackUrl?: string) {
    return this.post<LiveSession>(`/pandit/live/${id}/go-live`, { playbackUrl });
  }
  panditEndLive(id: string) {
    return this.post<LiveSession>(`/pandit/live/${id}/end`);
  }

  /* Live Darshan captions */
  /** Current caption for a session (null when none has been pushed yet). */
  getLiveCaption(id: string) {
    return this.get<LiveCaption | null>(`/live/${id}/caption`);
  }
  panditPushLiveCaption(id: string, translations: LiveCaption['translations']) {
    return this.post<LiveCaption>(`/pandit/live/${id}/captions`, { translations });
  }
  adminPushLiveCaption(id: string, translations: LiveCaption['translations']) {
    return this.post<LiveCaption>(`/admin/live/${id}/captions`, { translations });
  }
}
