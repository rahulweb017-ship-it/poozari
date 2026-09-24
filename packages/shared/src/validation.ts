import { z } from 'zod';
import { PujaLocationType, UserRole } from './enums';

/** Indian mobile number (10 digits, optional +91). */
export const phoneSchema = z
  .string()
  .trim()
  .regex(/^(\+?91)?[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number');

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password is too long');

/* ----------------------------- Auth ----------------------------- */

/**
 * A devotee identifies themselves with a mobile number *or* an email address,
 * never both at once — the one they send decides which channel a login code
 * goes out on. Shared by the OTP and password logins.
 *
 * Built as a plain shape rather than a schema because `.refine()` returns a
 * `ZodEffects`, which has no `.extend()`: each schema below has to spread the
 * shape first and refine last.
 */
const otpTargetShape = {
  phone: phoneSchema.optional(),
  email: emailSchema.optional(),
};
const hasExactlyOneTarget = (value: { phone?: string; email?: string }) =>
  Boolean(value.phone) !== Boolean(value.email);
const oneTargetMessage = { message: 'Enter either a mobile number or an email address' };

export const requestOtpSchema = z
  .object(otpTargetShape)
  .refine(hasExactlyOneTarget, oneTargetMessage);
export type RequestOtpInput = z.infer<typeof requestOtpSchema>;

export const verifyOtpSchema = z
  .object({
    ...otpTargetShape,
    code: z.string().length(6, 'OTP must be 6 digits'),
    name: z.string().trim().min(2).max(80).optional(),
  })
  .refine(hasExactlyOneTarget, oneTargetMessage);
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;

export const staffLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});
export type StaffLoginInput = z.infer<typeof staffLoginSchema>;

export const customerPasswordLoginSchema = z
  .object({ ...otpTargetShape, password: passwordSchema })
  .refine(hasExactlyOneTarget, oneTargetMessage);
export type CustomerPasswordLoginInput = z.infer<typeof customerPasswordLoginSchema>;

/** Devotee-supplied details, used to pre-fill the sankalp on a booking. */
export const Gender = {
  UNSPECIFIED: 'UNSPECIFIED',
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const GENDER_LABELS: Record<Gender, string> = {
  UNSPECIFIED: 'Prefer not to say',
  MALE: 'Male',
  FEMALE: 'Female',
  OTHER: 'Other',
};

export const updateCustomerProfileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema.optional().or(z.literal('')),
  /** ISO date (yyyy-mm-dd). Blank clears it. */
  dateOfBirth: z.coerce.date().optional().nullable(),
  gender: z.enum([Gender.UNSPECIFIED, Gender.MALE, Gender.FEMALE, Gender.OTHER]).optional(),
  /** Family lineage recited during the sankalp. */
  gotra: z.string().trim().max(120).optional(),
  addressLine: z.string().trim().max(300).optional(),
  city: z.string().trim().max(120).optional(),
  state: z.string().trim().max(120).optional(),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Pincode must be 6 digits')
    .optional()
    .or(z.literal('')),
});
export type UpdateCustomerProfileInput = z.infer<typeof updateCustomerProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: passwordSchema.optional(),
    newPassword: passwordSchema,
    confirmPassword: passwordSchema,
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New passwords do not match',
    path: ['confirmPassword'],
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const createStaffSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().trim().min(2).max(80),
  role: z.enum([UserRole.SUPER_ADMIN, UserRole.PANDIT]),
});
export type CreateStaffInput = z.infer<typeof createStaffSchema>;

/* ----------------------------- Catalog ----------------------------- */

export const packageSchema = z.object({
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(2000).optional().default(''),
  // Hindi is optional throughout: a blank field falls back to the English.
  nameHi: z.string().trim().max(120).optional().default(''),
  descriptionHi: z.string().trim().max(2000).optional().default(''),
  priceInr: z.number().int().positive('Price must be greater than 0'),
  inclusions: z.array(z.string().trim().min(1)).default([]),
});
export type PackageInput = z.infer<typeof packageSchema>;

export const addonSchema = z.object({
  name: z.string().trim().min(2).max(120),
  nameHi: z.string().trim().max(120).optional().default(''),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase words separated by hyphens'),
  description: z.string().trim().max(2000).optional().default(''),
  descriptionHi: z.string().trim().max(2000).optional().default(''),
  priceInr: z.number().int().positive('Price must be greater than 0'),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).default(0),
});
export type AddonInput = z.infer<typeof addonSchema>;
export const updateAddonSchema = addonSchema.partial();
export type UpdateAddonInput = z.infer<typeof updateAddonSchema>;

