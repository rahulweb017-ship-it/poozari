'use client';

import { AdminShell } from '@/components/admin-shell';
import { api } from '@/lib/client';
import type { City } from '@poozari/shared';
import { useEffect, useState } from 'react';

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

interface EntityConfig {
  key: string;
  label: string;
  /** Singular form used in headings/buttons, e.g. "City". */
  singular: string;
  icon: string;
  hasState?: boolean;
  hasCity?: boolean;
  list: () => Promise<any[]>;
  create: (d: any) => Promise<any>;
  update: (id: string, d: any) => Promise<any>;
  remove: (id: string) => Promise<any>;
  /** Extra context shown under each list item's name. */
  subline?: (item: any) => string;
}

const EMPTY_FORM = { name: '', slug: '', state: '', description: '', imageUrl: '', cityId: '' };

const ENTITIES: EntityConfig[] = [
  {
    key: 'cities',
    label: 'Cities',
    singular: 'City',
    icon: '🏙️',
    hasState: true,
    list: () => api.listCities(),
    create: (d) => api.adminCreateCity(d),
    update: (id, d) => api.adminUpdateCity(id, d),
    remove: (id) => api.adminDeleteCity(id),
    subline: (c) => [c.state, typeof c.templeCount === 'number' ? `${c.templeCount} temples` : ''].filter(Boolean).join(' · '),
  },
  {
    key: 'temples',
    label: 'Temples',
    singular: 'Temple',
    icon: '🛕',
    hasState: true,
    hasCity: true,
    list: () => api.listTemples(),
    create: (d) => api.adminCreateTemple(d),
    update: (id, d) => api.adminUpdateTemple(id, d),
    remove: (id) => api.adminDeleteTemple(id),
    subline: (t) => [t.city?.name, t.state].filter(Boolean).join(' · '),
  },
  {
    key: 'deities',
    label: 'Deities',
    singular: 'Deity',
    icon: '🙏',
    list: () => api.listDeities(),
    create: (d) => api.adminCreateDeity(d),
    update: (id, d) => api.adminUpdateDeity(id, d),
    remove: (id) => api.adminDeleteDeity(id),
  },
  {
    key: 'festivals',
    label: 'Festivals',
    singular: 'Festival',
    icon: '🎉',
    list: () => api.listFestivals(),
    create: (d) => api.adminCreateFestival(d),
    update: (id, d) => api.adminUpdateFestival(id, d),
    remove: (id) => api.adminDeleteFestival(id),
  },
  {
    key: 'benefits',
    label: 'Benefits',
    singular: 'Benefit',
    icon: '✨',
    list: () => api.listBenefits(),
    create: (d) => api.adminCreateBenefit(d),
    update: (id, d) => api.adminUpdateBenefit(id, d),
    remove: (id) => api.adminDeleteBenefit(id),
  },
];

export default function AdminCatalogPage() {
  const [active, setActive] = useState('cities');
  const [cities, setCities] = useState<City[]>([]);

  useEffect(() => {
    api.listCities().then(setCities).catch(() => undefined);
  }, []);

  const config = ENTITIES.find((e) => e.key === active)!;

  return (
    <AdminShell>
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">Catalog</h1>
        <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Manage cities, temples, deities, festivals and benefits.
        </p>
      </div>

      {/* Entity tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {ENTITIES.map((e) => (
          <button
            key={e.key}
            onClick={() => setActive(e.key)}
            className={`rounded-2xl px-4 py-2.5 text-2xs font-bold uppercase tracking-wider transition-all ${
              active === e.key
                ? 'bg-accent text-white shadow-md'
                : 'bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
            style={active === e.key ? {} : { border: '1px solid hsl(var(--border) / 0.5)' }}
          >
            {e.icon} {e.label}
          </button>
        ))}
      </div>

      {/* Remount per tab so each section loads fresh and resets its form. */}
      <CrudSection key={config.key} config={config} cities={cities} />
    </AdminShell>
  );
}

function CrudSection({ config, cities }: { config: EntityConfig; cities: City[] }) {
  const [items, setItems] = useState<any[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setItems(await config.list());
  }

  useEffect(() => {
    load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.key]);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setMsg('');
  }

  function startEdit(item: any) {
    setEditingId(item.id);
    setError('');
    setMsg('');
    setForm({
      name: item.name ?? '',
      slug: item.slug ?? '',
      state: item.state ?? '',
      description: item.description ?? '',
      imageUrl: item.imageUrl ?? '',
      cityId: item.cityId ?? '',
    });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit() {
    setError('');
    setMsg('');
    setBusy(true);
    try {
      const payload: any = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        description: form.description,
        imageUrl: form.imageUrl || undefined,
      };
      if (config.hasState) payload.state = form.state;
      if (config.hasCity) {
        if (!form.cityId) {
          setError('Please choose a city for this temple.');
          setBusy(false);
          return;
        }
        payload.cityId = form.cityId;
      }
      if (editingId) {
        await config.update(editingId, payload);
        setMsg(`${config.singular} updated.`);
      } else {
        await config.create(payload);
        setMsg(`${config.singular} created.`);
      }
      resetForm();
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: any) {
    if (!window.confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    setError('');
    setMsg('');
    try {
      await config.remove(item.id);
      setMsg(`Deleted "${item.name}".`);
      if (editingId === item.id) resetForm();
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not delete');
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Create / edit form */}
      <div className="card self-start p-6">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
            {editingId ? `✏️ Edit ${config.singular}` : `${config.icon} Add ${config.singular}`}
          </h3>
          {editingId ? (
            <button className="text-2xs font-bold uppercase tracking-wider text-accent hover:underline" onClick={resetForm}>
              + New
            </button>
          ) : null}
        </div>
        {error ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}
        {msg ? <p className="mt-3 rounded-2xl bg-green-50 p-3 text-xs text-green-700">{msg}</p> : null}
        <div className="mt-5 space-y-4">
          <div>
            <label className="label">Name *</label>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value, slug: editingId ? form.slug : slugify(e.target.value) })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Slug</label>
              <input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            {config.hasState ? (
              <div>
                <label className="label">State</label>
                <input className="input" placeholder="e.g. Uttar Pradesh" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </div>
            ) : null}
          </div>
          {config.hasCity ? (
            <div>
              <label className="label">City *</label>
              <select className="input" value={form.cityId} onChange={(e) => setForm({ ...form, cityId: e.target.value })}>
                <option value="">— Choose a city —</option>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          ) : null}
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Image URL</label>
            <input className="input" placeholder="https://…/image.jpg" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
          </div>
          <button className="btn-primary w-full text-2xs uppercase tracking-widest" onClick={submit} disabled={busy || !form.name}>
            {busy ? 'Saving…' : editingId ? 'Update' : 'Create'}
          </button>
        </div>
      </div>

      {/* List */}
      <div>
        <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
          {config.label} ({items.length})
        </h3>
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <div key={item.id} className="card bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm text-foreground">{item.name}</div>
                  <div className="mt-1 text-2xs font-semibold" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    /{item.slug}
                    {config.subline?.(item) ? ` · ${config.subline(item)}` : ''}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
                <button className="btn-outline text-2xs uppercase tracking-wider" onClick={() => startEdit(item)}>
                  ✏️ Edit
                </button>
                <button
                  className="rounded-xl border border-red-200 px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50"
                  onClick={() => remove(item)}
                >
                  🗑 Delete
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">No {config.label.toLowerCase()} yet.</p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
