import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CreateLiveSessionInput,
  LiveCaption,
  UpdateLiveSessionInput,
} from '@poozari/shared';
import { LiveAccessStatus, LiveSessionStatus } from '@poozari/shared';
import { PaymentGatewayService } from '../payments/payment-gateway.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  liveInclude,
  serializeLiveAccess,
  serializeLiveCaption,
  serializeLiveSession,
} from './live.serializer';

@Injectable()
export class LiveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PaymentGatewayService,
  ) {}

  /* ------------------------------ Public ------------------------------ */

  async listPublic(status?: 'live' | 'upcoming' | 'ended') {
    const where: any = {};
    if (status === 'live') where.status = LiveSessionStatus.LIVE;
    else if (status === 'upcoming') where.status = LiveSessionStatus.SCHEDULED;
    else if (status === 'ended') where.status = LiveSessionStatus.ENDED;
    const sessions = await this.prisma.liveSession.findMany({
      where,
      include: liveInclude,
      orderBy: [{ status: 'asc' }, { scheduledAt: 'desc' }],
    });
    // Public listing never exposes playbackUrl.
    return sessions.map((s) => serializeLiveSession(s, { includePlayback: false }));
  }

  /** Public view of one session. playbackUrl only when the customer has paid. */
  async getPublic(id: string, customerId?: string) {
    const session = await this.prisma.liveSession.findUnique({
      where: { id },
      include: liveInclude,
    });
    if (!session) throw new NotFoundException('Live session not found');

    let hasAccess = false;
    if (customerId) {
      const access = await this.prisma.liveAccess.findUnique({
        where: { liveSessionId_customerId: { liveSessionId: id, customerId } },
      });
      hasAccess = access?.status === LiveAccessStatus.PAID;
    }
    // Only reveal the stream when it's actually live and the viewer paid.
    const includePlayback = hasAccess && session.status === LiveSessionStatus.LIVE;
    return serializeLiveSession(session, { includePlayback });
  }

  /* ----------------------------- Customer ----------------------------- */

  async createOrder(customerId: string, liveSessionId: string) {
    const session = await this.prisma.liveSession.findUnique({ where: { id: liveSessionId } });
    if (!session) throw new NotFoundException('Live session not found');
    if (session.status === LiveSessionStatus.ENDED) {
      throw new BadRequestException('This live darshan has ended');
    }

    // Idempotent: reuse an existing PAID ticket, else create/reuse a CREATED one.
    const existing = await this.prisma.liveAccess.findUnique({
      where: { liveSessionId_customerId: { liveSessionId, customerId } },
    });
    if (existing?.status === LiveAccessStatus.PAID) {
      throw new BadRequestException('You already have access to this live darshan');
    }

    const order = await this.gateway.createOrder(
      session.joinPriceInr,
      `live_${session.id}`,
      `order_dev_live_${session.id}_${customerId.slice(-6)}`,
    );

    const access = existing
      ? await this.prisma.liveAccess.update({
          where: { id: existing.id },
          data: { razorpayOrderId: order.orderId, amountInr: session.joinPriceInr },
        })
      : await this.prisma.liveAccess.create({
          data: {
            liveSessionId,
            customerId,
            amountInr: session.joinPriceInr,
            status: LiveAccessStatus.CREATED,
            razorpayOrderId: order.orderId,
          },
        });

    return { ...order, accessId: access.id };
  }

  async verifyAccess(
    customerId: string,
    liveSessionId: string,
    data: {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    },
  ) {
    const access = await this.prisma.liveAccess.findUnique({
      where: { liveSessionId_customerId: { liveSessionId, customerId } },
    });
    if (!access) throw new NotFoundException('No pending order for this live darshan');
    if (access.status === LiveAccessStatus.PAID) return serializeLiveAccess(access);

    if (!this.gateway.verifySignature(data)) {
      throw new BadRequestException('Payment signature verification failed');
    }

    const updated = await this.prisma.liveAccess.update({
      where: { id: access.id },
      data: {
        status: LiveAccessStatus.PAID,
        razorpayPaymentId: data.razorpay_payment_id ?? `pay_dev_live_${access.id}`,
        razorpaySignature: data.razorpay_signature ?? 'dev',
      },
    });
    return serializeLiveAccess(updated);
  }

  async myAccess(customerId: string) {
    const rows = await this.prisma.liveAccess.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(serializeLiveAccess);
  }

  /* ------------------------------- Admin ------------------------------- */

  async adminList() {
    const sessions = await this.prisma.liveSession.findMany({
      include: liveInclude,
      orderBy: { createdAt: 'desc' },
    });
    // Staff see playbackUrl for moderation.
    return sessions.map((s) => serializeLiveSession(s, { includePlayback: true }));
  }

  async adminCreate(input: CreateLiveSessionInput) {
    const session = await this.prisma.liveSession.create({
      data: {
        title: input.title,
        description: input.description ?? '',
        thumbnailUrl: input.thumbnailUrl,
        joinPriceInr: input.joinPriceInr,
        scheduledAt: input.scheduledAt,
        pujaId: input.pujaId,
        panditId: input.panditId,
        playbackUrl: input.playbackUrl,
        status: LiveSessionStatus.SCHEDULED,
      },
      include: liveInclude,
    });
    return serializeLiveSession(session, { includePlayback: true });
  }

  async adminUpdate(id: string, input: UpdateLiveSessionInput) {
    await this.mustGet(id);
    const session = await this.prisma.liveSession.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.thumbnailUrl !== undefined ? { thumbnailUrl: input.thumbnailUrl } : {}),
        ...(input.joinPriceInr !== undefined ? { joinPriceInr: input.joinPriceInr } : {}),
        ...(input.scheduledAt !== undefined ? { scheduledAt: input.scheduledAt } : {}),
        ...(input.pujaId !== undefined ? { pujaId: input.pujaId } : {}),
        ...(input.panditId !== undefined ? { panditId: input.panditId } : {}),
        ...(input.playbackUrl !== undefined ? { playbackUrl: input.playbackUrl } : {}),
      },
      include: liveInclude,
    });
    return serializeLiveSession(session, { includePlayback: true });
  }

  /* --------------------------- Go-live / End --------------------------- */

  async goLive(id: string, actor: { role: 'admin' } | { role: 'pandit'; userId: string }, playbackUrl?: string) {
    const session = await this.mustGet(id);
    if (actor.role === 'pandit') await this.assertOwnsSession(actor.userId, id);
    if (session.status === LiveSessionStatus.ENDED) {
      throw new BadRequestException('This session has already ended');
    }
    const url = playbackUrl ?? session.playbackUrl;
    if (!url) {
      throw new BadRequestException('A playback URL is required to go live');
    }
    const updated = await this.prisma.liveSession.update({
      where: { id },
      data: {
        status: LiveSessionStatus.LIVE,
        startedAt: session.startedAt ?? new Date(),
        playbackUrl: url,
      },
      include: liveInclude,
    });
    return serializeLiveSession(updated, { includePlayback: true });
  }

  async endLive(id: string, actor: { role: 'admin' } | { role: 'pandit'; userId: string }) {
    const session = await this.mustGet(id);
    if (actor.role === 'pandit') await this.assertOwnsSession(actor.userId, id);
    if (session.status !== LiveSessionStatus.LIVE) {
      throw new BadRequestException('Only a live session can be ended');
    }
    const updated = await this.prisma.liveSession.update({
      where: { id },
      data: { status: LiveSessionStatus.ENDED, endedAt: new Date() },
      include: liveInclude,
    });
    return serializeLiveSession(updated, { includePlayback: true });
  }

  /* ------------------------------ Captions ----------------------------- */

  /** The current (most recently pushed) caption for a session, or null. */
  async getCurrentCaption(id: string) {
    await this.mustGet(id);
    const caption = await this.prisma.liveCaption.findFirst({
      where: { liveSessionId: id },
      orderBy: { seq: 'desc' },
    });
    return caption ? serializeLiveCaption(caption) : null;
  }

  /** Push a caption; it becomes the current one. Pandits may only caption their own sessions. */
  async pushCaption(
    id: string,
    translations: LiveCaption['translations'],
    actor: { role: 'admin' } | { role: 'pandit'; userId: string },
  ) {
    const session = await this.mustGet(id);
    if (actor.role === 'pandit') await this.assertOwnsSession(actor.userId, id);
    if (session.status === LiveSessionStatus.ENDED) {
      throw new BadRequestException('This live darshan has ended');
    }
    const last = await this.prisma.liveCaption.findFirst({
      where: { liveSessionId: id },
      orderBy: { seq: 'desc' },
      select: { seq: true },
    });
    const caption = await this.prisma.liveCaption.create({
      data: {
        liveSessionId: id,
        seq: (last?.seq ?? 0) + 1,
        translations: translations as object,
      },
    });
    return serializeLiveCaption(caption);
  }

  /* ------------------------------- Pandit ------------------------------ */

  async panditList(userId: string) {
    const panditId = await this.panditProfileId(userId);
    const sessions = await this.prisma.liveSession.findMany({
      where: { panditId },
      include: liveInclude,
      orderBy: { scheduledAt: 'desc' },
    });
    return sessions.map((s) => serializeLiveSession(s, { includePlayback: true }));
  }

  /* ------------------------------ Helpers ------------------------------ */

  private async mustGet(id: string) {
    const session = await this.prisma.liveSession.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Live session not found');
    return session;
  }

  private async panditProfileId(userId: string): Promise<string> {
    const profile = await this.prisma.panditProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Pandit profile not found');
    return profile.id;
  }

  private async assertOwnsSession(userId: string, sessionId: string) {
    const panditId = await this.panditProfileId(userId);
    const session = await this.mustGet(sessionId);
    if (session.panditId !== panditId) {
      throw new ForbiddenException('This live session is not assigned to you');
    }
  }
}
