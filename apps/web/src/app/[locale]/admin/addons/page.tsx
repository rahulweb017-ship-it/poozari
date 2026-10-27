'use client';

import {
  ActionButton,
  AdminPageHeader,
  DataTable,
  DetailList,
  Modal,
  Notice,
  StatusPill,
  Thumb,
  type Column,
  type FilterDef,
} from '@/components/admin-kit';
import { AdminShell } from '@/components/admin-shell';
import { ImagePicker } from '@/components/image-picker';
import { api } from '@/lib/client';
import { formatInr, slugify, type Addon } from '@poozari/shared';
import { useCallback, useEffect, useState } from 'react';

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
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<Addon | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setAddons(await api.adminListAddons());
  }

  useEffect(() => {
    load()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY);
    setFormError('');
  }, []);
  const closeView = useCallback(() => setViewing(null), []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setFormError('');
    setFormOpen(true);
  }

  function edit(addon: Addon) {
    setViewing(null);
    setEditingId(addon.id);
    setFormError('');
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
    setFormOpen(true);
  }

  async function save() {
    setBusy(true);
    setFormError('');
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
      closeForm();
      await load();
    } catch (e: any) {
      setFormError(e.message ?? 'Could not save the add-on');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(addon: Addon) {
    setError('');
    setMsg('');
    try {
      await api.adminUpdateAddon(addon.id, { isActive: !addon.isActive });
      setViewing(null);
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
    setMsg('');
    try {
      await api.adminDeleteAddon(addon.id);
      setMsg(`Removed ${addon.name}.`);
      setViewing(null);
      if (editingId === addon.id) closeForm();
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not remove the add-on');
    }
  }

  const columns: Column<Addon>[] = [
    {
      key: 'name',
      header: 'Add-on',
      render: (a) => (
        <div className="flex items-center gap-3">
          <Thumb src={a.imageUrl} label={a.name} />
          <div className="min-w-0">
            <div className="font-bold text-foreground">{a.name}</div>
            <div className="text-3xs text-muted-foreground">{a.nameHi || '—'}</div>
          </div>
        </div>
      ),
    },
    { key: 'slug', header: 'Slug', render: (a) => a.slug },
    {
      key: 'price',
      header: 'Price',
      render: (a) => <span className="font-bold text-accent">{formatInr(a.priceInr)}</span>,
    },
    { key: 'position', header: 'Position', render: (a) => a.sortOrder },
    {
      key: 'hindi',
      header: 'Hindi',
      render: (a) =>
        a.nameHi ? (
          <span className="badge bg-emerald-50 text-emerald-700">Yes</span>
        ) : (
          <span className="badge bg-amber-100 text-amber-700">No Hindi</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) => <StatusPill on={a.isActive} onLabel="Offered" offLabel="Hidden" />,
    },
  ];

  const filters: FilterDef<Addon>[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Offered' },
        { value: 'inactive', label: 'Hidden' },
      ],
      match: (a, v) => (v === 'active' ? a.isActive : !a.isActive),
    },
    {
      key: 'hindi',
      label: 'Hindi',
      options: [
        { value: 'yes', label: 'Has Hindi' },
        { value: 'no', label: 'Missing Hindi' },
      ],
      match: (a, v) => (v === 'yes') === Boolean(a.nameHi),
    },
  ];

  return (
    <AdminShell>
      <AdminPageHeader
        title="Add-ons"
        subtitle="Paid extras offered on every puja booking."
        actions={
          <button className="btn-primary text-2xs uppercase tracking-wider" onClick={openCreate}>
            + Add add-on
          </button>
        }
      />

      <div className="card mb-6 border-amber-200 bg-amber-50 p-5">
        <p className="text-xs font-bold text-amber-900">Changing a price does not change past bookings</p>
        <p className="mt-2 text-xs leading-relaxed text-amber-800">
          Each booking stores the name and price of what it bought, so editing an add-on only
          affects bookings made afterwards. Prefer <strong>Hide</strong> over <strong>Remove</strong>{' '}
          when you stop offering something — it keeps the add-on linked to its past bookings for
          reporting.
        </p>
      </div>

      <Notice error={error} message={msg} />

      <DataTable
        rows={addons}
        columns={columns}
        getRowId={(a) => a.id}
        loading={loading}
        searchText={(a) => [a.name, a.nameHi, a.slug, a.description, a.descriptionHi].filter(Boolean).join(' ')}
        searchPlaceholder="Search name, slug, description…"
        filters={filters}
        onRowClick={setViewing}
        emptyText="No add-ons yet. Add one and it appears on every booking form."
        actions={(a) => (
          <>
            <ActionButton onClick={() => setViewing(a)}>View</ActionButton>
            <ActionButton tone="accent" onClick={() => edit(a)}>Edit</ActionButton>
            <ActionButton tone={a.isActive ? 'default' : 'success'} onClick={() => toggleActive(a)}>
              {a.isActive ? 'Hide' : 'Show'}
            </ActionButton>
            <ActionButton tone="danger" onClick={() => remove(a)}>Remove</ActionButton>
          </>
        )}
      />

      {/* Details popup */}
      <Modal
        open={Boolean(viewing)}
        title={viewing?.name ?? ''}
        onClose={closeView}
        footer={
          viewing ? (
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
              <button className="btn-primary text-2xs uppercase tracking-wider" onClick={() => edit(viewing)}>
                Edit
              </button>
            </>
          ) : null
        }
      >
        {viewing ? (
          <div className="space-y-5">
            {viewing.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewing.imageUrl} alt="" className="h-32 w-32 rounded-2xl object-cover" />
            ) : null}
            <DetailList
              items={[
                { label: 'Hindi name', value: viewing.nameHi },
                { label: 'Slug', value: viewing.slug },
                { label: 'Price', value: formatInr(viewing.priceInr) },
                { label: 'Position', value: String(viewing.sortOrder) },
                { label: 'Status', value: viewing.isActive ? 'Offered on the booking form' : 'Hidden' },
                { label: 'Description', value: viewing.description },
                { label: 'Hindi description', value: viewing.descriptionHi },
              ]}
            />
          </div>
        ) : null}
      </Modal>

      {/* Create / edit popup */}
      <Modal
        open={formOpen}
        title={editingId ? 'Edit add-on' : 'Add an add-on'}
        onClose={closeForm}
        footer={
          <>
            <button className="btn-outline text-2xs uppercase tracking-wider" onClick={closeForm} disabled={busy}>
              Cancel
            </button>
            <button
              className="btn-primary text-2xs uppercase tracking-wider"
              disabled={busy || !form.name.trim() || !form.priceInr}
              onClick={save}
            >
              {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add add-on'}
            </button>
          </>
        }
      >
        <Notice error={formError} />
        <p className="mb-4 text-2xs text-muted-foreground">
          Hindi is optional — leave it blank and Hindi readers see the English.
        </p>
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
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
          <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
      </Modal>
    </AdminShell>
  );
}