export const createPujaSchema = z.object({
  title: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase words separated by hyphens'),
  summary: z.string().trim().max(500).optional().default(''),
  description: z.string().trim().max(8000).optional().default(''),
  titleHi: z.string().trim().max(160).optional().default(''),
  summaryHi: z.string().trim().max(500).optional().default(''),
  descriptionHi: z.string().trim().max(8000).optional().default(''),
  imageUrl: z.string().url().optional(),
  locationType: z.enum([
    PujaLocationType.HOME,
    PujaLocationType.TEERTH,
    PujaLocationType.TEMPLE,
    PujaLocationType.DIGITAL,
  ]),
  templeId: z.string().cuid().optional(),
  cityId: z.string().cuid().optional(),
  deityIds: z.array(z.string().cuid()).default([]),
  festivalIds: z.array(z.string().cuid()).default([]),
  benefitIds: z.array(z.string().cuid()).default([]),
  isActive: z.boolean().default(true),
  packages: z.array(packageSchema).min(1, 'Add at least one package'),
});
export type CreatePujaInput = z.infer<typeof createPujaSchema>;
export const updatePujaSchema = createPujaSchema.partial();
export type UpdatePujaInput = z.infer<typeof updatePujaSchema>;

const namedEntitySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase words separated by hyphens'),
  description: z.string().trim().max(8000).optional().default(''),
  imageUrl: z.string().url().optional(),
});

export const createCitySchema = namedEntitySchema.extend({
  state: z.string().trim().max(80).optional().default(''),
});
export type CreateCityInput = z.infer<typeof createCitySchema>;

export const createTempleSchema = namedEntitySchema.extend({
  cityId: z.string().cuid(),
  state: z.string().trim().max(80).optional().default(''),
});
export type CreateTempleInput = z.infer<typeof createTempleSchema>;

export const createDeitySchema = namedEntitySchema;
export type CreateDeityInput = z.infer<typeof createDeitySchema>;
export const createFestivalSchema = namedEntitySchema;
export type CreateFestivalInput = z.infer<typeof createFestivalSchema>;
export const createBenefitSchema = namedEntitySchema;
export type CreateBenefitInput = z.infer<typeof createBenefitSchema>;

/* Catalog updates (all fields optional) */
export const updateCitySchema = createCitySchema.partial();
export type UpdateCityInput = z.infer<typeof updateCitySchema>;
export const updateTempleSchema = createTempleSchema.partial();
export type UpdateTempleInput = z.infer<typeof updateTempleSchema>;
export const updateDeitySchema = createDeitySchema.partial();
export type UpdateDeityInput = z.infer<typeof updateDeitySchema>;
export const updateFestivalSchema = createFestivalSchema.partial();
export type UpdateFestivalInput = z.infer<typeof updateFestivalSchema>;
export const updateBenefitSchema = createBenefitSchema.partial();
export type UpdateBenefitInput = z.infer<typeof updateBenefitSchema>;

/* ----------------------------- Products ----------------------------- */

