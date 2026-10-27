'use client';

import { Link } from '@/i18n/navigation';
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
import {
  DEFAULT_PUJA_FEATURES,
  DEFAULT_PUJA_FEATURES_HI,
  formatInr,
  type City,
  type NamedEntity,
  type Puja,
  type Temple,
} from '@poozari/shared';
import { useCallback, useEffect, useState } from 'react';

interface PackageDraft {
  name: string;
  /** Hindi name. Blank means Hindi readers see the English. */
  nameHi: string;
  priceInr: string;
  inclusions: string; // comma-separated in the form
}

const EMPTY_PACKAGE: PackageDraft = {
  name: 'Standard',
  nameHi: '',
  priceInr: '5100',
  inclusions: '',
};

const EMPTY_FORM = {
  title: '',
  slug: '',
  summary: '',
  description: '',
  // Hindi copy. Blank falls back to the English on /hi/ pages.
  titleHi: '',
  summaryHi: '',
  descriptionHi: '',
  // One bullet per line in the form; new pujas start from the standard four.
  features: DEFAULT_PUJA_FEATURES.join('\n'),
  featuresHi: DEFAULT_PUJA_FEATURES_HI.join('\n'),
  imageUrl: '',
  locationType: 'HOME',
  templeId: '',
  cityId: '',
  isActive: true,
  deityIds: [] as string[],
  festivalIds: [] as string[],
  benefitIds: [] as string[],
};

const LOCATION_LABELS: Record<string, string> = {
  HOME: '🏠 Home',
  TEERTH: '🛕 Teerth',
  TEMPLE: '⛩️ Temple',
  DIGITAL: '📿 Digital',
};

