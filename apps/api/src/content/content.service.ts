import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InquiryKind,
  PostStatus,
  type BlogPost,
  type CreateBlogPostInput,
  type CreateContactInput,
  type CreateEnquiryInput,
  type CreatePanditApplicationInput,
  type CreateWhatsappLeadInput,
  type Inquiry,
  type PanditApplication,
  type UpdateBlogPostInput,
  type UpdateInquiryInput,
  type UpdatePanditApplicationInput,
} from '@poozari/shared';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { applicationNotification, inquiryNotification } from '../email/email.templates';
import { PrismaService } from '../prisma/prisma.service';

function serializeInquiry(row: any): Inquiry {
  return {
    id: row.id,
    kind: row.kind,
    status: row.status,
    name: row.name,
    email: row.email,
    phone: row.phone,
    subject: row.subject,
    message: row.message,
    pujaSlug: row.pujaSlug,
    pujaTitle: row.pujaTitle,
    preferredDate: row.preferredDate ? row.preferredDate.toISOString() : null,
    city: row.city,
    adminNotes: row.adminNotes,
    createdAt: row.createdAt.toISOString(),
  };
}

function serializeApplication(row: any): PanditApplication {
  return {
    id: row.id,
    status: row.status,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    experienceYears: row.experienceYears,
    specializations: row.specializations,
    languages: row.languages,
    lineage: row.lineage,
    about: row.about,
    documentUrl: row.documentUrl,
    adminNotes: row.adminNotes,
    panditUserId: row.panditUserId,
    createdAt: row.createdAt.toISOString(),
  };
}

