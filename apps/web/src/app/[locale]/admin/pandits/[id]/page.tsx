'use client';

import {
  AdminPageHeader,
  DataTable,
  DetailList,
  Notice,
  StatusPill,
  type Column,
  type FilterDef,
} from '@/components/admin-kit';
import { AdminShell } from '@/components/admin-shell';
import { StatusBadge } from '@/components/status-badge';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/client';
import {
  BookingStatus,
  EarningStatus,
  formatInr,
  type AdminPanditBookingRow,
  type AdminPanditOverview,
  type Settlement,
} from '@poozari/shared';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const dateFmt = (iso: string) => new Date(iso).toLocaleDateString('en-IN');

function StatCard({ label, value, hint, tone = 'text-foreground' }: { label: string; value: string | number; hint?: string; tone?: string }) {
  return (
    <div className="card bg-white p-5">
      <div className="text-3xs font-extrabold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={`mt-2 font-display text-2xl font-black ${tone}`}>{value}</div>
      {hint ? <div className="mt-1 text-3xs font-semibold text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function EarningBadge({ status }: { status: EarningStatus | null }) {
  if (!status) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={`badge ${status === EarningStatus.PAID ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
      {status === EarningStatus.PAID ? 'Paid' : 'Pending'}
    </span>
  );
}

const STATUS_ORDER: BookingStatus[] = [
  BookingStatus.ASSIGNED,
  BookingStatus.ACCEPTED,
  BookingStatus.SCHEDULED,
  BookingStatus.IN_PROGRESS,
  BookingStatus.COMPLETED,
  BookingStatus.CANCELLED,
  BookingStatus.REFUNDED,
];

export default function AdminPanditDashboardPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AdminPanditOverview | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setData(await api.adminPanditOverview(id));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message ?? 'Could not load this pandit'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function toggleActive() {
    if (!data) return;
    setBusy(true);
    setError('');
    try {
      await api.adminUpdatePandit(data.pandit.id, { isActive: !data.pandit.isActive });
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not update this account');
    } finally {
      setBusy(false);
    }
  }

  const bookingColumns: Column<AdminPanditBookingRow>[] = [
    {
      key: 'booking',
      header: 'Booking',
      render: (b) => (
        <div>
          <div className="font-bold text-foreground">{b.pujaTitle}</div>
          <div className="text-3xs text-muted-foreground">{b.reference}</div>
        </div>
      ),
    },
    { key: 'devotee', header: 'Devotee', render: (b) => b.devoteeName },
    { key: 'city', header: 'City', render: (b) => b.city || '—' },
    { key: 'date', header: 'Puja date', render: (b) => dateFmt(b.preferredDate) },
    { key: 'amount', header: 'Amount', render: (b) => formatInr(b.amountInr) },
    { key: 'earning', header: 'Pujari earning', render: (b) => (b.earningInr == null ? '—' : formatInr(b.earningInr)) },
    { key: 'payout', header: 'Payout', render: (b) => <EarningBadge status={b.earningStatus} /> },
    { key: 'status', header: 'Status', render: (b) => <StatusBadge status={b.status} /> },
  ];

  const bookingFilters: FilterDef<AdminPanditBookingRow>[] = [
    {
      key: 'status',
      label: 'Status',
      options: STATUS_ORDER.map((s) => ({ value: s, label: s.replace('_', ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase()) })),
      match: (b, v) => b.status === v,
    },
    {
      key: 'payout',
      label: 'Payout',
      options: [
        { value: EarningStatus.PENDING, label: 'Pending' },
        { value: EarningStatus.PAID, label: 'Paid' },
      ],
      match: (b, v) => b.earningStatus === v,
    },
  ];

  const settlementColumns: Column<Settlement>[] = [
    { key: 'week', header: 'Week', render: (s) => `${dateFmt(s.periodStart)} – ${dateFmt(s.periodEnd)}` },
    { key: 'pujas', header: 'Pujas', render: (s) => s.earningsCount },
    { key: 'total', header: 'Amount', render: (s) => formatInr(s.totalInr) },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <StatusPill on={s.status === 'PAID'} onLabel="Paid" offLabel="Pending" />,
    },
    { key: 'paidAt', header: 'Paid on', render: (s) => (s.paidAt ? dateFmt(s.paidAt) : '—') },
    { key: 'ref', header: 'Reference', render: (s) => s.reference || '—' },
  ];

  const p = data?.pandit;

  return (
    <AdminShell>
      <Link
        href="/admin/pandits"
        className="mb-4 inline-block text-2xs font-bold uppercase tracking-wider text-muted-foreground hover:text-accent"
      >
        ← Back to pandits
      </Link>

      <AdminPageHeader
        title={p?.displayName ?? 'Pandit'}
        subtitle={p ? `${p.email ?? 'No email'} · ${p.phone} · Joined ${dateFmt(p.createdAt)}` : 'Loading…'}
        actions={
          p ? (
            <>
              <StatusPill on={p.isActive} onLabel="✓ Account active" offLabel="⊘ Deactivated" />
              <span className={`badge ${p.isActive && p.isAvailable ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                {p.isActive && p.isAvailable ? '● Online' : '○ Offline'}
              </span>
              <button className="btn-outline text-2xs uppercase tracking-wider" onClick={toggleActive} disabled={busy}>
                {p.isActive ? 'Deactivate account' : 'Activate account'}
              </button>
              <Link href={`/admin/payments?panditId=${p.id}`} className="btn-primary text-2xs uppercase tracking-wider">
                View payments
              </Link>
            </>
          ) : null
        }
      />

      <Notice error={error} />

      {data && p ? (
        <div className="space-y-8">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Pujas completed" value={data.bookings.completed} hint={`${data.bookings.total} assigned in total`} tone="text-emerald-700" />
            <StatCard label="Active / upcoming" value={data.bookings.active} hint="Assigned, accepted, scheduled or in progress" />
            <StatCard label="Cancelled / refunded" value={data.bookings.cancelled} />
            <StatCard
              label="Rating"
              value={data.reviews.averageRating == null ? '—' : `${data.reviews.averageRating.toFixed(1)} ★`}
              hint={`${data.reviews.count} review${data.reviews.count === 1 ? '' : 's'}`}
            />
            <StatCard label="Total earnings" value={formatInr(data.earnings.totalEarningsInr)} hint={`${p.effectiveCommissionPercent}% share${p.commissionPercent == null ? ' (platform default)' : ''}`} tone="text-accent" />
            <StatCard label="Paid to pujari" value={formatInr(data.earnings.paidInr)} tone="text-emerald-700" />
            <StatCard label="Pending payout" value={formatInr(data.earnings.pendingInr)} tone="text-amber-700" />
            <StatCard label="Completed booking value" value={formatInr(data.completedBookingValueInr)} hint={`${data.liveSessions} live darshan session${data.liveSessions === 1 ? '' : 's'}`} />
          </section>

          <section className="card bg-white p-6">
            <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-foreground">Bookings by status</h2>
            <div className="flex flex-wrap gap-2">
              {STATUS_ORDER.map((s) => (
                <div key={s} className="flex items-center gap-2 rounded-2xl border px-3 py-2" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
                  <StatusBadge status={s} />
                  <span className="text-sm font-black text-foreground">{data.bookings.byStatus[s] ?? 0}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-foreground">Assigned bookings</h2>
            <DataTable
              rows={data.recentBookings}
              columns={bookingColumns}
              getRowId={(b) => b.bookingId}
              searchText={(b) => [b.reference, b.pujaTitle, b.devoteeName, b.city].join(' ')}
              searchPlaceholder="Search reference, puja, devotee, city…"
              filters={bookingFilters}
              pageSize={10}
              emptyText="No bookings assigned to this pandit yet."
            />
            {data.bookings.total > data.recentBookings.length ? (
              <p className="mt-2 text-3xs font-semibold text-muted-foreground">
                Showing the latest {data.recentBookings.length} of {data.bookings.total} bookings.
              </p>
            ) : null}
          </section>

          <section>
            <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-foreground">Weekly settlements</h2>
            <DataTable
              rows={data.settlements}
              columns={settlementColumns}
              getRowId={(s) => s.id}
              pageSize={10}
              emptyText="No settlements generated for this pandit yet."
            />
          </section>

          <section className="card bg-white p-6">
            <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-widest text-foreground">Profile</h2>
            <DetailList
              items={[
                { label: 'Experience', value: `${p.experienceYears} years` },
                { label: 'Pujari share', value: p.commissionPercent == null ? `Platform default (${p.effectiveCommissionPercent}%)` : `${p.commissionPercent}%` },
                { label: 'Service cities', value: p.serviceCities.join(', ') },
                { label: 'Service pincodes', value: p.servicePincodes.join(', ') },
                { label: 'Specializations', value: p.specializations.join(', ') },
                { label: 'Bio', value: p.bio },
              ]}
            />
          </section>
        </div>
      ) : !error ? (
        <p className="p-10 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">Loading…</p>
      ) : null}
    </AdminShell>
  );
}