export const createProductSchema = z.object({
  name: z.string().trim().min(2).max(160),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase words separated by hyphens'),
  category: z.string().trim().min(2).max(80),
  description: z.string().trim().max(4000).optional().default(''),
  imageUrl: z
    .string()
    .trim()
    .refine(
      (value) => value.startsWith('/') || z.string().url().safeParse(value).success,
      'Enter a valid URL or local image path',
    )
    .optional(),
  priceInr: z.number().int().positive('Price must be greater than 0'),
  stockQuantity: z.number().int().min(0, 'Stock cannot be negative').default(0),
  isActive: z.boolean().default(true),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema.partial();
export type UpdateProductInput = z.infer<typeof updateProductSchema>;

export const createProductOrderSchema = z.object({
  productId: z.string().cuid(),
  quantity: z.number().int().min(1).max(10),
  customerName: z.string().trim().min(2).max(120),
  contactPhone: phoneSchema,
  contactEmail: emailSchema.optional(),
  addressLine: z.string().trim().min(5).max(300),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(120),
  pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
});
export type CreateProductOrderInput = z.infer<typeof createProductOrderSchema>;

/* ----------------------------- Pandit ----------------------------- */

export const panditProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(120),
  bio: z.string().trim().max(4000).optional().default(''),
  phone: phoneSchema,
  experienceYears: z.number().int().min(0).max(80).default(0),
  specializations: z.array(z.string().trim().min(1)).default([]),
  serviceCityIds: z.array(z.string().cuid()).default([]),
  servicePincodes: z.array(z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits')).default([]),
  isAvailable: z.boolean().default(true),
});
export type PanditProfileInput = z.infer<typeof panditProfileSchema>;

/** Super Admin updating a pandit profile; optionally reset the login password. */
export const updatePanditSchema = panditProfileSchema.partial().extend({
  isActive: z.boolean().optional(),
  password: z.string().min(8, 'Password must be at least 8 characters').optional(),
});
export type UpdatePanditInput = z.infer<typeof updatePanditSchema>;

export const updatePanditProfileSchema = panditProfileSchema
  .omit({ isAvailable: true })
  .partial();
export type UpdatePanditProfileInput = z.infer<typeof updatePanditProfileSchema>;

export const updatePanditAvailabilitySchema = z.object({
  isAvailable: z.boolean(),
});
export type UpdatePanditAvailabilityInput = z.infer<typeof updatePanditAvailabilitySchema>;

/* ----------------------------- Booking ----------------------------- */

export const createBookingSchema = z.object({
  pujaId: z.string().cuid(),
  packageId: z.string().cuid(),
  /**
   * Ids only — never prices. The server looks each one up and sums the stored
   * amount, for the same reason there is no generic create-order endpoint
   * taking an amount: a client-supplied price lets anyone pay ₹1.
   */
  addonIds: z.array(z.string().cuid()).max(20).default([]),
  // Sankalp details
  devoteeName: z.string().trim().min(2).max(120),
  gotra: z.string().trim().max(120).optional().default(''),
  contactPhone: phoneSchema,
  contactEmail: emailSchema.optional(),
  // Scheduling
  preferredDate: z.coerce.date(),
  preferredTime: z.string().trim().max(40).optional().default(''),
  // Service location (for HOME pujas / area-based assignment)
  addressLine: z.string().trim().max(300).optional().default(''),
  city: z.string().trim().max(120).optional().default(''),
  pincode: z
    .string()
    .regex(/^\d{6}$/, 'Pincode must be 6 digits')
    .optional(),
  notes: z.string().trim().max(2000).optional().default(''),
});
export type CreateBookingInput = z.infer<typeof createBookingSchema>;

export const assignPanditSchema = z.object({
  panditId: z.string().cuid(),
});
export type AssignPanditInput = z.infer<typeof assignPanditSchema>;

export const updateBookingStatusSchema = z.object({
  status: z.string(),
});

export const uploadVideoSchema = z.object({
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
});
export type UploadVideoInput = z.infer<typeof uploadVideoSchema>;

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).optional().default(''),
});
export type CreateReviewInput = z.infer<typeof createReviewSchema>;

/* ----------------------------- Live darshan ----------------------------- */

export const createLiveSessionSchema = z.object({
  title: z.string().trim().min(2).max(160),
  description: z.string().trim().max(4000).optional().default(''),
  thumbnailUrl: z.string().url().optional(),
  joinPriceInr: z.number().int().positive('Join fee must be greater than 0'),
  scheduledAt: z.coerce.date(),
  pujaId: z.string().cuid().optional(),
  panditId: z.string().cuid().optional(),
  playbackUrl: z.string().url().optional(),
});
export type CreateLiveSessionInput = z.infer<typeof createLiveSessionSchema>;

export const updateLiveSessionSchema = createLiveSessionSchema.partial();
export type UpdateLiveSessionInput = z.infer<typeof updateLiveSessionSchema>;

/** Pandit/admin going live may supply/refresh the playback URL. */
export const goLiveSchema = z.object({
  playbackUrl: z.string().url().optional(),
});
export type GoLiveInput = z.infer<typeof goLiveSchema>;

/** Push a live caption; at least one language is required. */
export const pushLiveCaptionSchema = z.object({
  translations: z
    .object({
      sa: z.string().trim().max(300).optional(),
      hi: z.string().trim().max(300).optional(),
      en: z.string().trim().max(300).optional(),
    })
    .refine((t) => Boolean(t.sa || t.hi || t.en), {
      message: 'Add the caption in at least one language',
    }),
});
export type PushLiveCaptionInput = z.infer<typeof pushLiveCaptionSchema>;
