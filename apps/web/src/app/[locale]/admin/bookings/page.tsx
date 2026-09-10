'use client';

import { AdminShell } from '@/components/admin-shell';
import { StatusBadge } from '@/components/status-badge';
import { api } from '@/lib/client';
import { formatInr, type Booking } from '@poozari/shared';
import { useEffect, useState } from 'react';

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pandits, setPandits] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [selectedPandit, setSelectedPandit] = useState<Record<string, string>>({});

  async function load() {
    const [b, p] = await Promise.all([api.adminListBookings(), api.adminListPandits()]);
    setBookings(b);
    setPandits(p);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function autoAssign(id: string) {
    setBusy(id);
    try {
      await api.adminAutoAssign(id);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function manualAssign(id: string) {
    const panditId = selectedPandit[id];
    if (!panditId) return;
    setBusy(id);
    try {
      await api.adminAssign(id, panditId);
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminShell>
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">Bookings</h1>
        <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Coordinate pandit assignments and scheduling.
        </p>
      </div>

      <div className="space-y-4">
        {bookings.map((b) => {
          const assignable = ['PAID', 'ASSIGNED'].includes(b.status);
          return (
            <div key={b.id} className="card overflow-hidden bg-white">
              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm text-foreground">
                        {b.puja.title}
                      </span>
                      <span className="text-2xs font-bold uppercase tracking-widest text-muted-foreground">
                        · {b.reference}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-muted-foreground">
                      <span>👤 {b.devoteeName}</span>
                      <span>📍 {b.city || 'N/A'} {b.pincode ? `(${b.pincode})` : ''}</span>
                      <span>📅 {new Date(b.preferredDate).toLocaleDateString('en-IN')}</span>
                      <span className="font-black text-accent">{formatInr(b.amountInr)}</span>
                    </div>
                    {b.assignment?.pandit ? (
                      <div className="mt-3">
                        <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-100">
                          Pandit: {b.assignment.pandit.displayName} ({b.assignment.mode})
                        </span>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <span className="badge bg-amber-50 text-amber-800 border border-amber-100">
                          ⚠ Unassigned
                        </span>
                      </div>
                    )}
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              </div>

              {assignable ? (
                <div className="flex flex-wrap items-center gap-3 border-t bg-gray-50/50 px-6 py-4"
                     style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
                  <button
                    className="btn-outline py-2 text-2xs uppercase tracking-wider"
                    disabled={busy === b.id}
                    onClick={() => autoAssign(b.id)}
                  >
                    {busy === b.id ? 'Working…' : '⚡ Auto-assign'}
                  </button>
                  <select
                    className="input max-w-xs text-xs py-2 bg-white"
                    value={selectedPandit[b.id] ?? ''}
                    onChange={(e) => setSelectedPandit((s) => ({ ...s, [b.id]: e.target.value }))}
                  >
                    <option value="">Select pandit…</option>
                {pandits.filter((p) => p.isActive && p.isAvailable).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.displayName}
                      </option>
                    ))}
                  </select>
                  <button
                    className="btn-primary py-2 text-2xs uppercase tracking-wider"
                    disabled={busy === b.id || !selectedPandit[b.id]}
                    onClick={() => manualAssign(b.id)}
                  >
                    Assign manually
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
        {bookings.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="text-4xl">📋</div>
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">No bookings yet.</p>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
