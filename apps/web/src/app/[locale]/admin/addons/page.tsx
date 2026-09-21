'use client';

import { AdminShell } from '@/components/admin-shell';
import { ImagePicker } from '@/components/image-picker';
import { api } from '@/lib/client';
import { formatInr, slugify, type Addon } from '@poozari/shared';
import { useEffect, useState } from 'react';

const EMPTY = {
  name: '',
  nameHi: '',
  slug: '',
  description: '',
  descriptionHi: '',
  priceInr: '',
  imageUrl: '',
  sortOrder: '9',
  isActive: true,
};

type FormState = typeof EMPTY;

export default function AdminAddonsPage() {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setAddons(await api.adminListAddons());
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  function edit(addon: Addon) {
    setEditingId(addon.id);
    setForm({
      name: addon.name,
      nameHi: addon.nameHi,
      slug: addon.slug,
      description: addon.description,
      descriptionHi: addon.descriptionHi,
      priceInr: String(addon.priceInr),
      imageUrl: addon.imageUrl ?? '',
      sortOrder: String(addon.sortOrder),
      isActive: addon.isActive,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
  }

  async function save() {
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const payload = {
        name: form.name.trim(),
        nameHi: form.nameHi.trim(),
        // An empty slug is derived from the English name, the same way the
        // puja form does it.
        slug: form.slug.trim() || slugify(form.name),
        description: form.description.trim(),
        descriptionHi: form.descriptionHi.trim(),
        priceInr: Number(form.priceInr) || 0,
        imageUrl: form.imageUrl.trim() || undefined,
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };
      if (editingId) {
        await api.adminUpdateAddon(editingId, payload);
        setMsg(`Updated ${payload.name}.`);
      } else {
        await api.adminCreateAddon(payload);
        setMsg(`Added ${payload.name}.`);
      }
      cancelEdit();
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not save the add-on');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(addon: Addon) {
    setError('');
    try {
      await api.adminUpdateAddon(addon.id, { isActive: !addon.isActive });
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not update the add-on');
    }
  }

  async function remove(addon: Addon) {
    if (
      !window.confirm(
        `Remove ${addon.name}? Past bookings keep what they were charged, but it disappears from the booking form. Hiding it is usually enough.`,
      )
    ) {
      return;
    }
    setError('');
    try {
      await api.adminDeleteAddon(addon.id);
      setMsg(`Removed ${addon.name}.`);
      if (editingId === addon.id) cancelEdit();
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not remove the add-on');
    }
  }

  return (
    <AdminShell>
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">
          Add-ons
        </h1>
        <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Paid extras offered on every puja booking.
        </p>
      </div>

      <div className="card mb-6 border-amber-200 bg-amber-50 p-5">
        <p className="text-xs font-bold text-amber-900">Changing a price does not change past bookings</p>
        <p className="mt-2 text-xs leading-relaxed text-amber-800">
          Each booking stores the name and price of what it bought, so editing an add-on only
          affects bookings made afterwards. Prefer <strong>Hide</strong> over <strong>Remove</strong>{' '}
          when you stop offering something — it keeps the add-on linked to its past bookings for
          reporting.
        </p>
      </div>

      {error ? (
        <p className="mb-4 rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>
      ) : null}
      {msg ? (
        <p className="mb-4 rounded-2xl bg-green-50 p-3 text-xs font-semibold text-green-700">{msg}</p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Listing */}
        <div className="lg:col-span-2">
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
            Add-ons ({addons.length})
          </h3>
          <div className="mt-5 space-y-3">
            {addons.length === 0 ? (
              <p className="card bg-white p-6 text-center text-xs text-muted-foreground">
                No add-ons yet. Create one on the right and it appears on every booking form.
              </p>
            ) : null}

            {addons.map((addon) => (
              <div key={addon.id} className="card bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base font-black text-foreground">
                        {addon.name}
                      </span>
                      {!addon.isActive ? (
                        <span className="badge bg-gray-200 text-gray-500">Hidden</span>
                      ) : null}
                      {!addon.nameHi ? (
                        <span className="badge bg-amber-100 text-amber-700">No Hindi</span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 text-2xs text-muted-foreground">
                      {addon.nameHi ? `${addon.nameHi} · ` : ''}
                      {addon.slug} · position {addon.sortOrder}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-sm text-accent">{formatInr(addon.priceInr)}</div>
                  </div>
                </div>

                <div
                  className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3"
                  style={{ borderColor: 'hsl(var(--border) / 0.3)' }}
                >
                  <button
                    className="btn-outline text-2xs uppercase tracking-wider"
                    onClick={() => edit(addon)}
                  >
                    ✎ Edit
                  </button>
                  <button
                    className="btn-outline text-2xs uppercase tracking-wider"
                    onClick={() => toggleActive(addon)}
                  >
                    {addon.isActive ? '⊘ Hide' : '✓ Show'}
                  </button>
                  <button
                    className="rounded-xl border border-red-200 px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50"
                    onClick={() => remove(addon)}
                  >
                    🗑 Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create / edit */}
        <div className="card self-start p-6">
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
            {editingId ? 'Edit add-on' : 'Add an add-on'}
          </h3>
          <p className="mt-1.5 text-2xs text-muted-foreground">
            Hindi is optional — leave it blank and Hindi readers see the English.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Name (English) *</label>
              <input
                className="input"
                placeholder="Fruits &amp; Sweets"
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    name: e.target.value,
                    // Only auto-slug while creating; changing a live slug would
                    // orphan nothing but is still a surprise.
                    slug: editingId ? f.slug : slugify(e.target.value),
                  }))
                }
              />
            </div>
            <div>
              <label className="label">नाम (Hindi)</label>
              <input
                className="input"
                placeholder="फल और मिठाई"
                value={form.nameHi}
                onChange={(e) => setForm({ ...form, nameHi: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Slug *</label>
              <input
                className="input"
                placeholder="fruits-and-sweets"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
              />
            </div>
            <div>
              <label className="label">Description (English)</label>
              <textarea
                className="input"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div>
              <label className="label">विवरण (Hindi)</label>
              <textarea
                className="input"
                rows={2}
                value={form.descriptionHi}
                onChange={(e) => setForm({ ...form, descriptionHi: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Price ₹ *</label>
                <input
                  className="input"
                  placeholder="999"
                  value={form.priceInr}
                  onChange={(e) => setForm({ ...form, priceInr: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Position</label>
                <input
                  className="input"
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                />
              </div>
            </div>
            <ImagePicker
              label="Image"
              aspect="1/1"
              hint="Optional. Shown beside the add-on if your theme uses it."
              value={form.imageUrl}
              onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
            />
            <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[hsl(var(--accent))]"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Offer this on the booking form
            </label>

            <div className="flex gap-2">
              <button
                className="btn-primary flex-1 text-2xs uppercase tracking-widest"
                disabled={busy || !form.name.trim() || !form.priceInr}
                onClick={save}
              >
                {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add add-on'}
              </button>
              {editingId ? (
                <button
                  className="btn-outline text-2xs uppercase tracking-widest"
                  onClick={cancelEdit}
                  disabled={busy}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