function serializePost(row: any): BlogPost {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    coverImageUrl: row.coverImageUrl,
    authorName: row.authorName,
    category: row.category,
    tags: row.tags,
    status: row.status,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * Backs the site's content pages: the blog, the Contact Us and puja Enquiry
 * inbox, and "Become a Pujari" applications.
 *
 * Everything a visitor submits lands in a table an admin works through — no
 * submission is only emailed, so nothing is lost if a mailbox is missed.
 */
@Injectable()
export class ContentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
    private readonly config: ConfigService,
  ) {}

  /** Deep link into the admin panel, for the notification emails. */
  private adminUrl(path: string): string {
    const base = (this.config.get<string>('WEB_BASE_URL') ?? 'http://localhost:3000').replace(
      /\/$/,
      '',
    );
    return `${base}${path}`;
  }

  /**
   * Email the team about something a visitor submitted.
   *
   * Deliberately not awaited by callers: the submission is already saved, and
   * a mail server hiccup must not turn a captured enquiry into an error page.
   */
  private notify(message: { subject: string; text: string; replyTo?: string }) {
    const to = this.email.notifyAddress;
    if (!to) return;
    void this.email.send({ to, ...message });
  }

  /* --------------------------------------------------------------- Blog */

  /** Public list: published posts, newest first. */
  async listPublishedPosts(category?: string): Promise<BlogPost[]> {
    const posts = await this.prisma.blogPost.findMany({
      where: {
        status: PostStatus.PUBLISHED,
        ...(category ? { category } : {}),
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
    return posts.map(serializePost);
  }

  async getPublishedPost(slug: string): Promise<BlogPost> {
    const post = await this.prisma.blogPost.findFirst({
      where: { slug, status: PostStatus.PUBLISHED },
    });
    if (!post) throw new NotFoundException('Post not found');
    return serializePost(post);
  }

  /** Categories that actually have published posts, for the blog filter. */
  async listPostCategories(): Promise<string[]> {
    const rows = await this.prisma.blogPost.findMany({
      where: { status: PostStatus.PUBLISHED },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return rows.map((row) => row.category);
  }

  async listAllPosts(): Promise<BlogPost[]> {
    const posts = await this.prisma.blogPost.findMany({
      orderBy: [{ updatedAt: 'desc' }],
    });
    return posts.map(serializePost);
  }

  async createPost(input: CreateBlogPostInput): Promise<BlogPost> {
    try {
      const post = await this.prisma.blogPost.create({
        data: {
          ...input,
          coverImageUrl: input.coverImageUrl || null,
          // Publishing stamps the date; a draft has none.
          publishedAt: input.status === PostStatus.PUBLISHED ? new Date() : null,
        },
      });
      return serializePost(post);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException('A post with this slug already exists');
      }
      throw error;
    }
  }

  async updatePost(id: string, input: UpdateBlogPostInput): Promise<BlogPost> {
    const existing = await this.prisma.blogPost.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Post not found');

    // First publish stamps the date. Later edits keep the original date, and
    // moving back to draft clears it.
    let publishedAt = existing.publishedAt;
    if (input.status === PostStatus.PUBLISHED && !existing.publishedAt) publishedAt = new Date();
    if (input.status === PostStatus.DRAFT) publishedAt = null;

    try {
      const post = await this.prisma.blogPost.update({
        where: { id },
        data: {
          ...input,
          ...(input.coverImageUrl !== undefined
            ? { coverImageUrl: input.coverImageUrl || null }
            : {}),
          publishedAt,
        },
      });
      return serializePost(post);
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new BadRequestException('A post with this slug already exists');
      }
      throw error;
    }
  }

  async deletePost(id: string) {
    try {
      await this.prisma.blogPost.delete({ where: { id } });
      return { ok: true as const };
    } catch {
      throw new NotFoundException('Post not found');
    }
  }

  /* ---------------------------------------------------------- Inquiries */

  async createContact(input: CreateContactInput): Promise<{ ok: true; id: string }> {
    const row = await this.prisma.inquiry.create({
      data: {
        kind: InquiryKind.CONTACT,
        name: input.name,
        email: input.email || null,
        phone: input.phone,
        subject: input.subject,
        message: input.message,
      },
    });
    this.notify(
      inquiryNotification({
        kind: 'Contact Us',
        name: input.name,
        phone: input.phone,
        email: input.email || null,
        subject: input.subject,
        message: input.message,
        adminUrl: this.adminUrl('/admin/inbox'),
      }),
    );
    return { ok: true, id: row.id };
  }

  async createEnquiry(input: CreateEnquiryInput): Promise<{ ok: true; id: string }> {
    const row = await this.prisma.inquiry.create({
      data: {
        kind: InquiryKind.ENQUIRY,
        name: input.name,
        email: input.email || null,
        phone: input.phone,
        subject: input.subject,
        message: input.message,
        pujaSlug: input.pujaSlug,
        pujaTitle: input.pujaTitle,
        preferredDate: input.preferredDate ?? null,
        city: input.city,
      },
    });
    this.notify(
      inquiryNotification({
        kind: 'Puja enquiry',
        name: input.name,
        phone: input.phone,
        email: input.email || null,
        subject: input.subject,
        message: input.message,
        pujaTitle: input.pujaTitle,
        city: input.city,
        preferredDate: input.preferredDate ?? null,
        adminUrl: this.adminUrl('/admin/inbox'),
      }),
    );
    return { ok: true, id: row.id };
  }

  /**
   * Log a signed-in devotee's WhatsApp booking intent so the team has a
   * follow-up list even when the customer never sends the message.
   */
  async createWhatsappLead(
    user: { sub: string; name: string; email?: string | null; phone?: string | null },
    input: CreateWhatsappLeadInput,
  ): Promise<{ ok: true; id: string }> {
    const what = input.title || 'a puja';
    const lines = [
      `Started a WhatsApp booking for: ${what}`,
      input.packageName ? `Package: ${input.packageName}` : null,
      input.price ? `Price shown: ${input.price}` : null,
      input.url ? `From: ${input.url}` : null,
      'This is a click on "Book on WhatsApp" — the devotee may not have sent the message yet.',
    ].filter(Boolean);

    const row = await this.prisma.inquiry.create({
      data: {
        kind: InquiryKind.WHATSAPP,
        name: user.name,
        email: user.email ?? null,
        // A signed-in customer always has a phone: that is how they logged in.
        phone: user.phone ?? '',
        subject: `WhatsApp: ${what}`,
        message: lines.join('\n'),
        pujaSlug: input.pujaSlug,
        pujaTitle: input.context === 'puja' ? input.title : '',
      },
    });
    return { ok: true, id: row.id };
  }

  async listInquiries(filter: { kind?: string; status?: string } = {}): Promise<Inquiry[]> {
    const rows = await this.prisma.inquiry.findMany({
      where: {
        ...(filter.kind ? { kind: filter.kind as any } : {}),
        ...(filter.status ? { status: filter.status as any } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(serializeInquiry);
  }

  async updateInquiry(id: string, input: UpdateInquiryInput): Promise<Inquiry> {
    try {
      const row = await this.prisma.inquiry.update({ where: { id }, data: input });
      return serializeInquiry(row);
    } catch {
      throw new NotFoundException('Enquiry not found');
    }
  }

  /* -------------------------------------------------------- Applications */

  async createApplication(
    input: CreatePanditApplicationInput,
  ): Promise<{ ok: true; id: string }> {
    const row = await this.prisma.panditApplication.create({
      data: {
        ...input,
        pincode: input.pincode || '',
        documentUrl: input.documentUrl || null,
      },
    });
    this.notify(
      applicationNotification({
        fullName: input.fullName,
        email: input.email,
        phone: input.phone,
        city: input.city,
        experienceYears: input.experienceYears,
        specializations: input.specializations,
        lineage: input.lineage,
        adminUrl: this.adminUrl('/admin/applications'),
      }),
    );
    return { ok: true, id: row.id };
  }

  async listApplications(status?: string): Promise<PanditApplication[]> {
    const rows = await this.prisma.panditApplication.findMany({
      where: status ? { status: status as any } : {},
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(serializeApplication);
  }

  async updateApplication(
    id: string,
    input: UpdatePanditApplicationInput,
  ): Promise<PanditApplication> {
    try {
      const row = await this.prisma.panditApplication.update({ where: { id }, data: input });
      return serializeApplication(row);
    } catch {
      throw new NotFoundException('Application not found');
    }
  }

  /** Counts for the admin dashboard's attention badges. */
  async pendingCounts() {
    const [newInquiries, newApplications, draftPosts] = await Promise.all([
      this.prisma.inquiry.count({ where: { status: 'NEW' } }),
      this.prisma.panditApplication.count({ where: { status: 'NEW' } }),
      this.prisma.blogPost.count({ where: { status: PostStatus.DRAFT } }),
    ]);
    return { newInquiries, newApplications, draftPosts };
  }
}
