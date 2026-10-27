'use client';

import {
  ActionButton,
  AdminPageHeader,
  DataTable,
  DetailList,
  Modal,
  Notice,
  type Column,
  type FilterDef,
} from '@/components/admin-kit';
import { AdminShell } from '@/components/admin-shell';
import { StatusBadge } from '@/components/status-badge';
import { api } from '@/lib/client';
import {
  ApiClientError,
  BOOKING_STATUS_LABELS,
  formatInr,
  PaymentStatus,
  type Booking,
} from '@poozari/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';

function isAssignable(b: Booking) {
  return ['PAID', 'ASSIGNED', 'PENDING_PAYMENT'].includes(b.status);
}

function isPaid(b: Booking) {
  return ['PAID', 'ASSIGNED'].includes(b.status) && b.payment?.status === PaymentStatus.PAID;
}

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('en-IN') : '';
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pandits, setPandits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedPandit, setSelectedPandit] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [viewingId, setViewingId] = useState<string | null>(null);

  async function load() {
    const [b, p] = await Promise.all([api.adminListBookings(), api.adminListPandits()]);
    setBookings(b);
    setPandits(p);
  }

  useEffect(() => {
    load()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  // Looked up by id so the popup reflects the reloaded booking after an assignment.
  const viewing = useMemo(
    () => bookings.find((b) => b.id === viewingId) ?? null,
    [bookings, viewingId],
  );
  const availablePandits = useMemo(
    () => pandits.filter((p) => p.isActive && p.isAvailable),
    [pandits],
  );
  const closeView = useCallback(() => setViewingId(null), []);

  async function refresh() {
    setError(null);
    setMsg('');
    setLoading(true);
    try {
      await load();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not load bookings');
    } finally {
      setLoading(false);
    }
  }

  async function autoAssign(id: string) {
    setBusy(id);
    setError(null);
    setMsg('');
    try {
      await api.adminAutoAssign(id);
      await load();
      setMsg('Pandit assigned automatically.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not assign pandit');
    } finally {
      setBusy(null);
    }
  }

  async function manualAssign(id: string) {
    const panditId = selectedPandit[id];
    if (!panditId) return;
    setBusy(id);
    setError(null);
    setMsg('');
    try {
      await api.adminAssign(id, panditId);
      await load();
      setMsg('Pandit assigned.');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Could not assign pandit');
    } finally {
      setBusy(null);
    }
  }

  const cityOptions = useMemo(
    () =>
      Array.from(new Set(bookings.map((b) => b.city).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b))
        .map((c) => ({ value: c, label: c })),
    [bookings],
  );

  const columns: Column<Booking>[] = [
    {
      key: 'booking',
      header: 'Booking',
      render: (b) => (
        <div className="min-w-0">
          <div className="font-bold text-foreground">{b.puja.title}</div>
          <div className="text-3xs font-bold uppercase tracking-widest text-muted-foreground">
            {b.reference}
          </div>
        </div>
      ),
    },
    {
      key: 'devotee',
      header: 'Devotee',
      render: (b) => (
        <div className="min-w-0">
          <div className="font-semibold text-foreground">{b.devoteeName}</div>
          <div className="text-3xs text-muted-foreground">{b.contactPhone || '—'}</div>
        </div>
      ),
    },
    {
      key: 'city',
      header: 'City',
      render: (b) => `${b.city || 'N/A'}${b.pincode ? ` (${b.pincode})` : ''}`,
    },
    {
      key: 'date',
      header: 'Date',
      className: 'whitespace-nowrap',
      render: (b) => (
        <div>
          <div>{formatDate(b.preferredDate)}</div>
          {b.preferredTime ? (
            <div className="text-3xs text-muted-foreground">{b.preferredTime}</div>
          ) : null}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      className: 'whitespace-nowrap',
      render: (b) => <span className="font-black text-accent">{formatInr(b.amountInr)}</span>,
    },
    {
      key: 'pandit',
      header: 'Pandit',
      render: (b) =>
        b.assignment?.pandit ? (
          <span className="badge border border-emerald-100 bg-emerald-50 text-emerald-700">
            {b.assignment.pandit.displayName} ({b.assignment.mode})
          </span>
        ) : (
          <span className="badge border border-amber-100 bg-amber-50 text-amber-800">⚠ Unassigned</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge status={b.status} />
          {!isPaid(b) && isAssignable(b) ? (
            <span className="badge border border-red-100 bg-red-50 text-red-700">Payment pending</span>
          ) : null}
        </div>
      ),
    },
  ];

  const filters: FilterDef<Booking>[] = [
    {
      key: 'status',
      label: 'Status',
      options: Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => ({ value, label })),
      match: (b, v) => b.status === v,
    },
    {
      key: 'payment',
      label: 'Payment',
      options: [
        { value: 'paid', label: 'Paid' },
        { value: 'pending', label: 'Payment pending' },
      ],
      match: (b, v) =>
        v === 'paid' ? b.payment?.status === PaymentStatus.PAID : b.payment?.status !== PaymentStatus.PAID,
    },
    {
      key: 'assignment',
      label: 'Pandit',
      options: [
        { value: 'assigned', label: 'Assigned' },
        { value: 'unassigned', label: 'Unassigned' },
      ],
      match: (b, v) => (v === 'assigned') === Boolean(b.assignment?.pandit),
    },
    {
      key: 'city',
      label: 'City',
      options: cityOptions,
      match: (b, v) => b.city === v,
    },
  ];

  return (
    <AdminShell>
      <AdminPageHeader
        title="Bookings"
        subtitle="Coordinate pandit assignments and scheduling."
        actions={
          <button
            className="btn-outline text-2xs uppercase tracking-wider"
            onClick={refresh}
            disabled={loading}
          >
            {loading ? 'Loading…' : '↻ Refresh'}
          </button>
        }
      />

      <Notice error={error ?? undefined} message={msg} />

      <DataTable
        rows={bookings}
        columns={columns}
        getRowId={(b) => b.id}
        loading={loading}
        searchText={(b) =>
          [
            b.reference,
            b.puja.title,
            b.devoteeName,
            b.contactPhone,
            b.contactEmail,
            b.city,
            b.pincode,
            b.assignment?.pandit?.displayName,
          ]
            .filter(Boolean)
            .join(' ')
        }
        searchPlaceholder="Search reference, puja, devotee, phone, city…"
        filters={filters}
        emptyText="No bookings yet."
        onRowClick={(b) => setViewingId(b.id)}
        actions={(b) => (
          <>
            <ActionButton onClick={() => setViewingId(b.id)}>View</ActionButton>
            {isAssignable(b) ? (
              <ActionButton
                tone="accent"
                disabled={busy === b.id || !isPaid(b)}
                title={isPaid(b) ? undefined : 'Payment pending — cannot assign pandit'}
                onClick={() => autoAssign(b.id)}
              >
                {busy === b.id ? 'Working…' : '⚡ Auto-assign'}
              </ActionButton>
            ) : null}
          </>
        )}
      />

      <Modal
        open={Boolean(viewing)}
        title={viewing ? `${viewing.puja.title} · ${viewing.reference}` : ''}
        onClose={closeView}
        size="lg"
      >
        {viewing ? (
          <div className="space-y-6">
            <Notice error={error ?? undefined} message={msg} />

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={viewing.status} />
              {!isPaid(viewing) && isAssignable(viewing) ? (
                <span className="badge border border-red-100 bg-red-50 text-red-700">Payment pending</span>
              ) : null}
              {viewing.assignment?.pandit ? (
                <span className="badge border border-emerald-100 bg-emerald-50 text-emerald-700">
                  Pandit: {viewing.assignment.pandit.displayName} ({viewing.assignment.mode})
                </span>
              ) : (
                <span className="badge border border-amber-100 bg-amber-50 text-amber-800">⚠ Unassigned</span>
              )}
            </div>

            <DetailList
              items={[
                { label: 'Reference', value: viewing.reference },
                { label: 'Puja', value: viewing.puja.title },
                { label: 'Package', value: viewing.package ? `${viewing.package.name} (${formatInr(viewing.packageAmountInr)})` : null },
                { label: 'Add-ons', value: viewing.addons.map((a) => `${a.name} (${formatInr(a.priceInr)})`).join(', ') },
                { label: 'Total amount', value: formatInr(viewing.amountInr) },
                { label: 'Status', value: BOOKING_STATUS_LABELS[viewing.status] ?? viewing.status },
                { label: 'Payment', value: viewing.payment ? `${viewing.payment.status}${viewing.payment.razorpayPaymentId ? ` · ${viewing.payment.razorpayPaymentId}` : ''}` : 'No payment yet' },
                { label: 'Devotee', value: viewing.devoteeName },
                { label: 'Gotra', value: viewing.gotra },
                {
                  label: 'Phone',
                  value: viewing.contactPhone ? (
                    <a href={`tel:${viewing.contactPhone}`} className="font-semibold hover:text-accent">
                      {viewing.contactPhone}
                    </a>
                  ) : null,
                },
                {
                  label: 'Email',
                  value: viewing.contactEmail ? (
                    <a href={`mailto:${viewing.contactEmail}`} className="font-semibold hover:text-accent">
                      {viewing.contactEmail}
                    </a>
                  ) : null,
                },
                { label: 'Preferred date', value: formatDate(viewing.preferredDate) },
                { label: 'Preferred time', value: viewing.preferredTime },
                { label: 'Address', value: viewing.addressLine },
                { label: 'City', value: `${viewing.city || 'N/A'}${viewing.pincode ? ` (${viewing.pincode})` : ''}` },
                { label: 'Assigned pandit', value: viewing.assignment?.pandit ? `${viewing.assignment.pandit.displayName} (${viewing.assignment.mode}, ${viewing.assignment.status})` : 'Unassigned' },
                { label: 'Notes', value: viewing.notes ? <span className="whitespace-pre-wrap">{viewing.notes}</span> : null },
                {
                  label: 'Video',
                  value: viewing.videoUrl ? (
                    <a href={viewing.videoUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">
                      Open video
                    </a>
                  ) : null,
                },
                { label: 'Booked on', value: viewing.createdAt ? new Date(viewing.createdAt).toLocaleString('en-IN') : null },
              ]}
            />

            {isAssignable(viewing) ? (
              <div
                className="space-y-3 rounded-2xl border bg-gray-50/50 p-4"
                style={{ borderColor: 'hsl(var(--border) / 0.4)' }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-3xs font-extrabold uppercase tracking-widest text-muted-foreground">
                    Assign pandit
                  </span>
                  {!isPaid(viewing) ? (
                    <span className="badge border border-red-100 bg-red-50 text-red-700">Payment pending</span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="btn-outline py-2 text-2xs uppercase tracking-wider"
                    disabled={busy === viewing.id || !isPaid(viewing)}
                    title={isPaid(viewing) ? undefined : 'Payment pending — cannot assign pandit'}
                    onClick={() => autoAssign(viewing.id)}
                  >
                    {busy === viewing.id ? 'Working…' : '⚡ Auto-assign'}
                  </button>
                  <select
                    className="input max-w-xs bg-white py-2 text-xs"
                    disabled={!isPaid(viewing)}
                    value={selectedPandit[viewing.id] ?? ''}
                    onChange={(e) =>
                      setSelectedPandit((s) => ({ ...s, [viewing.id]: e.target.value }))
                    }
                  >
                    <option value="">Select pandit…</option>
                    {availablePandits.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.displayName}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn-primary py-2 text-2xs uppercase tracking-wider"
                    disabled={busy === viewing.id || !isPaid(viewing) || !selectedPandit[viewing.id]}
                    onClick={() => manualAssign(viewing.id)}
                  >
                    Assign manually
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </AdminShell>
  );
}
