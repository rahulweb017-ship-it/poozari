'use client';

import {
  ActionButton,
  AdminPageHeader,
  DataTable,
  DetailList,
  Modal,
  Notice,
  StatusPill,
  type Column,
  type FilterDef,
} from '@/components/admin-kit';
import { AdminShell } from '@/components/admin-shell';
import { api } from '@/lib/client';
import { formatMoney, type Currency } from '@poozari/shared';
import { useCallback, useEffect, useState } from 'react';

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
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewingCode, setViewingCode] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const list = await api.adminListCurrencies();
    setRates(list);
    setDrafts(Object.fromEntries(list.map((r) => [r.code, String(r.ratePerInr)])));
  }

  useEffect(() => {
    load()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const viewing = viewingCode ? rates.find((r) => r.code === viewingCode) ?? null : null;

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingCode(null);
    setForm(EMPTY);
    setFormError('');
  }, []);
  const closeView = useCallback(() => setViewingCode(null), []);

  function openCreate() {
    setEditingCode(null);
    setForm(EMPTY);
    setFormError('');
    setFormOpen(true);
  }

  function startEdit(rate: Currency) {
    setViewingCode(null);
    setEditingCode(rate.code);
    setFormError('');
    setForm({
      code: rate.code,
      label: rate.label,
      symbol: rate.symbol,
      ratePerInr: String(rate.ratePerInr),
      locale: rate.locale,
      decimals: String(rate.decimals),
      sortOrder: String(rate.sortOrder),
      isActive: rate.isActive,
    });
    setFormOpen(true);
  }

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
    setMsg('');
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
    setMsg('');
    try {
      await api.adminDeleteCurrency(rate.code);
      setMsg(`Removed ${rate.code}.`);
      setViewingCode(null);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not remove the currency');
    }
  }

  async function add() {
    setBusy(true);
    setFormError('');
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
      closeForm();
      setMsg('Currency saved.');
      await load();
    } catch (e: any) {
      setFormError(e.message ?? 'Could not save the currency');
    } finally {
      setBusy(false);
    }
  }

  // A plain render function, not a component: a component declared here would remount
  // on every keystroke and drop input focus. It sits in a clickable row, so clicks stop here.
  function renderRateEditor(rate: Currency) {
    const isBase = rate.code === 'INR';
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <input
          aria-label={`Units of ${rate.code} per ₹1`}
          className="input w-28 py-1.5 text-xs"
          value={drafts[rate.code] ?? ''}
          disabled={isBase}
          onChange={(e) => setDrafts({ ...drafts, [rate.code]: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isBase && drafts[rate.code] !== String(rate.ratePerInr)) saveRate(rate.code);
          }}
        />
        {!isBase ? (
          <ActionButton
            tone="accent"
            onClick={() => saveRate(rate.code)}
            disabled={drafts[rate.code] === String(rate.ratePerInr)}
          >
            Save rate
          </ActionButton>
        ) : null}
      </div>
    );
  }

  const columns: Column<Currency>[] = [
    {
      key: 'code',
      header: 'Currency',
      render: (rate) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-sm font-bold text-accent">
            {rate.symbol}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 font-bold text-foreground">
              {rate.code}
              {rate.code === 'INR' ? <span className="badge bg-accent-soft text-accent">Base</span> : null}
            </div>
            <div className="text-3xs text-muted-foreground">{rate.label}</div>
          </div>
        </div>
      ),
    },
    { key: 'rate', header: 'Units per ₹1', render: renderRateEditor },
    {
      key: 'preview',
      header: `₹${SAMPLE_INR.toLocaleString('en-IN')} shows as`,
      render: (rate) => <span className="font-bold text-accent">{formatMoney(SAMPLE_INR, rate)}</span>,
    },
    { key: 'format', header: 'Format', render: (rate) => `${rate.locale} · ${rate.decimals} dp` },
    { key: 'order', header: 'Order', render: (rate) => rate.sortOrder },
    {
      key: 'status',
      header: 'Switcher',
      render: (rate) => <StatusPill on={rate.isActive} onLabel="Shown" offLabel="Hidden" />,
    },
  ];

  const filters: FilterDef<Currency>[] = [
    {
      key: 'status',
      label: 'Switcher',
      options: [
        { value: 'shown', label: 'Shown' },
        { value: 'hidden', label: 'Hidden' },
      ],
      match: (rate, v) => (v === 'shown' ? rate.isActive : !rate.isActive),
    },
  ];

  return (
    <AdminShell>
      <AdminPageHeader
        title="Currencies"
        subtitle="Display rates for the currency switcher."
        actions={
          <button className="btn-primary text-2xs uppercase tracking-wider" onClick={openCreate}>
            + Add currency
          </button>
        }
      />

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

      <Notice error={error} message={msg} />

      <DataTable
        rows={rates}
        columns={columns}
        getRowId={(rate) => rate.code}
        loading={loading}
        searchText={(rate) => [rate.code, rate.label, rate.symbol, rate.locale].join(' ')}
        searchPlaceholder="Search code, name, symbol, locale…"
        filters={filters}
        emptyText="No currencies yet."
        onRowClick={(rate) => setViewingCode(rate.code)}
        actions={(rate) => (
          <>
            <ActionButton onClick={() => setViewingCode(rate.code)}>View</ActionButton>
            <ActionButton tone="accent" onClick={() => startEdit(rate)} disabled={rate.code === 'INR'}>
              Edit
            </ActionButton>
            {rate.code !== 'INR' ? (
              <>
                <ActionButton tone={rate.isActive ? 'default' : 'success'} onClick={() => toggleActive(rate)}>
                  {rate.isActive ? 'Hide' : 'Show'}
                </ActionButton>
                <ActionButton tone="danger" onClick={() => remove(rate)}>Remove</ActionButton>
              </>
            ) : null}
          </>
        )}
      />

      {/* Details popup */}
      <Modal
        open={Boolean(viewing)}
        title={viewing ? `${viewing.symbol} ${viewing.code}` : ''}
        onClose={closeView}
        footer={
          viewing && viewing.code !== 'INR' ? (
            <>
              <button
                className="rounded-xl border border-red-200 px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50"
                onClick={() => remove(viewing)}
              >
                Remove
              </button>
              <button className="btn-outline text-2xs uppercase tracking-wider" onClick={() => toggleActive(viewing)}>
                {viewing.isActive ? 'Hide' : 'Show'}
              </button>
              <button className="btn-primary text-2xs uppercase tracking-wider" onClick={() => startEdit(viewing)}>
                Edit
              </button>
            </>
          ) : null
        }
      >
        {viewing ? (
          <div className="space-y-5">
            <div className="rounded-2xl bg-accent-soft p-4 text-center">
              <div className="text-3xs font-extrabold uppercase tracking-wider text-muted-foreground">
                ₹{SAMPLE_INR.toLocaleString('en-IN')} shows as
              </div>
              <div className="mt-1 font-display text-2xl font-black text-accent">
                {formatMoney(SAMPLE_INR, viewing)}
              </div>
            </div>
            <DetailList
              items={[
                { label: 'Code', value: viewing.code },
                { label: 'Name', value: viewing.label },
                { label: 'Symbol', value: viewing.symbol },
                { label: 'Units per ₹1', value: String(viewing.ratePerInr) },
                { label: 'Locale', value: viewing.locale },
                { label: 'Decimals', value: String(viewing.decimals) },
                { label: 'Order', value: String(viewing.sortOrder) },
                { label: 'Switcher', value: viewing.isActive ? 'Shown' : 'Hidden' },
              ]}
            />
            {viewing.code === 'INR' ? (
              <p className="text-3xs font-semibold uppercase tracking-wider text-muted-foreground">
                The base currency is fixed at 1 and cannot be hidden.
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* Create / edit popup */}
      <Modal
        open={formOpen}
        title={editingCode ? `Edit ${editingCode}` : 'Add currency'}
        onClose={closeForm}
        size="sm"
        footer={
          <>
            <button className="btn-outline text-2xs uppercase tracking-wider" onClick={closeForm} disabled={busy}>
              Cancel
            </button>
            <button
              className="btn-primary text-2xs uppercase tracking-widest"
              onClick={add}
              disabled={busy || !form.code || !form.label || !form.symbol || !form.ratePerInr}
            >
              {busy ? 'Saving…' : 'Save currency'}
            </button>
          </>
        }
      >
        <Notice error={formError} />
        <p className="mb-4 text-2xs text-muted-foreground">Saving an existing code replaces its settings.</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">ISO code *</label>
              <input
                className="input"
                placeholder="AED"
                maxLength={3}
                value={form.code}
                disabled={Boolean(editingCode)}
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
        </div>
      </Modal>
    </AdminShell>
  );
}