function slugify(v: string) {
  return v.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/** A one-per-line textarea as a list, dropping blank lines. */
function toLines(v: string) {
  return v.split('\n').map((s) => s.trim()).filter(Boolean);
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [packages, setPackages] = useState<PackageDraft[]>([EMPTY_PACKAGE]);
  const [viewing, setViewing] = useState<Puja | null>(null);

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
    load()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPackages([EMPTY_PACKAGE]);
    setFormError('');
  }, []);
  const closeView = useCallback(() => setViewing(null), []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setPackages([EMPTY_PACKAGE]);
    setFormError('');
    setFormOpen(true);
  }

  function startEdit(p: Puja) {
    setViewing(null);
    setEditingId(p.id);
    setFormError('');
    setForm({
      title: p.title,
      slug: p.slug,
      summary: p.summary,
      description: p.description,
      titleHi: p.titleHi ?? '',
      summaryHi: p.summaryHi ?? '',
      descriptionHi: p.descriptionHi ?? '',
      features: (p.features ?? []).join('\n'),
      featuresHi: (p.featuresHi ?? []).join('\n'),
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
            nameHi: pk.nameHi ?? '',
            priceInr: String(pk.priceInr),
            inclusions: pk.inclusions.join(', '),
          }))
        : [EMPTY_PACKAGE],
    );
    setFormOpen(true);
  }

  async function submit() {
    setFormError('');
    setMsg('');
    setBusy(true);
    try {
      const pkgs = packages
        .filter((p) => p.name.trim() && Number(p.priceInr) > 0)
        .map((p) => ({
          name: p.name.trim(),
          nameHi: p.nameHi.trim(),
          description: '',
          priceInr: Number(p.priceInr) || 0,
          inclusions: p.inclusions.split(',').map((s) => s.trim()).filter(Boolean),
        }));
      if (pkgs.length === 0) {
        setFormError('Add at least one package with a name and price.');
        setBusy(false);
        return;
      }
      const payload = {
        title: form.title,
        slug: form.slug || slugify(form.title),
        summary: form.summary,
        description: form.description,
        titleHi: form.titleHi,
        summaryHi: form.summaryHi,
        descriptionHi: form.descriptionHi,
        features: toLines(form.features),
        featuresHi: toLines(form.featuresHi),
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
      closeForm();
      await load();
    } catch (e: any) {
      setFormError(e.message ?? 'Could not save puja');
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
      setViewing(null);
      if (editingId === p.id) closeForm();
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not delete puja');
    }
  }

  async function toggleActive(p: Puja) {
    setError('');
    setMsg('');
    try {
      await api.adminUpdatePuja(p.id, { isActive: !p.isActive });
      setViewing(null);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not update puja');
    }
  }

  const columns: Column<Puja>[] = [
    {
      key: 'title',
      header: 'Puja',
      render: (p) => (
        <div className="flex items-center gap-3">
          <Thumb src={p.imageUrl} label={p.title} />
          <div className="min-w-0">
            <div className="font-bold text-foreground">{p.title}</div>
            <div className="text-3xs text-muted-foreground">/{p.slug}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (p) => (
        <span className="badge bg-gray-100 text-gray-700">{LOCATION_LABELS[p.locationType] || p.locationType}</span>
      ),
    },
    {
      key: 'place',
      header: 'Temple / City',
      className: 'max-w-[180px] truncate',
      render: (p) => [p.temple?.name, p.city?.name].filter(Boolean).join(' · ') || '—',
    },
    {
      key: 'deities',
      header: 'Deities',
      className: 'max-w-[160px] truncate',
      render: (p) => p.deities.map((d) => d.name).join(', ') || '—',
    },
    { key: 'packages', header: 'Packages', render: (p) => p.packages.length },
    {
      key: 'price',
      header: 'From',
      render: (p) => <span className="font-bold text-accent">{formatInr(p.startingPriceInr)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <StatusPill on={p.isActive} onLabel="Active" offLabel="Hidden" />,
    },
  ];

  const filters: FilterDef<Puja>[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Hidden' },
      ],
      match: (p, v) => (v === 'active' ? p.isActive : !p.isActive),
    },
    {
      key: 'type',
      label: 'Type',
      options: Object.entries(LOCATION_LABELS).map(([value, label]) => ({ value, label })),
      match: (p, v) => p.locationType === v,
    },
    {
      key: 'city',
      label: 'City',
      options: cities.map((c) => ({ value: c.id, label: c.name })),
      match: (p, v) => p.city?.id === v,
    },
    {
      key: 'temple',
      label: 'Temple',
      options: temples.map((t) => ({ value: t.id, label: t.name })),
      match: (p, v) => p.temple?.id === v,
    },
    {
      key: 'deity',
      label: 'Deity',
      options: deities.map((d) => ({ value: d.id, label: d.name })),
      match: (p, v) => p.deities.some((d) => d.id === v),
    },
    {
      key: 'festival',
      label: 'Festival',
      options: festivals.map((f) => ({ value: f.id, label: f.name })),
      match: (p, v) => p.festivals.some((f) => f.id === v),
    },
  ];

  return (
    <AdminShell>
      <AdminPageHeader
        title="Pujas"
        subtitle="Create, edit and manage ritual listings."
        actions={
          <>
            <Link href="/admin/import" className="btn-outline text-2xs uppercase tracking-wider">
              📥 Bulk import CSV
            </Link>
            <button className="btn-primary text-2xs uppercase tracking-wider" onClick={openCreate}>
              + Add puja
            </button>
          </>
        }
      />

      <Notice error={error} message={msg} />

      <DataTable
        rows={pujas}
        columns={columns}
        getRowId={(p) => p.id}
        loading={loading}
        searchText={(p) =>
          [
            p.title,
            p.titleHi,
            p.slug,
            p.summary,
            p.temple?.name,
            p.city?.name,
            ...p.deities.map((d) => d.name),
            ...p.festivals.map((f) => f.name),
            ...p.packages.map((pk) => pk.name),
          ]
            .filter(Boolean)
            .join(' ')
        }
        searchPlaceholder="Search title, slug, temple, deity, package…"
        filters={filters}
        onRowClick={setViewing}
        emptyText="No listings yet."
        actions={(p) => (
          <>
            <ActionButton onClick={() => setViewing(p)}>View</ActionButton>
            <ActionButton tone="accent" onClick={() => startEdit(p)}>Edit</ActionButton>
            <ActionButton tone={p.isActive ? 'default' : 'success'} onClick={() => toggleActive(p)}>
              {p.isActive ? 'Deactivate' : 'Activate'}
            </ActionButton>
            <ActionButton tone="danger" onClick={() => remove(p)}>Delete</ActionButton>
          </>
        )}
      />

      {/* Details popup */}
      <Modal
        open={Boolean(viewing)}
        title={viewing?.title ?? ''}
        onClose={closeView}
        size="lg"
        footer={
          viewing ? (
            <>
              <button
                className="rounded-xl border border-red-200 px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50"
                onClick={() => remove(viewing)}
              >
                Delete
              </button>
              <button className="btn-outline text-2xs uppercase tracking-wider" onClick={() => toggleActive(viewing)}>
                {viewing.isActive ? 'Deactivate' : 'Activate'}
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
            {viewing.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewing.imageUrl} alt="" className="max-h-56 w-full rounded-2xl object-cover" />
            ) : null}
            <DetailList
              items={[
                { label: 'Hindi title', value: viewing.titleHi },
                { label: 'Slug', value: `/${viewing.slug}` },
                { label: 'Location type', value: LOCATION_LABELS[viewing.locationType] || viewing.locationType },
                { label: 'Status', value: viewing.isActive ? 'Active (visible on site)' : 'Hidden' },
                { label: 'Temple', value: viewing.temple?.name },
                { label: 'City', value: viewing.city?.name },
                { label: 'Starting price', value: formatInr(viewing.startingPriceInr) },
                { label: 'Deities', value: viewing.deities.map((d) => d.name).join(', ') },
                { label: 'Festivals', value: viewing.festivals.map((f) => f.name).join(', ') },
                { label: 'Benefits', value: viewing.benefits.map((b) => b.name).join(', ') },
                { label: 'Summary', value: viewing.summary },
                { label: 'Hindi summary', value: viewing.summaryHi },
                { label: 'Features', value: (viewing.features ?? []).join(' · ') },
                { label: 'Description', value: viewing.description },
              ]}
            />
            <div>
              <div className="text-3xs font-extrabold uppercase tracking-widest text-muted-foreground">
                Packages ({viewing.packages.length})
              </div>
              <div className="mt-2 space-y-2">
                {viewing.packages.map((pk, i) => (
                  <div key={i} className="rounded-xl border p-3 text-xs" style={{ borderColor: 'hsl(var(--border) / 0.4)' }}>
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-foreground">
                        {pk.name}
                        {pk.nameHi ? <span className="ml-2 font-normal text-muted-foreground">{pk.nameHi}</span> : null}
                      </span>
                      <span className="font-bold text-accent">{formatInr(pk.priceInr)}</span>
                    </div>
                    {pk.inclusions.length ? (
                      <div className="mt-1 text-2xs text-muted-foreground">{pk.inclusions.join(', ')}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Create / edit popup */}
      <Modal
        open={formOpen}
        title={editingId ? '✏️ Edit Puja' : '🪔 Create Puja Listing'}
        onClose={closeForm}
        size="lg"
        footer={
          <>
            <button className="btn-outline text-2xs uppercase tracking-wider" onClick={closeForm}>
              Cancel
            </button>
            <button className="btn-primary text-2xs uppercase tracking-wider" onClick={submit} disabled={busy || !form.title}>
              {busy ? 'Saving…' : editingId ? 'Update puja' : 'Create puja'}
            </button>
          </>
        }
      >
        <Notice error={formError} />
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Title (English) *</label>
              <input
                className="input"
                placeholder="e.g. Mahabhishek"
                value={form.title}
                onChange={(e) =>
                  setForm({ ...form, title: e.target.value, slug: editingId ? form.slug : slugify(e.target.value) })
                }
              />
            </div>
            <div>
              <label className="label">शीर्षक (Hindi)</label>
              <input
                className="input"
                placeholder="जैसे महाभिषेक"
                value={form.titleHi}
                onChange={(e) => setForm({ ...form, titleHi: e.target.value })}
              />
            </div>
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
                <option value="DIGITAL">📿 Digital</option>
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Summary (English)</label>
              <input className="input" placeholder="One-line summary for cards" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
            </div>
            <div>
              <label className="label">सारांश (Hindi)</label>
              <input className="input" placeholder="कार्ड पर दिखने वाला एक-पंक्ति सारांश" value={form.summaryHi} onChange={(e) => setForm({ ...form, summaryHi: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Description (English)</label>
              <textarea className="input" rows={3} placeholder="Detailed scriptural background..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div>
              <label className="label">विवरण (Hindi)</label>
              <textarea className="input" rows={3} placeholder="विस्तृत शास्त्रीय पृष्ठभूमि..." value={form.descriptionHi} onChange={(e) => setForm({ ...form, descriptionHi: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Features list (English, one per line)</label>
              <textarea className="input" rows={4} placeholder="Verified pandit trained in scriptural procedures" value={form.features} onChange={(e) => setForm({ ...form, features: e.target.value })} />
              <p className="mt-1 text-3xs text-muted-foreground">Shown as ticked points on the puja page. Clear it to hide the list.</p>
            </div>
            <div>
              <label className="label">विशेषताएँ (Hindi, one per line)</label>
              <textarea className="input" rows={4} placeholder="शास्त्रीय विधि में प्रशिक्षित सत्यापित पंडित" value={form.featuresHi} onChange={(e) => setForm({ ...form, featuresHi: e.target.value })} />
            </div>
          </div>
          <p className="rounded-2xl bg-amber-50 p-3 text-3xs leading-relaxed text-amber-800">
            Hindi is optional. A blank Hindi field means Hindi readers see the English text
            instead of an empty heading.
          </p>
          <ImagePicker
            label="Cover image"
            hint="Shown on puja cards and at the top of the listing"
            value={form.imageUrl}
            onChange={(imageUrl) => setForm({ ...form, imageUrl })}
          />
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
                onClick={() => setPackages([...packages, { name: '', nameHi: '', priceInr: '', inclusions: '' }])}
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
                      placeholder="Package name (English)"
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
                    placeholder="पैकेज का नाम (Hindi, optional)"
                    value={pk.nameHi}
                    onChange={(e) => setPackages(packages.map((x, xi) => (xi === i ? { ...x, nameHi: e.target.value } : x)))}
                  />
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
        </div>
      </Modal>
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
