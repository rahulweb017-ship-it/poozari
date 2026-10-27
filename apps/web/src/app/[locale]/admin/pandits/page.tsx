'use client';

import { Link, useRouter } from '@/i18n/navigation';
import {
  ActionButton,
  AdminPageHeader,
  DataTable,
  DetailList,
  Modal,
  Notice,
  StatusPill,
  Thumb,
  csvDate,
  csvYesNo,
  type Column,
  type CsvExportDef,
  type FilterDef,
} from '@/components/admin-kit';
import { AdminShell } from '@/components/admin-shell';
import { api } from '@/lib/client';
import type { City } from '@poozari/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';

const EMPTY_FORM = {
  displayName: '',
  email: '',
  password: '',
  phone: '',
  experienceYears: '10',
  bio: '',
  specializations: '',
  servicePincodes: '',
  serviceCityIds: [] as string[],
  isActive: true,
  /** Blank means the platform default commission applies. */
  commissionPercent: '',
};

export default function AdminPanditsPage() {
  const router = useRouter();
  const openDashboard = (p: any) => router.push(`/admin/pandits/${p.id}`);
  const [pandits, setPandits] = useState<any[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [viewing, setViewing] = useState<any | null>(null);

  async function load() {
    const [p, c] = await Promise.all([api.adminListPandits(), api.listCities()]);
    setPandits(p);
    setCities(c);
  }

  useEffect(() => {
    load()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const cityName = useMemo(() => new Map(cities.map((c) => [c.id, c.name])), [cities]);

  const panditsCsv = useMemo<CsvExportDef<any>>(
    () => ({
      name: 'pandits',
      columns: [
        { header: 'Pandit ID', value: (p) => p.id },
        { header: 'Name', value: (p) => p.displayName },
        { header: 'Login email', value: (p) => p.user?.email },
        { header: 'Phone', value: (p) => p.phone },
        { header: 'Experience (years)', value: (p) => p.experienceYears ?? 0 },
        { header: 'Pujari share (%)', value: (p) => (p.commissionPercent == null ? 'Platform default' : p.commissionPercent) },
        { header: 'Account', value: (p) => (p.isActive ? 'Active' : 'Deactivated') },
        { header: 'Online', value: (p) => csvYesNo(Boolean(p.isActive && p.isAvailable)) },
        { header: 'Rating', value: (p) => (p.rating ? Number(p.rating).toFixed(1) : '') },
        {
          header: 'Service cities',
          value: (p) => (p.serviceCityIds ?? []).map((id: string) => cityName.get(id) ?? id).join('; '),
        },
        { header: 'Service pincodes', value: (p) => (p.servicePincodes ?? []).join('; ') },
        { header: 'Specializations', value: (p) => (p.specializations ?? []).join('; ') },
        { header: 'Bio', value: (p) => p.bio },
        { header: 'Joined', value: (p) => csvDate(p.createdAt) },
      ],
    }),
    [cityName],
  );

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

  function startEdit(p: any) {
    setViewing(null);
    setEditingId(p.id);
    setFormError('');
    setForm({
      displayName: p.displayName ?? '',
      email: p.user?.email ?? '',
      password: '',
      phone: p.phone ?? '',
      experienceYears: String(p.experienceYears ?? 0),
      bio: p.bio ?? '',
      specializations: (p.specializations ?? []).join(', '),
      servicePincodes: (p.servicePincodes ?? []).join(', '),
      serviceCityIds: p.serviceCityIds ?? [],
      isActive: p.isActive ?? true,
      commissionPercent: p.commissionPercent == null ? '' : String(p.commissionPercent),
    });
    setFormOpen(true);
  }

  async function submit() {
    setFormError('');
    setMsg('');
    setBusy(true);
    try {
      const profilePayload = {
        displayName: form.displayName,
        bio: form.bio,
        phone: form.phone,
        experienceYears: Number(form.experienceYears) || 0,
        specializations: form.specializations.split(',').map((s) => s.trim()).filter(Boolean),
        servicePincodes: form.servicePincodes.split(',').map((s) => s.trim()).filter(Boolean),
        serviceCityIds: form.serviceCityIds,
      };
      if (editingId) {
        await api.adminUpdatePandit(editingId, {
          ...profilePayload,
          isActive: form.isActive,
          commissionPercent:
            form.commissionPercent.trim() === '' ? null : Number(form.commissionPercent),
          ...(form.password ? { password: form.password } : {}),
        });
        setMsg('Pandit updated.');
      } else {
        await api.adminCreatePandit({
          ...profilePayload,
          email: form.email,
          password: form.password,
        });
        setMsg('Pandit created.');
      }
      closeForm();
      await load();
    } catch (e: any) {
      setFormError(e.message ?? 'Could not save pandit');
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: any) {
    if (!window.confirm(`Delete pandit "${p.displayName}"? This removes their login. (Not allowed while they have bookings or live sessions.)`)) return;
    setError('');
    setMsg('');
    try {
      await api.adminDeletePandit(p.id);
      setMsg(`Deleted "${p.displayName}".`);
      setViewing(null);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not delete pandit');
    }
  }

  async function toggleActive(p: any) {
    setError('');
    setMsg('');
    try {
      await api.adminUpdatePandit(p.id, { isActive: !p.isActive });
      setViewing(null);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not update pandit account');
    }
  }

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Pandit',
      render: (p) => (
        <div className="flex items-center gap-3">
          <Thumb label={p.displayName ?? '?'} />
          <div className="min-w-0">
            <div className="font-bold text-foreground">{p.displayName}</div>
            <div className="text-3xs text-muted-foreground">{p.user?.email ?? '—'}</div>
          </div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', render: (p) => p.phone || '—' },
    { key: 'exp', header: 'Experience', render: (p) => `${p.experienceYears ?? 0} yrs` },
    {
      key: 'pincodes',
      header: 'Pincodes',
      className: 'max-w-[160px] truncate',
      render: (p) => p.servicePincodes?.join(', ') || '—',
    },
    {
      key: 'share',
      header: 'Share',
      render: (p) => (p.commissionPercent == null ? 'Default' : `${p.commissionPercent}%`),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (
        <div className="flex flex-col items-start gap-1">
          <StatusPill on={p.isActive} onLabel="Active" offLabel="Deactivated" />
          <span className={`text-3xs font-bold uppercase tracking-wider ${p.isActive && p.isAvailable ? 'text-blue-600' : 'text-gray-400'}`}>
            {p.isActive && p.isAvailable ? '● Online' : '○ Offline'}
          </span>
        </div>
      ),
    },
  ];

  const filters: FilterDef<any>[] = [
    {
      key: 'account',
      label: 'Account',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Deactivated' },
      ],
      match: (p, v) => (v === 'active' ? p.isActive : !p.isActive),
    },
    {
      key: 'availability',
      label: 'Availability',
      options: [
        { value: 'online', label: 'Online' },
        { value: 'offline', label: 'Offline' },
      ],
      match: (p, v) => (v === 'online') === Boolean(p.isActive && p.isAvailable),
    },
    {
      key: 'city',
      label: 'City',
      options: cities.map((c) => ({ value: c.id, label: c.name })),
      match: (p, v) => (p.serviceCityIds ?? []).includes(v),
    },
  ];

  return (
    <AdminShell>
      <AdminPageHeader
        title="Pandits"
        subtitle="Register, edit and coordinate platform pandits."
        actions={
          <>
            <Link href="/admin/import" className="btn-outline text-2xs uppercase tracking-wider">
              📥 Bulk import CSV
            </Link>
            <button className="btn-primary text-2xs uppercase tracking-wider" onClick={openCreate}>
              + Add pujari
            </button>
          </>
        }
      />

      <Notice error={error} message={msg} />

      <DataTable
        rows={pandits}
        columns={columns}
        getRowId={(p) => p.id}
        loading={loading}
        searchText={(p) =>
          [p.displayName, p.user?.email, p.phone, ...(p.servicePincodes ?? []), ...(p.specializations ?? [])].join(' ')
        }
        searchPlaceholder="Search name, email, phone, pincode…"
        filters={filters}
        csvExport={panditsCsv}
        onRowClick={openDashboard}
        actions={(p) => (
          <>
            <ActionButton onClick={() => openDashboard(p)}>Dashboard</ActionButton>
            <ActionButton onClick={() => setViewing(p)}>Quick view</ActionButton>
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
        title={viewing?.displayName ?? ''}
        onClose={closeView}
        footer={
          viewing ? (
            <>
              <button className="btn-outline text-2xs uppercase tracking-wider" onClick={() => toggleActive(viewing)}>
                {viewing.isActive ? 'Deactivate account' : 'Activate account'}
              </button>
              <button className="btn-outline text-2xs uppercase tracking-wider" onClick={() => startEdit(viewing)}>
                Edit
              </button>
              <button className="btn-primary text-2xs uppercase tracking-wider" onClick={() => openDashboard(viewing)}>
                Open dashboard
              </button>
            </>
          ) : null
        }
      >
        {viewing ? (
          <DetailList
            items={[
              { label: 'Login email', value: viewing.user?.email },
              { label: 'Phone', value: viewing.phone },
              { label: 'Experience', value: `${viewing.experienceYears ?? 0} years` },
              { label: 'Pujari share', value: viewing.commissionPercent == null ? 'Platform default' : `${viewing.commissionPercent}%` },
              { label: 'Account', value: viewing.isActive ? 'Active' : 'Deactivated' },
              { label: 'Availability', value: viewing.isActive && viewing.isAvailable ? 'Online' : 'Offline' },
              { label: 'Rating', value: viewing.rating ? Number(viewing.rating).toFixed(1) : null },
              { label: 'Service cities', value: (viewing.serviceCityIds ?? []).map((id: string) => cityName.get(id) ?? id).join(', ') },
              { label: 'Service pincodes', value: viewing.servicePincodes?.join(', ') },
              { label: 'Specializations', value: viewing.specializations?.join(', ') },
              { label: 'Bio', value: viewing.bio },
              { label: 'Joined', value: viewing.createdAt ? new Date(viewing.createdAt).toLocaleDateString('en-IN') : null },
            ]}
          />
        ) : null}
      </Modal>

      {/* Create / edit popup */}
      <Modal
        open={formOpen}
        title={editingId ? 'Edit pujari' : 'Add pujari'}
        onClose={closeForm}
        footer={
          <>
            <button className="btn-outline text-2xs uppercase tracking-wider" onClick={closeForm}>
              Cancel
            </button>
            <button
              className="btn-primary text-2xs uppercase tracking-wider"
              onClick={submit}
              disabled={busy || !form.displayName || !form.phone || (!editingId && (!form.email || !form.password))}
            >
              {busy ? 'Saving…' : editingId ? 'Update pandit' : 'Create pandit'}
            </button>
          </>
        }
      >
        <Notice error={formError} />
        <div className="space-y-4">
          <div>
            <label className="label">Display name *</label>
            <input className="input" placeholder="e.g. Shastri ji" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Login email {editingId ? '' : '*'}</label>
              <input className="input" placeholder="email@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={Boolean(editingId)} />
            </div>
            <div>
              <label className="label">{editingId ? 'Reset password (optional)' : 'Password *'}</label>
              <input className="input" placeholder={editingId ? 'Leave blank to keep current' : 'Temporary password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Phone *</label>
              <input className="input" placeholder="+91..." value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <label className="label">Experience (years)</label>
              <input className="input" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea className="input" rows={2} placeholder="Lineage, training, languages…" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div>
            <label className="label">Specializations (comma separated)</label>
            <input className="input" placeholder="Rudrabhishek, Vivah..." value={form.specializations} onChange={(e) => setForm({ ...form, specializations: e.target.value })} />
          </div>
          <div>
            <label className="label">Service pincodes (comma separated)</label>
            <input className="input" placeholder="221001, 221002..." value={form.servicePincodes} onChange={(e) => setForm({ ...form, servicePincodes: e.target.value })} />
          </div>
          <div>
            <label className="label">Service cities</label>
            <select
              multiple
              className="input h-28"
              value={form.serviceCityIds}
              onChange={(e) => setForm({ ...form, serviceCityIds: Array.from(e.target.selectedOptions, (o) => o.value) })}
            >
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {editingId ? (
            <>
              <div>
                <label className="label">Pujari share % (blank = platform default)</label>
                <input
                  className="input"
                  inputMode="numeric"
                  placeholder="e.g. 75"
                  value={form.commissionPercent}
                  onChange={(e) => setForm({ ...form, commissionPercent: e.target.value.replace(/\D/g, '') })}
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2.5">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[hsl(var(--accent))]"
                  checked={form.isActive}
                  onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                />
                <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                  Account active (admin controlled)
                </span>
              </label>
            </>
          ) : null}
        </div>
      </Modal>
    </AdminShell>
  );
}
