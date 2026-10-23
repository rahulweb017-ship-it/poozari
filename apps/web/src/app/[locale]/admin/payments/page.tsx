'use client';

import { AdminShell } from '@/components/admin-shell';
import { api } from '@/lib/client';
import {
  formatInr,
  type PaymentLedgerRow,
  type PaymentsSummary,
  type Settlement,
} from '@poozari/shared';
import { useEffect, useState } from 'react';

const TABS = [
  { value: 'all', label: 'All' },
  { value: 'received', label: 'Received' },
  { value: 'pending', label: 'Pending' },
  { value: 'pandit_paid', label: 'Pujari Paid' },
  { value: 'settlements', label: 'Weekly Settlements' },
];

function ymd(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Monday of the week containing `d`, in local time. */
function mondayOf(d: Date) {
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return m;
}

function lastWeekMonday() {
  const m = mondayOf(new Date());
  m.setDate(m.getDate() - 7);
  return ymd(m);
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN');

export default function AdminPaymentsPage() {
  const [tab, setTab] = useState('all');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [panditId, setPanditId] = useState('');
  const [pandits, setPandits] = useState<any[]>([]);
  const [summary, setSummary] = useState<PaymentsSummary | null>(null);
  const [rows, setRows] = useState<PaymentLedgerRow[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [commission, setCommission] = useState('');
  const [weekStart, setWeekStart] = useState(lastWeekMonday());
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const filters = { from: from || undefined, to: to || undefined, panditId: panditId || undefined };

  async function load() {
    const [s, list] = await Promise.all([
      api.adminPaymentsSummary(filters),
      tab === 'settlements'
        ? api.adminListSettlements({ panditId: filters.panditId })
        : api.adminListPayments({ ...filters, tab }),
    ]);
    setSummary(s);
    if (tab === 'settlements') setSettlements(list as Settlement[]);
    else setRows(list as PaymentLedgerRow[]);
  }

  useEffect(() => {
    Promise.all([api.adminListPandits(), api.adminGetCommission()])
      .then(([p, c]) => {
        setPandits(p);
        setCommission(String(c.percent));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    load().catch((e: any) => setError(e.message ?? 'Could not load payments'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, from, to, panditId]);

  async function run(action: () => Promise<string>) {
    setError('');
    setMsg('');
    setBusy(true);
    try {
      setMsg(await action());
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const saveCommission = () =>
    run(async () => {
      const res = await api.adminSetCommission(Number(commission));
      return `Default pujari share set to ${res.percent}%. Applies to bookings completed from now on.`;
    });

  const generate = () =>
    run(async () => {
      const created = await api.adminGenerateSettlements(weekStart);
      return created.length
        ? `Created ${created.length} settlement${created.length === 1 ? '' : 's'}.`
        : 'No unsettled earnings in that week.';
    });

  const markPaid = (s: Settlement) => {
    const reference = window.prompt(
      `Mark ${formatInr(s.totalInr)} to ${s.panditName} as paid.\nUPI / bank reference (optional):`,
    );
    if (reference === null) return;
    run(async () => {
      await api.adminPaySettlement(s.id, { reference });
      return 'Settlement marked paid.';
    });
  };

  const cards = summary
    ? [
        { label: 'Received from customers', value: summary.receivedInr, tone: 'text-emerald-700' },
        { label: 'Pending customer payments', value: summary.pendingCustomerInr, tone: 'text-amber-700' },
        { label: 'Pujari payable (pending)', value: summary.pujariPayablePendingInr, tone: 'text-red-700' },
        { label: 'Paid to pujaris', value: summary.paidToPujarisInr, tone: 'text-blue-700' },
        { label: 'Platform share', value: summary.platformShareInr, tone: 'text-accent' },
      ]
    : [];

  return (
    <AdminShell>
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">
          Payments
        </h1>
        <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Customer payments, pujari earnings and weekly settlements.
        </p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <div key={c.label} className="card bg-white p-5">
            <div className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
              {c.label}
            </div>
            <div className={`mt-2 font-display text-xl font-black ${c.tone}`}>
              {formatInr(c.value)}
            </div>
          </div>
        ))}
      </div>

      <div className="card mb-6 flex flex-wrap items-end gap-4 bg-white p-5">
        <div>
          <label className="label">From</label>
          <input type="date" className="input py-2 text-xs" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div>
          <label className="label">To</label>
          <input type="date" className="input py-2 text-xs" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div>
          <label className="label">Pujari</label>
          <select className="input py-2 text-xs" value={panditId} onChange={(e) => setPanditId(e.target.value)}>
            <option value="">All pujaris</option>
            {pandits.map((p) => (
              <option key={p.id} value={p.id}>
                {p.displayName}
              </option>
            ))}
          </select>
        </div>
        {from || to || panditId ? (
          <button
            className="btn-outline py-2 text-2xs uppercase tracking-wider"
            onClick={() => {
              setFrom('');
              setTo('');
              setPanditId('');
            }}
          >
            Clear filters
          </button>
        ) : null}
        <div className="ml-auto flex items-end gap-2">
          <div>
            <label className="label">Default pujari share %</label>
            <input
              className="input w-24 py-2 text-xs"
              inputMode="numeric"
              value={commission}
              onChange={(e) => setCommission(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <button
            className="btn-primary py-2 text-2xs uppercase tracking-wider"
            disabled={busy || commission === '' || Number(commission) > 100}
            onClick={saveCommission}
          >
            Save
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`rounded-full border px-3.5 py-1.5 text-2xs font-bold uppercase tracking-wider transition-colors ${
              tab === t.value
                ? 'border-transparent bg-accent text-white'
                : 'bg-white text-muted-foreground hover:text-foreground'
            }`}
            style={tab === t.value ? {} : { borderColor: 'hsl(var(--border) / 0.6)' }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mb-4 rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>
      ) : null}
      {msg ? (
        <p className="mb-4 rounded-2xl bg-green-50 p-3 text-xs font-semibold text-green-700">{msg}</p>
      ) : null}

      {tab === 'settlements' ? (
        <div className="space-y-4">
          <div className="card flex flex-wrap items-end gap-3 bg-white p-5">
            <div>
              <label className="label">Week starting (Monday)</label>
              <input
                type="date"
                className="input py-2 text-xs"
                value={weekStart}
                onChange={(e) => e.target.value && setWeekStart(ymd(mondayOf(new Date(`${e.target.value}T00:00:00`))))}
              />
            </div>
            <button className="btn-primary py-2 text-2xs uppercase tracking-wider" disabled={busy} onClick={generate}>
              Generate weekly settlements
            </button>
            <p className="text-2xs text-muted-foreground">
              Groups each pujari&apos;s unsettled earnings for that Monday–Sunday week.
            </p>
          </div>

          <div className="card overflow-x-auto bg-white">
            <table className="w-full text-left text-xs">
              <thead className="border-b bg-gray-50 text-2xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Pujari</th>
                  <th className="px-4 py-3">Week</th>
                  <th className="px-4 py-3">Pujas</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {settlements.map((s) => (
                  <tr key={s.id} className="border-b last:border-0">
                    <td className="px-4 py-3 font-bold">{s.panditName}</td>
                    <td className="px-4 py-3">
                      {fmtDate(s.periodStart)} – {fmtDate(s.periodEnd)}
                    </td>
                    <td className="px-4 py-3">{s.earningsCount}</td>
                    <td className="px-4 py-3 font-black text-accent">{formatInr(s.totalInr)}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${s.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                        {s.status === 'PAID' ? `Paid ${s.paidAt ? fmtDate(s.paidAt) : ''}` : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.reference || '—'}</td>
                    <td className="px-4 py-3 text-right">
                      {s.status === 'PENDING' ? (
                        <button className="btn-outline py-1.5 text-2xs uppercase tracking-wider" disabled={busy} onClick={() => markPaid(s)}>
                          Mark paid
                        </button>
                      ) : null}
                    </td>
                  </tr>
                ))}
                {settlements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center font-bold uppercase tracking-wider text-muted-foreground">
                      No settlements yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="card overflow-x-auto bg-white">
          <table className="w-full text-left text-xs">
            <thead className="border-b bg-gray-50 text-2xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Booking</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Payment</th>
                <th className="px-4 py-3">Pujari</th>
                <th className="px-4 py-3">Pujari share</th>
                <th className="px-4 py-3">Platform</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.bookingId} className="border-b last:border-0">
                  <td className="px-4 py-3">{fmtDate(r.createdAt)}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold">{r.pujaTitle}</div>
                    <div className="text-2xs text-muted-foreground">
                      {r.reference} · {r.devoteeName} · {r.bookingStatus}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-black">{formatInr(r.amountInr)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${r.paymentStatus === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                      {r.paymentStatus === 'PAID' ? 'Received' : 'Pending'}
                    </span>
                  </td>
                  <td className="px-4 py-3">{r.panditName ?? '—'}</td>
                  <td className="px-4 py-3">
                    {r.earningInr == null ? (
                      '—'
                    ) : (
                      <>
                        {formatInr(r.earningInr)} ({r.earningPercent}%)
                        <div className="text-2xs font-bold uppercase text-muted-foreground">
                          {r.earningStatus === 'PAID' ? 'Paid' : 'Payable'}
                        </div>
                      </>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {r.platformShareInr == null ? '—' : formatInr(r.platformShareInr)}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center font-bold uppercase tracking-wider text-muted-foreground">
                    Nothing to show for these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
