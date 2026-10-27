import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import {
  BookingStatus,
  DEFAULT_PANDIT_COMMISSION_PERCENT,
  EarningStatus,
  PaymentStatus,
  SettlementStatus,
  type AdminPanditOverview,
  type PanditEarning,
  type PanditEarningsSummary,
  type PaymentFilters,
  type PaymentLedgerRow,
  type PaymentsSummary,
  type Settlement,
} from '@poozari/shared';
import { PrismaService } from '../prisma/prisma.service';

const COMMISSION_KEY = 'pandit_commission_percent';
const DAY_MS = 24 * 60 * 60 * 1000;
/** The business runs on Indian time; day and week boundaries follow IST. */
const IST_OFFSET_MS = 330 * 60 * 1000;
const LEDGER_LIMIT = 500;

/** Midnight IST at the start of a YYYY-MM-DD day. */
function istDayStart(day: string): Date {
  const date = new Date(`${day}T00:00:00+05:30`);
  if (Number.isNaN(date.getTime())) throw new BadRequestException(`Invalid date: ${day}`);
  return date;
}

/** Inclusive `from`/`to` days as a half-open [gte, lt) range. */
function dayRange(from?: string, to?: string): Prisma.DateTimeFilter | undefined {
  if (!from && !to) return undefined;
  const range: Prisma.DateTimeFilter = {};
  if (from) range.gte = istDayStart(from);
  if (to) range.lt = new Date(istDayStart(to).getTime() + DAY_MS);
  return range;
}

const earningInclude = {
  booking: { select: { reference: true, devoteeName: true, puja: { select: { title: true } } } },
  pandit: { select: { displayName: true } },
} as const;

function serializeEarning(e: any): PanditEarning {
  return {
    id: e.id,
    bookingId: e.bookingId,
    bookingReference: e.booking?.reference ?? '',
    pujaTitle: e.booking?.puja?.title ?? '',
    devoteeName: e.booking?.devoteeName ?? '',
    panditId: e.panditId,
    panditName: e.pandit?.displayName ?? '',
    bookingAmountInr: e.bookingAmountInr,
    percent: e.percent,
    earningInr: e.earningInr,
    status: e.status,
    settlementId: e.settlementId ?? null,
    createdAt: e.createdAt.toISOString(),
  };
}

const settlementInclude = {
  pandit: { select: { displayName: true } },
  _count: { select: { earnings: true } },
} as const;

function serializeSettlement(s: any): Settlement {
  return {
    id: s.id,
    panditId: s.panditId,
    panditName: s.pandit?.displayName ?? '',
    periodStart: s.periodStart.toISOString(),
    periodEnd: s.periodEnd.toISOString(),
    totalInr: s.totalInr,
    status: s.status,
    paidAt: s.paidAt ? s.paidAt.toISOString() : null,
    reference: s.reference,
    notes: s.notes,
    earningsCount: s._count?.earnings ?? 0,
    createdAt: s.createdAt.toISOString(),
  };
}

@Injectable()
export class EarningsService {
  constructor(private readonly prisma: PrismaService) {}

  /* ------------------------------------------------------------ Commission */

  async getCommissionPercent(): Promise<number> {
    const row = await this.prisma.platformSetting.findUnique({ where: { key: COMMISSION_KEY } });
    const value = row ? Number.parseInt(row.value, 10) : NaN;
    return Number.isFinite(value) ? value : DEFAULT_PANDIT_COMMISSION_PERCENT;
  }

  async setCommissionPercent(percent: number) {
    await this.prisma.platformSetting.upsert({
      where: { key: COMMISSION_KEY },
      update: { value: String(percent) },
      create: { key: COMMISSION_KEY, value: String(percent) },
    });
    return { percent };
  }

  /* -------------------------------------------------------------- Earnings */

