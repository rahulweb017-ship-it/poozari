'use client';

import { PanditShell } from '@/components/pandit-shell';
import { api } from '@/lib/client';
import {
  formatInr,
  type PanditEarning,
  type PanditEarningsSummary,
  type Settlement,
} from '@poozari/shared';
import { useEffect, useMemo, useState } from 'react';

type Range = 'today' | 'week' | 'month' | 'all' | 'custom';

const RANGES: { value: Range; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This week' },
  { value: 'month', label: 'This month' },
  { value: 'all', label: 'All time' },
  { value: 'custom', label: 'Custom' },
];

function ymd(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function presetBounds(range: Range): { from?: string; to?: string } {
  const today = new Date();
  if (range === 'today') return { from: ymd(today), to: ymd(today) };
  if (range === 'week') {
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    return { from: ymd(monday), to: ymd(today) };
  }
  if (range === 'month') {
    return { from: ymd(new Date(today.getFullYear(), today.getMonth(), 1)), to: ymd(today) };
  }
  return {};
}

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('en-IN');

export default function PanditEarningsPage() {
  const [range, setRange] = useState<Range>('month');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [summary, setSummary] = useState<PanditEarningsSummary | null>(null);
  const [earnings, setEarnings] = useState<PanditEarning[]>([]);
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [error, setError] = useState('');

  const bounds = useMemo(
    () =>
      range === 'custom'
        ? { from: customFrom || undefined, to: customTo || undefined }
        : presetBounds(range),
    [range, customFrom, customTo],
  );

  useEffect(() => {
    setError('');
    Promise.all([
      api.panditEarningsSummary(bounds),
      api.panditEarnings(bounds),
      api.panditSettlements(),
    ])
      .then(([s, e, st]) => {
        setSummary(s);
        setEarnings(e);
        setSettlements(st);
      })
      .catch((e: any) => setError(e.message ?? 'Could not load earnings'));
  }, [bounds]);

  /** Earnings grouped by the day the puja was completed, newest first. */
  const byDay = useMemo(() => {
    const groups = new Map<string, PanditEarning[]>();
    for (const e of earnings) {
      const day = fmtDate(e.createdAt);
      groups.set(day, [...(groups.get(day) ?? []), e]);
    }
    return Array.from(groups.entries());
  }, [earnings]);

  const cards = summary
    ? [
        { label: 'Completed pujas', value: String(summary.completedPujas) },
        { label: 'Total earnings', value: formatInr(summary.totalEarningsInr) },
        { label: 'Paid to you', value: formatInr(summary.paidInr) },
        { label: 'Pending payout', value: formatInr(summary.pendingInr) },
      ]
    : [];

  return (
    <PanditShell>
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">
          Earnings
        </h1>
        <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Your share of completed pujas and weekly payouts.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-end gap-2">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => setRange(r.value)}
            className={`rounded-full border px-3.5 py-1.5 text-2xs font-bold uppercase tracking-wider transition-colors ${
              range === r.value
                ? 'border-transparent bg-accent text-white'
                : 'bg-white text-muted-foreground hover:text-foreground'
            }`}
            style={range === r.value ? {} : { borderColor: 'hsl(var(--border) / 0.6)' }}
          >
            {r.label}
          </button>
        ))}
        {range === 'custom' ? (
          <div className="flex items-end gap-2">
            <input type="date" className="input py-1.5 text-xs" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
            <span className="pb-2 text-xs text-muted-foreground">to</span>
            <input type="date" className="input py-1.5 text-xs" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
          </div>
        ) : null}
      </div>

      {error ? (
        <p className="mb-4 rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="card bg-white p-5">
            <div className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
              {c.label}
            </div>
            <div className="mt-2 font-display text-xl font-black text-accent">{c.value}</div>
          </div>
        ))}
      </div>

      <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-foreground">
        Date-wise earnings
      </h3>
      <div className="card mb-10 overflow-x-auto bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-gray-50 text-2xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Puja</th>
              <th className="px-4 py-3">Booking amount</th>
              <th className="px-4 py-3">Your share</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {byDay.flatMap(([day, items]) =>
              items.map((e, i) => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-bold">{i === 0 ? day : ''}</td>
                  <td className="px-4 py-3">
                    <div className="font-bold">{e.pujaTitle}</div>
                    <div className="text-2xs text-muted-foreground">
                      {e.bookingReference} · {e.devoteeName}
                    </div>
                  </td>
                  <td className="px-4 py-3">{formatInr(e.bookingAmountInr)}</td>
                  <td className="px-4 py-3 font-black text-accent">
                    {formatInr(e.earningInr)} ({e.percent}%)
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${e.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>
                      {e.status === 'PAID' ? 'Paid' : 'Pending'}
                    </span>
                  </td>
                </tr>
              )),
            )}
            {earnings.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center font-bold uppercase tracking-wider text-muted-foreground">
                  No completed pujas in this period.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <h3 className="mb-3 font-display text-sm font-bold uppercase tracking-widest text-foreground">
        Weekly settlements
      </h3>
      <div className="card overflow-x-auto bg-white">
        <table className="w-full text-left text-xs">
          <thead className="border-b bg-gray-50 text-2xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Week</th>
              <th className="px-4 py-3">Pujas</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Reference</th>
            </tr>
          </thead>
          <tbody>
            {settlements.map((s) => (
              <tr key={s.id} className="border-b last:border-0">
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
              </tr>
            ))}
            {settlements.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center font-bold uppercase tracking-wider text-muted-foreground">
                  No settlements yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </PanditShell>
  );
}
