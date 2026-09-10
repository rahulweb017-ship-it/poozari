import { z } from 'zod';
import { emailSchema, phoneSchema } from './validation';

/* ----------------------------- Enums ----------------------------- */

export const InquiryKind = {
  CONTACT: 'CONTACT',
  ENQUIRY: 'ENQUIRY',
  /** A signed-in devotee starting a booking over WhatsApp. */
  WHATSAPP: 'WHATSAPP',
} as const;
export type InquiryKind = (typeof InquiryKind)[keyof typeof InquiryKind];

export const InquiryStatus = {
  NEW: 'NEW',
  IN_PROGRESS: 'IN_PROGRESS',
  RESOLVED: 'RESOLVED',
} as const;
export type InquiryStatus = (typeof InquiryStatus)[keyof typeof InquiryStatus];

export const ApplicationStatus = {
  NEW: 'NEW',
  REVIEWING: 'REVIEWING',
  SHORTLISTED: 'SHORTLISTED',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
} as const;
export type ApplicationStatus = (typeof ApplicationStatus)[keyof typeof ApplicationStatus];

export const PostStatus = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
} as const;
export type PostStatus = (typeof PostStatus)[keyof typeof PostStatus];

export const INQUIRY_KIND_LABELS: Record<InquiryKind, string> = {
  CONTACT: 'Contact Us',
  ENQUIRY: 'Puja enquiry',
  WHATSAPP: 'WhatsApp',
};

export const INQUIRY_STATUS_LABELS: Record<InquiryStatus, string> = {
  NEW: 'New',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  NEW: 'New',
  REVIEWING: 'Reviewing',
  SHORTLISTED: 'Shortlisted',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

/* ----------------------------- Types ----------------------------- */

export interface Inquiry {
  id: string;
  kind: InquiryKind;
  status: InquiryStatus;
  name: string;
  email?: string | null;
  phone: string;
  subject: string;
  message: string;
  pujaSlug: string;
  pujaTitle: string;
  preferredDate?: string | null;
  city: string;
  adminNotes: string;
  createdAt: string;
}

export interface PanditApplication {
  id: string;
  status: ApplicationStatus;
  fullName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  pincode: string;
  experienceYears: number;
  specializations: string[];
  languages: string[];
  lineage: string;
  about: string;
  documentUrl?: string | null;
  adminNotes: string;
  panditUserId?: string | null;
  createdAt: string;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  body: string;
  coverImageUrl?: string | null;
  authorName: string;
  category: string;
  tags: string[];
  status: PostStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

/* ----------------------------- Public writes ----------------------------- */

/** Contact Us. Deliberately short — anything longer belongs in the message. */
export const createContactSchema = z.object({
  name: z.string().trim().min(2, 'Tell us your name').max(120),
  email: emailSchema.optional().or(z.literal('')),
  phone: phoneSchema,
  subject: z.string().trim().max(200).optional().default(''),
  message: z.string().trim().min(10, 'Please add a little more detail').max(4000),
});
export type CreateContactInput = z.infer<typeof createContactSchema>;

/** The puja enquiry form: same inbox, extra ritual context. */
export const createEnquirySchema = createContactSchema.extend({
  pujaSlug: z.string().trim().max(200).optional().default(''),
  pujaTitle: z.string().trim().max(200).optional().default(''),
  preferredDate: z.coerce.date().optional(),
  city: z.string().trim().max(120).optional().default(''),
});
export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;

export const createPanditApplicationSchema = z.object({
  fullName: z.string().trim().min(2, 'Tell us your full name').max(120),
  email: emailSchema,
  phone: phoneSchema,
  city: z.string().trim().min(2, 'Which city do you serve?').max(120),
  state: z.string().trim().max(120).optional().default(''),
  pincode: z
    .string()
    .regex(/^\d{6}$/, 'Pincode must be 6 digits')
    .optional()
    .or(z.literal('')),
  experienceYears: z.number().int().min(0).max(80).default(0),
  specializations: z.array(z.string().trim().min(1)).max(30).default([]),
  languages: z.array(z.string().trim().min(1)).max(20).default([]),
  lineage: z.string().trim().max(500).optional().default(''),
  about: z.string().trim().max(4000).optional().default(''),
  documentUrl: z.string().trim().max(500).optional().or(z.literal('')),
});
export type CreatePanditApplicationInput = z.infer<typeof createPanditApplicationSchema>;

/**
 * A WhatsApp booking intent.
 *
 * Recorded only for signed-in devotees — for anyone else we have no way to
 * follow up, and an inbox full of contactless clicks would bury the messages
 * that can actually be answered. See apps/api/src/content/whatsapp.controller.ts.
 */
export const createWhatsappLeadSchema = z.object({
  context: z.enum(['general', 'puja', 'product', 'live']).default('general'),
  title: z.string().trim().max(200).optional().default(''),
  packageName: z.string().trim().max(160).optional().default(''),
  price: z.string().trim().max(40).optional().default(''),
  pujaSlug: z.string().trim().max(200).optional().default(''),
  url: z.string().trim().max(500).optional().default(''),
});
export type CreateWhatsappLeadInput = z.infer<typeof createWhatsappLeadSchema>;

/* ----------------------------- Admin writes ----------------------------- */

export const updateInquirySchema = z.object({
  status: z.enum([InquiryStatus.NEW, InquiryStatus.IN_PROGRESS, InquiryStatus.RESOLVED]).optional(),
  adminNotes: z.string().trim().max(4000).optional(),
});
export type UpdateInquiryInput = z.infer<typeof updateInquirySchema>;

export const updatePanditApplicationSchema = z.object({
  status: z
    .enum([
      ApplicationStatus.NEW,
      ApplicationStatus.REVIEWING,
      ApplicationStatus.SHORTLISTED,
      ApplicationStatus.APPROVED,
      ApplicationStatus.REJECTED,
    ])
    .optional(),
  adminNotes: z.string().trim().max(4000).optional(),
});
export type UpdatePanditApplicationInput = z.infer<typeof updatePanditApplicationSchema>;

export const createBlogPostSchema = z.object({
  title: z.string().trim().min(3, 'Give the post a title').max(200),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase words separated by hyphens'),
  excerpt: z.string().trim().max(500).optional().default(''),
  body: z.string().trim().max(60000).optional().default(''),
  coverImageUrl: z
    .string()
    .trim()
    .refine(
      (value) => !value || value.startsWith('/') || z.string().url().safeParse(value).success,
      'Enter a valid URL or a local image path',
    )
    .optional()
    .or(z.literal('')),
  authorName: z.string().trim().min(2).max(120).default('Poozari'),
  category: z.string().trim().min(2).max(80).default('Guides'),
  tags: z.array(z.string().trim().min(1)).max(20).default([]),
  status: z.enum([PostStatus.DRAFT, PostStatus.PUBLISHED]).default(PostStatus.DRAFT),
});
export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;

export const updateBlogPostSchema = createBlogPostSchema.partial();
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;

/* ----------------------------- Helpers ----------------------------- */

/** Rough reading time for a post body, at ~200 words a minute. */
export function readingMinutes(body: string): number {
  const words = body.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