  /**
   * Record the assigned pandit's share once a booking is completed. Safe to
   * call repeatedly: the unique bookingId makes it a no-op after the first.
   */
  async recordCompletion(bookingId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id: bookingId },
      include: { assignment: { include: { pandit: true } }, earning: true },
    });
    if (!booking || booking.status !== BookingStatus.COMPLETED || !booking.assignment) return null;
    if (booking.earning) return booking.earning;

    const percent =
      booking.assignment.pandit.commissionPercent ?? (await this.getCommissionPercent());
    try {
      return await this.prisma.panditEarning.create({
        data: {
          bookingId,
          panditId: booking.assignment.panditId,
          bookingAmountInr: booking.amountInr,
          percent,
          earningInr: Math.round((booking.amountInr * percent) / 100),
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        return this.prisma.panditEarning.findUnique({ where: { bookingId } });
      }
      throw err;
    }
  }

  /* ------------------------------------------------------- Admin: ledger */

  async listPayments(tab: string | undefined, filters: PaymentFilters): Promise<PaymentLedgerRow[]> {
    const where: Prisma.BookingWhereInput = { createdAt: dayRange(filters.from, filters.to) };
    if (filters.panditId) where.assignment = { panditId: filters.panditId };
    switch (tab) {
      case 'received':
        where.payment = { status: PaymentStatus.PAID };
        break;
      case 'pending':
        where.status = BookingStatus.PENDING_PAYMENT;
        break;
      case 'pandit_paid':
        where.earning = { status: EarningStatus.PAID };
        break;
    }
    const rows = await this.prisma.booking.findMany({
      where,
      include: {
        puja: { select: { title: true } },
        payment: true,
        assignment: { include: { pandit: { select: { displayName: true } } } },
        earning: true,
      },
      orderBy: { createdAt: 'desc' },
      take: LEDGER_LIMIT,
    });
    return rows.map((b) => ({
      bookingId: b.id,
      reference: b.reference,
      pujaTitle: b.puja.title,
      devoteeName: b.devoteeName,
      bookingStatus: b.status,
      paymentStatus: b.payment?.status ?? null,
      amountInr: b.amountInr,
      createdAt: b.createdAt.toISOString(),
      paidAt:
        b.payment?.status === PaymentStatus.PAID ? b.payment.updatedAt.toISOString() : null,
      panditId: b.assignment?.panditId ?? null,
      panditName: b.assignment?.pandit.displayName ?? null,
      earningInr: b.earning?.earningInr ?? null,
      earningPercent: b.earning?.percent ?? null,
      earningStatus: b.earning?.status ?? null,
      platformShareInr: b.earning ? b.earning.bookingAmountInr - b.earning.earningInr : null,
    }));
  }

  async paymentsSummary(filters: PaymentFilters): Promise<PaymentsSummary> {
    const createdAt = dayRange(filters.from, filters.to);
    const bookingWhere: Prisma.BookingWhereInput = { createdAt };
    if (filters.panditId) bookingWhere.assignment = { panditId: filters.panditId };
    const earningWhere: Prisma.PanditEarningWhereInput = {
      createdAt,
      ...(filters.panditId ? { panditId: filters.panditId } : {}),
    };

    const [received, pending, earningsByStatus] = await Promise.all([
      this.prisma.payment.aggregate({
        _sum: { amountInr: true },
        where: { status: PaymentStatus.PAID, booking: bookingWhere },
      }),
      this.prisma.booking.aggregate({
        _sum: { amountInr: true },
        where: { ...bookingWhere, status: BookingStatus.PENDING_PAYMENT },
      }),
      this.prisma.panditEarning.groupBy({
        by: ['status'],
        _sum: { earningInr: true, bookingAmountInr: true },
        where: earningWhere,
      }),
    ]);

    let pujariPayablePendingInr = 0;
    let paidToPujarisInr = 0;
    let platformShareInr = 0;
    for (const g of earningsByStatus) {
      const earning = g._sum.earningInr ?? 0;
      platformShareInr += (g._sum.bookingAmountInr ?? 0) - earning;
      if (g.status === EarningStatus.PAID) paidToPujarisInr += earning;
      else pujariPayablePendingInr += earning;
    }
    return {
      receivedInr: received._sum.amountInr ?? 0,
      pendingCustomerInr: pending._sum.amountInr ?? 0,
      pujariPayablePendingInr,
      paidToPujarisInr,
      platformShareInr,
    };
  }

  /* -------------------------------------------------- Admin: settlements */

  async listSettlements(filters: { status?: string; panditId?: string }): Promise<Settlement[]> {
    const rows = await this.prisma.settlement.findMany({
      where: {
        ...(filters.status ? { status: filters.status as SettlementStatus } : {}),
        ...(filters.panditId ? { panditId: filters.panditId } : {}),
      },
      include: settlementInclude,
      orderBy: [{ periodStart: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(serializeSettlement);
  }

  /**
   * Group a Monday–Sunday week's unsettled earnings into one PENDING
   * settlement per pandit. Earnings already in a settlement are skipped, so
   * running it again only picks up late completions.
   */
  async generateWeekly(weekStart: string): Promise<Settlement[]> {
    const start = istDayStart(weekStart);
    if (new Date(start.getTime() + IST_OFFSET_MS).getUTCDay() !== 1) {
      throw new BadRequestException('weekStart must be a Monday');
    }
    const end = new Date(start.getTime() + 7 * DAY_MS);

    const earnings = await this.prisma.panditEarning.findMany({
      where: {
        settlementId: null,
        status: EarningStatus.PENDING,
        createdAt: { gte: start, lt: end },
      },
      select: { id: true, panditId: true, earningInr: true },
    });
    const byPandit = new Map<string, { ids: string[]; total: number }>();
    for (const e of earnings) {
      const group = byPandit.get(e.panditId) ?? { ids: [], total: 0 };
      group.ids.push(e.id);
      group.total += e.earningInr;
      byPandit.set(e.panditId, group);
    }

    const createdIds: string[] = [];
    for (const [panditId, group] of byPandit) {
      const id = await this.prisma.$transaction(async (tx) => {
        const settlement = await tx.settlement.create({
          data: {
            panditId,
            periodStart: start,
            periodEnd: new Date(end.getTime() - 1),
            totalInr: 0,
          },
        });
        // Claim only earnings still unsettled, then total what was claimed,
        // so a concurrent run cannot double-count an earning.
        await tx.panditEarning.updateMany({
          where: { id: { in: group.ids }, settlementId: null },
          data: { settlementId: settlement.id },
        });
        const claimed = await tx.panditEarning.aggregate({
          _sum: { earningInr: true },
          _count: true,
          where: { settlementId: settlement.id },
        });
        if (claimed._count === 0) {
          await tx.settlement.delete({ where: { id: settlement.id } });
          return null;
        }
        await tx.settlement.update({
          where: { id: settlement.id },
          data: { totalInr: claimed._sum.earningInr ?? 0 },
        });
        return settlement.id;
      });
      if (id) createdIds.push(id);
    }

    const rows = await this.prisma.settlement.findMany({
      where: { id: { in: createdIds } },
      include: settlementInclude,
      orderBy: { totalInr: 'desc' },
    });
    return rows.map(serializeSettlement);
  }

  async markSettlementPaid(id: string, input: { reference?: string; notes?: string }) {
    const settlement = await this.prisma.settlement.findUnique({ where: { id } });
    if (!settlement) throw new NotFoundException('Settlement not found');
    if (settlement.status === SettlementStatus.PAID) {
      throw new BadRequestException('Settlement is already marked paid');
    }
    await this.prisma.$transaction([
      this.prisma.settlement.update({
        where: { id },
        data: {
          status: SettlementStatus.PAID,
          paidAt: new Date(),
          reference: input.reference ?? '',
          notes: input.notes ?? '',
        },
      }),
      this.prisma.panditEarning.updateMany({
        where: { settlementId: id },
        data: { status: EarningStatus.PAID },
      }),
    ]);
    const row = await this.prisma.settlement.findUnique({
      where: { id },
      include: settlementInclude,
    });
    return serializeSettlement(row);
  }

  /* -------------------------------------------------------- Pandit portal */

  private async panditIdFor(userId: string) {
    const profile = await this.prisma.panditProfile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Pandit profile not found');
    return profile.id;
  }

  async panditEarnings(userId: string, from?: string, to?: string): Promise<PanditEarning[]> {
    const panditId = await this.panditIdFor(userId);
    const rows = await this.prisma.panditEarning.findMany({
      where: { panditId, createdAt: dayRange(from, to) },
      include: earningInclude,
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(serializeEarning);
  }

  async panditSummary(userId: string, from?: string, to?: string): Promise<PanditEarningsSummary> {
    return this.summaryForPandit(await this.panditIdFor(userId), from, to);
  }

  private async summaryForPandit(
    panditId: string,
    from?: string,
    to?: string,
  ): Promise<PanditEarningsSummary> {
    const groups = await this.prisma.panditEarning.groupBy({
      by: ['status'],
      _sum: { earningInr: true },
      _count: true,
      where: { panditId, createdAt: dayRange(from, to) },
    });
    const summary: PanditEarningsSummary = {
      completedPujas: 0,
      totalEarningsInr: 0,
      paidInr: 0,
      pendingInr: 0,
    };
    for (const g of groups) {
      const amount = g._sum.earningInr ?? 0;
      summary.completedPujas += g._count;
      summary.totalEarningsInr += amount;
      if (g.status === EarningStatus.PAID) summary.paidInr += amount;
      else summary.pendingInr += amount;
    }
    return summary;
  }

  async panditSettlements(userId: string): Promise<Settlement[]> {
    const panditId = await this.panditIdFor(userId);
    return this.listSettlements({ panditId });
  }

  /* ------------------------------------------------ Admin: pandit overview */

  async adminPanditOverview(panditId: string): Promise<AdminPanditOverview> {
    const profile = await this.prisma.panditProfile.findUnique({
      where: { id: panditId },
      include: { user: { select: { email: true } } },
    });
    if (!profile) throw new NotFoundException('Pandit not found');

    const assignedTo = { assignment: { panditId } };
    const [statusGroups, completedValue, reviewStats, liveSessions, cities, recent, earnings, settlements, defaultPercent] =
      await Promise.all([
        this.prisma.booking.groupBy({ by: ['status'], _count: true, where: assignedTo }),
        this.prisma.booking.aggregate({
          _sum: { amountInr: true },
          where: { ...assignedTo, status: BookingStatus.COMPLETED },
        }),
        this.prisma.review.aggregate({
          _count: true,
          _avg: { rating: true },
          where: { booking: assignedTo },
        }),
        this.prisma.liveSession.count({ where: { panditId } }),
        this.prisma.city.findMany({
          where: { id: { in: profile.serviceCityIds } },
          select: { name: true },
        }),
        this.prisma.booking.findMany({
          where: assignedTo,
          include: {
            puja: { select: { title: true } },
            assignment: { select: { createdAt: true } },
            earning: { select: { earningInr: true, status: true } },
          },
          orderBy: { preferredDate: 'desc' },
          take: 50,
        }),
        this.summaryForPandit(panditId),
        this.listSettlements({ panditId }),
        this.getCommissionPercent(),
      ]);

    const byStatus: Partial<Record<BookingStatus, number>> = {};
    for (const g of statusGroups) byStatus[g.status as BookingStatus] = g._count;
    const count = (...statuses: BookingStatus[]) =>
      statuses.reduce((sum, s) => sum + (byStatus[s] ?? 0), 0);
    const total = Object.values(byStatus).reduce((sum, n) => sum + (n ?? 0), 0);
    const completed = count(BookingStatus.COMPLETED);
    const cancelled = count(BookingStatus.CANCELLED, BookingStatus.REFUNDED);

    return {
      pandit: {
        id: profile.id,
        displayName: profile.displayName,
        email: profile.user?.email ?? null,
        phone: profile.phone,
        bio: profile.bio,
        experienceYears: profile.experienceYears,
        specializations: profile.specializations,
        servicePincodes: profile.servicePincodes,
        serviceCities: cities.map((c) => c.name),
        isActive: profile.isActive,
        isAvailable: profile.isAvailable,
        rating: profile.rating,
        commissionPercent: profile.commissionPercent,
        effectiveCommissionPercent: profile.commissionPercent ?? defaultPercent,
        createdAt: profile.createdAt.toISOString(),
      },
      bookings: { total, active: total - completed - cancelled, completed, cancelled, byStatus },
      earnings,
      completedBookingValueInr: completedValue._sum.amountInr ?? 0,
      reviews: {
        count: reviewStats._count,
        averageRating: reviewStats._avg.rating ?? null,
      },
      liveSessions,
      recentBookings: recent.map((b) => ({
        bookingId: b.id,
        reference: b.reference,
        pujaTitle: b.puja?.title ?? '',
        devoteeName: b.devoteeName,
        city: b.city,
        preferredDate: b.preferredDate.toISOString(),
        amountInr: b.amountInr,
        status: b.status as BookingStatus,
        assignedAt: (b.assignment?.createdAt ?? b.createdAt).toISOString(),
        earningInr: b.earning?.earningInr ?? null,
        earningStatus: (b.earning?.status as EarningStatus | undefined) ?? null,
      })),
      settlements,
    };
  }
}
