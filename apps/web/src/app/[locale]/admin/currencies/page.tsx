'use client';

import { AdminShell } from '@/components/admin-shell';
import { api } from '@/lib/client';
import { formatMoney, type Currency } from '@poozari/shared';
import { useEffect, useState } from 'react';

const EMPTY = {
  code: '',
  label: '',
  symbol: '',
  ratePerInr: '',
  locale: 'en-US',
  decimals: '2',
  sortOrder: '9',
  isActive: true,
};

/** A ₹5,100 package is the reference amount for the preview column. */
const SAMPLE_INR = 5100;

export default function AdminCurrenciesPage() {
  const [rates, setRates] = useState<Currency[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const list = await api.adminListCurrencies();
    setRates(list);
    setDrafts(Object.fromEntries(list.map((r) => [r.code, String(r.ratePerInr)])));
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function saveRate(code: string) {
    setError('');
    setMsg('');
    const value = Number(drafts[code]);
    if (!Number.isFinite(value) || value <= 0) {
      setError(`Enter a rate greater than 0 for ${code}.`);
      return;
    }
    try {
      await api.adminUpdateCurrency(code, { ratePerInr: value });
      setMsg(`${code} rate updated.`);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not update the rate');
    }
  }

  async function toggleActive(rate: Currency) {
    setError('');
    try {
      await api.adminUpdateCurrency(rate.code, { isActive: !rate.isActive });
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not update the currency');
    }
  }

  async function remove(rate: Currency) {
    if (!window.confirm(`Remove ${rate.code}? Visitors will no longer be able to pick it.`)) return;
    setError('');
    try {
      await api.adminDeleteCurrency(rate.code);
      setMsg(`Removed ${rate.code}.`);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not remove the currency');
    }
  }

  async function add() {
    setBusy(true);
    setError('');
    setMsg('');
    try {
      await api.adminUpsertCurrency({
        code: form.code,
        label: form.label,
        symbol: form.symbol,
        ratePerInr: Number(form.ratePerInr) || 0,
        locale: form.locale,
        decimals: Number(form.decimals) || 0,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      });
      setForm(EMPTY);
      setMsg('Currency saved.');
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not save the currency');
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell>
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">
          Currencies
        </h1>
        <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Display rates for the currency switcher.
        </p>
      </div>

      {/* The single most important thing to understand on this page. */}
      <div className="card mb-6 border-amber-200 bg-amber-50 p-5">
        <p className="text-xs font-bold text-amber-900">Display only — every payment is in INR</p>
        <p className="mt-2 text-xs leading-relaxed text-amber-800">
          These rates change what a visitor <em>sees</em> on a price tag. Razorpay still charges the
          rupee amount, and the customer&apos;s own bank does the conversion, so refunds stay exact.
          Nothing here affects a booking, an invoice or your settlement. Keep the rates roughly
          current so prices are not misleading — there is no automatic feed.
        </p>
      </div>

      {error ? (
        <p className="mb-4 rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>
      ) : null}
      {msg ? (
        <p className="mb-4 rounded-2xl bg-green-50 p-3 text-xs font-semibold text-green-700">
          {msg}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Rates table */}
        <div className="lg:col-span-2">
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
            Rates ({rates.length})
          </h3>
          <div className="mt-5 space-y-3">
            {rates.map((rate) => {
              const isBase = rate.code === 'INR';
              return (
                <div key={rate.code} className="card bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-display text-base font-black text-foreground">
                          {rate.symbol} {rate.code}
                        </span>
                        {isBase ? (
                          <span className="badge bg-accent-soft text-accent">Base</span>
                        ) : null}
                        {!rate.isActive ? (
                          <span className="badge bg-gray-200 text-gray-500">Hidden</span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 text-2xs text-muted-foreground">
                        {rate.label} · {rate.locale} · {rate.decimals} dp
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-3xs font-extrabold uppercase tracking-wider text-muted-foreground">
                        ₹{SAMPLE_INR.toLocaleString('en-IN')} shows as
                      </div>
                      <div className="font-bold text-sm text-accent">
                        {formatMoney(SAMPLE_INR, rate)}
                      </div>
                    </div>
                  </div>

                  <div
                    className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3"
                    style={{ borderColor: 'hsl(var(--border) / 0.3)' }}
                  >
                    <div>
                      <label className="label">Units per ₹1</label>
                      <input
                        className="input w-36 py-1.5 text-xs"
                        value={drafts[rate.code] ?? ''}
                        disabled={isBase}
                        onChange={(e) => setDrafts({ ...drafts, [rate.code]: e.target.value })}
                      />
                    </div>
                    {!isBase ? (
                      <>
                        <button
                          className="btn-outline text-2xs uppercase tracking-wider"
                          onClick={() => saveRate(rate.code)}
                          disabled={drafts[rate.code] === String(rate.ratePerInr)}
                        >
                          Save rate
                        </button>
                        <button
                          className="btn-outline text-2xs uppercase tracking-wider"
                          onClick={() => toggleActive(rate)}
                        >
                          {rate.isActive ? '⊘ Hide' : '✓ Show'}
                        </button>
                        <button
                          className="rounded-xl border border-red-200 px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50"
                          onClick={() => remove(rate)}
                        >
                          🗑 Remove
                        </button>
                      </>
                    ) : (
                      <p className="pb-2 text-3xs font-semibold uppercase tracking-wider text-muted-foreground">
                        The base currency is fixed at 1 and cannot be hidden.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Add / replace */}
        <div className="card self-start p-6">
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
            Add a currency
          </h3>
          <p className="mt-1.5 text-2xs text-muted-foreground">
            Saving an existing code replaces its settings.
          </p>
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">ISO code *</label>
                <input
                  className="input"
                  placeholder="AED"
                  maxLength={3}
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                />
              </div>
              <div>
                <label className="label">Symbol *</label>
                <input
                  className="input"
                  placeholder="د.إ"
                  value={form.symbol}
                  onChange={(e) => setForm({ ...form, symbol: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label">Name *</label>
              <input
                className="input"
                placeholder="UAE Dirham"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Units per ₹1 *</label>
              <input
                className="input"
                placeholder="0.044"
                value={form.ratePerInr}
                onChange={(e) => setForm({ ...form, ratePerInr: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="label">Locale</label>
                <input
                  className="input"
                  value={form.locale}
                  onChange={(e) => setForm({ ...form, locale: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Decimals</label>
                <input
                  className="input"
                  value={form.decimals}
                  onChange={(e) => setForm({ ...form, decimals: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Order</label>
                <input
                  className="input"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
            </div>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[hsl(var(--accent))]"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Offer it in the switcher
              </span>
            </label>
            <button
              className="btn-primary w-full text-2xs uppercase tracking-widest"
              onClick={add}
              disabled={busy || !form.code || !form.label || !form.symbol || !form.ratePerInr}
            >
              {busy ? 'Saving…' : 'Save currency'}
            </button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
