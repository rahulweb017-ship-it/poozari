'use client';

import {
  ActionButton,
  AdminPageHeader,
  DataTable,
  DetailList,
  Modal,
  Notice,
  Thumb,
  type Column,
  type CsvColumn,
  type CsvExportDef,
  type FilterDef,
} from '@/components/admin-kit';
import { AdminShell } from '@/components/admin-shell';
import { ImagePicker } from '@/components/image-picker';
import { api } from '@/lib/client';
import type { City } from '@poozari/shared';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';

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

  const tabs = (
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
  );

  return (
    <AdminShell>
      {/* Remount per tab so each section loads fresh and resets its form. */}
      <CrudSection
        key={config.key}
        config={config}
        cities={cities}
        tabs={tabs}
        onCitiesChanged={setCities}
      />
    </AdminShell>
  );
}

function CrudSection({
  config,
  cities,
  tabs,
  onCitiesChanged,
}: {
  config: EntityConfig;
  cities: City[];
  tabs: ReactNode;
  onCitiesChanged: (cities: City[]) => void;
}) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState<any | null>(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const rows = await config.list();
    setItems(rows);
    // Keep the temple city picker and filters in sync after city edits.
    if (config.key === 'cities') onCitiesChanged(rows);
  }

  useEffect(() => {
    load()
      .catch(() => undefined)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.key]);

  const cityName = useMemo(() => new Map(cities.map((c) => [c.id, c.name])), [cities]);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }, []);
  const closeView = useCallback(() => setViewing(null), []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  }

  function startEdit(item: any) {
    setViewing(null);
    setEditingId(item.id);
    setFormError('');
    setForm({
      name: item.name ?? '',
      slug: item.slug ?? '',
      state: item.state ?? '',
      description: item.description ?? '',
      imageUrl: item.imageUrl ?? '',
      cityId: item.cityId ?? '',
    });
    setFormOpen(true);
  }

  async function submit() {
    setFormError('');
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
          setFormError('Please choose a city for this temple.');
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
      closeForm();
      await load();
    } catch (e: any) {
      setFormError(e.message ?? 'Could not save');
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
      setViewing(null);
      if (editingId === item.id) closeForm();
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not delete');
    }
  }

  const itemCity = (item: any) => item.city?.name ?? (item.cityId ? cityName.get(item.cityId) : undefined);

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: config.singular,
      render: (item) => (
        <div className="flex items-center gap-3">
          <Thumb src={item.imageUrl} label={item.name ?? '?'} />
          <div className="min-w-0">
            <div className="font-bold text-foreground">{item.name}</div>
            <div className="text-3xs text-muted-foreground">/{item.slug}</div>
          </div>
        </div>
      ),
    },
    ...(config.hasCity
      ? [{ key: 'city', header: 'City', render: (item: any) => itemCity(item) || '—' }]
      : []),
    ...(config.hasState
      ? [{ key: 'state', header: 'State', render: (item: any) => item.state || '—' }]
      : []),
    ...(config.key === 'cities'
      ? [
          {
            key: 'temples',
            header: 'Temples',
            render: (item: any) => (typeof item.templeCount === 'number' ? item.templeCount : '—'),
          },
        ]
      : []),
    {
      key: 'description',
      header: 'Description',
      className: 'max-w-[280px] truncate',
      render: (item) => item.description || '—',
    },
  ];

  const csvExport: CsvExportDef<any> = {
    name: config.key,
    columns: [
      { header: 'ID', value: (item) => item.id },
      { header: 'Name', value: (item) => item.name },
      { header: 'Slug', value: (item) => item.slug },
      ...(config.hasCity ? [{ header: 'City', value: (item: any) => itemCity(item) } as CsvColumn<any>] : []),
      ...(config.hasState ? [{ header: 'State', value: (item: any) => item.state } as CsvColumn<any>] : []),
      ...(config.key === 'cities'
        ? [{ header: 'Temples', value: (item: any) => item.templeCount } as CsvColumn<any>]
        : []),
      { header: 'Description', value: (item) => item.description },
      { header: 'Image URL', value: (item) => item.imageUrl },
    ],
  };

  const states = useMemo(
    () => Array.from(new Set(items.map((i) => i.state).filter(Boolean) as string[])).sort(),
    [items],
  );

  const filters: FilterDef<any>[] = [
    ...(config.hasCity
      ? [
          {
            key: 'city',
            label: 'City',
            options: cities.map((c) => ({ value: c.id, label: c.name })),
            match: (item: any, v: string) => (item.cityId ?? item.city?.id) === v,
          },
        ]
      : []),
    ...(config.hasState && states.length
      ? [
          {
            key: 'state',
            label: 'State',
            options: states.map((s) => ({ value: s, label: s })),
            match: (item: any, v: string) => item.state === v,
          },
        ]
      : []),
    {
      key: 'image',
      label: 'Image',
      options: [
        { value: 'with', label: 'With image' },
        { value: 'without', label: 'No image' },
      ],
      match: (item, v) => (v === 'with') === Boolean(item.imageUrl),
    },
  ];

  const singularLower = config.singular.toLowerCase();

  return (
    <>
      <AdminPageHeader
        title="Catalog"
        subtitle="Manage cities, temples, deities, festivals and benefits."
        actions={
          <button className="btn-primary text-2xs uppercase tracking-wider" onClick={openCreate}>
            + Add {singularLower}
          </button>
        }
      />

      {tabs}

      <Notice error={error} message={msg} />

      <DataTable
        rows={items}
        columns={columns}
        getRowId={(item) => item.id}
        loading={loading}
        searchText={(item) => [item.name, item.slug, item.state, itemCity(item), item.description].join(' ')}
        searchPlaceholder={`Search ${config.label.toLowerCase()}…`}
        filters={filters}
        onRowClick={setViewing}
        emptyText={`No ${config.label.toLowerCase()} yet.`}
        csvExport={csvExport}
        actions={(item) => (
          <>
            <ActionButton onClick={() => setViewing(item)}>View</ActionButton>
            <ActionButton tone="accent" onClick={() => startEdit(item)}>Edit</ActionButton>
            <ActionButton tone="danger" onClick={() => remove(item)}>Delete</ActionButton>
          </>
        )}
      />

      {/* Details popup */}
      <Modal
        open={Boolean(viewing)}
        title={viewing ? `${config.icon} ${viewing.name}` : ''}
        onClose={closeView}
        footer={
          viewing ? (
            <>
              <button
                className="rounded-xl border border-red-200 px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50"
                onClick={() => remove(viewing)}
              >
                Delete
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
              <img src={viewing.imageUrl} alt="" className="max-h-64 w-full rounded-2xl bg-accent-soft object-contain" />
            ) : null}
            <DetailList
              items={[
                { label: 'Name', value: viewing.name },
                { label: 'Slug', value: viewing.slug ? `/${viewing.slug}` : null },
                ...(config.hasCity ? [{ label: 'City', value: itemCity(viewing) }] : []),
                ...(config.hasState ? [{ label: 'State', value: viewing.state }] : []),
                ...(config.key === 'cities'
                  ? [{ label: 'Temples', value: typeof viewing.templeCount === 'number' ? viewing.templeCount : null }]
                  : []),
                { label: 'Description', value: viewing.description },
              ]}
            />
          </div>
        ) : null}
      </Modal>

      {/* Create / edit popup */}
      <Modal
        open={formOpen}
        title={editingId ? `Edit ${singularLower}` : `Add ${singularLower}`}
        onClose={closeForm}
        size="lg"
        footer={
          <>
            <button className="btn-outline text-2xs uppercase tracking-wider" onClick={closeForm}>
              Cancel
            </button>
            <button className="btn-primary text-2xs uppercase tracking-wider" onClick={submit} disabled={busy || !form.name}>
              {busy ? 'Saving…' : editingId ? 'Update' : 'Create'}
            </button>
          </>
        }
      >
        <Notice error={formError} />
        <div className="space-y-4">
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
          <ImagePicker
            label="Image"
            value={form.imageUrl}
            onChange={(imageUrl) => setForm({ ...form, imageUrl })}
            aspect="1/1"
          />
        </div>
      </Modal>
    </>
  );
}
