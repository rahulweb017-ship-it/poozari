'use client';

import { AdminShell } from '@/components/admin-shell';
import { api } from '@/lib/client';
import {
  formatInr,
  type City,
  type NamedEntity,
  type Puja,
  type Temple,
} from '@poozari/shared';
import { useEffect, useState } from 'react';

interface PackageDraft {
  name: string;
  priceInr: string;
  inclusions: string; // comma-separated in the form
}

const EMPTY_PACKAGE: PackageDraft = { name: 'Standard', priceInr: '5100', inclusions: '' };

const EMPTY_FORM = {
  title: '',
  slug: '',
  summary: '',
  description: '',
  imageUrl: '',
  locationType: 'HOME',
  templeId: '',
  cityId: '',
  isActive: true,
  deityIds: [] as string[],
  festivalIds: [] as string[] ,
  benefitIds: [] as string[],
};

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function toggleId(list: string[], id: string) {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
}

export default function AdminPujasPage() {
  const [pujas, setPujas] = useState<Puja[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [temples, setTemples] = useState<Temple[]>([]);
  const [deities, setDeities] = useState<NamedEntity[]>([]);
  const [festivals, setFestivals] = useState<NamedEntity[]>([]);
  const [benefits, setBenefits] = useState<NamedEntity[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [packages, setPackages] = useState<PackageDraft[]>([EMPTY_PACKAGE]);

  async function load() {
    const [p, c, t, d, f, b] = await Promise.all([
      api.adminListPujas(),
      api.listCities(),
      api.listTemples(),
      api.listDeities(),
      api.listFestivals(),
      api.listBenefits(),
    ]);
    setPujas(p);
    setCities(c);
    setTemples(t);
    setDeities(d);
    setFestivals(f);
    setBenefits(b);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPackages([EMPTY_PACKAGE]);
    setError('');
    setMsg('');
  }

  function startEdit(p: Puja) {
    setEditingId(p.id);
    setError('');
    setMsg('');
    setForm({
      title: p.title,
      slug: p.slug,
      summary: p.summary,
      description: p.description,
      imageUrl: p.imageUrl ?? '',
      locationType: p.locationType,
      templeId: p.temple?.id ?? '',
      cityId: p.city?.id ?? '',
      isActive: p.isActive,
      deityIds: p.deities.map((d) => d.id),
      festivalIds: p.festivals.map((f) => f.id),
      benefitIds: p.benefits.map((b) => b.id),
    });
    setPackages(
      p.packages.length
        ? p.packages.map((pk) => ({
            name: pk.name,
            priceInr: String(pk.priceInr),
            inclusions: pk.inclusions.join(', '),
          }))
        : [EMPTY_PACKAGE],
    );
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit() {
    setError('');
    setMsg('');
    setBusy(true);
    try {
      const pkgs = packages
        .filter((p) => p.name.trim() && Number(p.priceInr) > 0)
        .map((p) => ({
          name: p.name.trim(),
          description: '',
          priceInr: Number(p.priceInr) || 0,
          inclusions: p.inclusions.split(',').map((s) => s.trim()).filter(Boolean),
        }));
      if (pkgs.length === 0) {
        setError('Add at least one package with a name and price.');
        setBusy(false);
        return;
      }
      const payload = {
        title: form.title,
        slug: form.slug || slugify(form.title),
        summary: form.summary,
        description: form.description,
        imageUrl: form.imageUrl || undefined,
        locationType: form.locationType,
        templeId: form.templeId || undefined,
        cityId: form.cityId || undefined,
        isActive: form.isActive,
        deityIds: form.deityIds,
        festivalIds: form.festivalIds,
        benefitIds: form.benefitIds,
        packages: pkgs,
      };
      if (editingId) {
        await api.adminUpdatePuja(editingId, payload);
        setMsg('Puja updated.');
      } else {
        await api.adminCreatePuja(payload);
        setMsg('Puja created.');
      }
      resetForm();
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not save puja');
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: Puja) {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone. (If it has bookings, deactivate it instead.)`)) return;
    setError('');
    setMsg('');
    try {
      await api.adminDeletePuja(p.id);
      setMsg(`Deleted "${p.title}".`);
      if (editingId === p.id) resetForm();
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not delete puja');
    }
  }

  async function toggleActive(p: Puja) {
    setError('');
    try {
      await api.adminUpdatePuja(p.id, { isActive: !p.isActive });
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not update puja');
    }
  }

  const LOCATION_LABELS: Record<string, string> = {
    HOME: '🏠 Home',
    TEERTH: '🛕 Teerth',
    TEMPLE: '⛩️ Temple',
  };

  return (
    <AdminShell>
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">Pujas</h1>
        <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Create, edit and manage ritual listings.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Create / edit form */}
        <div className="card self-start p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
              {editingId ? '✏️ Edit Puja' : '🪔 Create Puja Listing'}
            </h3>
            {editingId ? (
              <button className="text-2xs font-bold uppercase tracking-wider text-accent hover:underline" onClick={resetForm}>
                + New puja
              </button>
            ) : null}
          </div>
          {error ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}
          {msg ? <p className="mt-3 rounded-2xl bg-green-50 p-3 text-xs text-green-700">{msg}</p> : null}

          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Title *</label>
              <input
                className="input"
                placeholder="e.g. Mahabhishek"
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value, slug: editingId ? form.slug : slugify(e.target.value) })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Slug</label>
                <input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
              </div>
              <div>
                <label className="label">Location type</label>
                <select className="input" value={form.locationType} onChange={(e) => setForm({ ...form, locationType: e.target.value })}>
                  <option value="HOME">🏠 Home</option>
                  <option value="TEERTH">🛕 Teerth</option>
                  <option value="TEMPLE">⛩️ Temple</option>
                </select>
              </div>
            </div>
            <div>
              <label className="label">Summary</label>
              <input className="input" placeholder="One-line summary for cards" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input" rows={3} placeholder="Detailed scriptural background..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">Image URL</label>
              <input className="input" placeholder="https://…/cover.jpg" value={form.imageUrl} onChange={(e) => setForm({ ...form, imageUrl: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Temple (optional)</label>
                <select className="input" value={form.templeId} onChange={(e) => setForm({ ...form, templeId: e.target.value })}>
                  <option value="">— None —</option>
                  {temples.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}{t.city ? ` · ${t.city.name}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">City (optional)</label>
                <select className="input" value={form.cityId} onChange={(e) => setForm({ ...form, cityId: e.target.value })}>
                  <option value="">— None —</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Relation pickers */}
            <RelationChips label="Deities" options={deities} selected={form.deityIds} onToggle={(id) => setForm({ ...form, deityIds: toggleId(form.deityIds, id) })} />
            <RelationChips label="Festivals" options={festivals} selected={form.festivalIds} onToggle={(id) => setForm({ ...form, festivalIds: toggleId(form.festivalIds, id) })} />
            <RelationChips label="Benefits" options={benefits} selected={form.benefitIds} onToggle={(id) => setForm({ ...form, benefitIds: toggleId(form.benefitIds, id) })} />

            {/* Packages editor */}
            <div className="rounded-2xl border bg-gray-50/50 p-4" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-3xs font-extrabold uppercase tracking-wider text-muted-foreground">
                  Packages *
                </label>
                <button
                  type="button"
                  className="text-2xs font-bold uppercase tracking-wider text-accent hover:underline"
                  onClick={() => setPackages([...packages, { name: '', priceInr: '', inclusions: '' }])}
                >
                  + Add package
                </button>
              </div>
              <div className="space-y-3">
                {packages.map((pk, i) => (
                  <div key={i} className="rounded-xl border bg-white p-3" style={{ borderColor: 'hsl(var(--border) / 0.4)' }}>
                    <div className="flex items-center gap-2">
                      <input
                        className="input flex-1 py-1.5 text-xs"
                        placeholder="Package name"
                        value={pk.name}
                        onChange={(e) => setPackages(packages.map((x, xi) => (xi === i ? { ...x, name: e.target.value } : x)))}
                      />
                      <input
                        className="input w-24 py-1.5 text-xs"
                        placeholder="₹ Price"
                        value={pk.priceInr}
                        onChange={(e) => setPackages(packages.map((x, xi) => (xi === i ? { ...x, priceInr: e.target.value } : x)))}
                      />
                      {packages.length > 1 ? (
                        <button
                          type="button"
                          className="text-xs font-bold text-red-600 hover:underline"
                          onClick={() => setPackages(packages.filter((_, xi) => xi !== i))}
                          title="Remove package"
                        >
                          ✕
                        </button>
                      ) : null}
                    </div>
                    <input
                      className="input mt-2 py-1.5 text-xs"
                      placeholder="Inclusions (comma separated)"
                      value={pk.inclusions}
                      onChange={(e) => setPackages(packages.map((x, xi) => (xi === i ? { ...x, inclusions: e.target.value } : x)))}
                    />
                  </div>
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[hsl(var(--accent))]"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">Active (visible on site)</span>
            </label>

            <button className="btn-primary w-full text-2xs uppercase tracking-widest" onClick={submit} disabled={busy || !form.title}>
              {busy ? 'Saving…' : editingId ? 'Update puja' : 'Create puja'}
            </button>
          </div>
        </div>

        {/* List */}
        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
            All Listings ({pujas.length})
          </h3>
          <div className="mt-5 space-y-3">
            {pujas.map((p) => (
              <div key={p.id} className="card bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{p.title}</span>
                      {!p.isActive ? <span className="badge bg-gray-200 text-gray-500">Hidden</span> : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-2xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      <span className="badge bg-gray-100 text-gray-700">{LOCATION_LABELS[p.locationType] || p.locationType}</span>
                      <span className="font-semibold">/{p.slug}</span>
                      <span>{p.packages.length} package{p.packages.length === 1 ? '' : 's'}</span>
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-black text-accent">{formatInr(p.startingPriceInr)}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
                  <button className="btn-outline text-2xs uppercase tracking-wider" onClick={() => startEdit(p)}>
                    ✏️ Edit
                  </button>
                  <button className="btn-outline text-2xs uppercase tracking-wider" onClick={() => toggleActive(p)}>
                    {p.isActive ? '⊘ Deactivate' : '✓ Activate'}
                  </button>
                  <button
                    className="rounded-xl border border-red-200 px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50"
                    onClick={() => remove(p)}
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
            {pujas.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">No listings yet.</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}

/** Toggle-chip multi-select for deity/festival/benefit relations. */
function RelationChips({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: NamedEntity[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  if (options.length === 0) return null;
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((o) => {
          const active = selected.includes(o.id);
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onToggle(o.id)}
              className={`rounded-full border px-2.5 py-1 text-3xs font-bold uppercase tracking-wider transition-colors ${
                active ? 'border-transparent bg-accent text-white' : 'bg-white text-muted-foreground hover:text-foreground'
              }`}
              style={active ? {} : { borderColor: 'hsl(var(--border) / 0.6)' }}
            >
              {o.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
