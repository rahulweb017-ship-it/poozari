'use client';

import { Link } from '@/i18n/navigation';
import { AdminShell } from '@/components/admin-shell';
import { api } from '@/lib/client';
import type { City } from '@poozari/shared';
import { useEffect, useState } from 'react';

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
};

export default function AdminPanditsPage() {
  const [pandits, setPandits] = useState<any[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  async function load() {
    const [p, c] = await Promise.all([api.adminListPandits(), api.listCities()]);
    setPandits(p);
    setCities(c);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setMsg('');
  }

  function startEdit(p: any) {
    setEditingId(p.id);
    setError('');
    setMsg('');
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
    });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit() {
    setError('');
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
          ...(form.password ? { password: form.password } : {}),
        });
        resetForm();
        setMsg('Pandit updated.');
      } else {
        await api.adminCreatePandit({
          ...profilePayload,
          email: form.email,
          password: form.password,
        });
        resetForm();
        setMsg('Pandit created.');
      }
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not save pandit');
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
      if (editingId === p.id) resetForm();
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not delete pandit');
    }
  }

  async function toggleActive(p: any) {
    setError('');
    try {
      await api.adminUpdatePandit(p.id, { isActive: !p.isActive });
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not update pandit account');
    }
  }

  return (
    <AdminShell>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4 border-b pb-6" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">Pandits</h1>
          <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Register, edit and coordinate platform pandits.
          </p>
        </div>
        <Link href="/admin/import" className="btn-outline text-2xs uppercase tracking-wider">
          📥 Bulk import CSV
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Create / edit form */}
        <div className="card self-start p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
              {editingId ? '✏️ Edit Pandit' : '👨‍🏫 Register Pandit'}
            </h3>
            {editingId ? (
              <button className="text-2xs font-bold uppercase tracking-wider text-accent hover:underline" onClick={resetForm}>
                + New pandit
              </button>
            ) : null}
          </div>
          {error ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}
          {msg ? <p className="mt-3 rounded-2xl bg-green-50 p-3 text-xs text-green-700">{msg}</p> : null}
          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Display name *</label>
              <input className="input" placeholder="e.g. Shastri ji" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Login email {editingId ? '' : '*'}</label>
                <input className="input" placeholder="email@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} disabled={Boolean(editingId)} />
              </div>
              <div>
                <label className="label">{editingId ? 'Reset password (optional)' : 'Password *'}</label>
                <input className="input" placeholder={editingId ? 'Leave blank to keep current' : 'Temporary password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
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
            {editingId ? <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[hsl(var(--accent))]"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Account active (admin controlled)
              </span>
            </label> : null}
            <button
              className="btn-primary w-full text-2xs uppercase tracking-widest"
              onClick={submit}
              disabled={busy || !form.displayName || !form.phone || (!editingId && (!form.email || !form.password))}
            >
              {busy ? 'Saving…' : editingId ? 'Update pandit' : 'Create pandit'}
            </button>
          </div>
        </div>

        {/* Directory List */}
        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
            Pandit Directory ({pandits.length})
          </h3>
          <div className="mt-5 space-y-3">
            {pandits.map((p) => (
              <div key={p.id} className="card bg-white p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent shadow-sm">
                    {p.displayName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-foreground">{p.displayName}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {p.user?.email ?? '—'} · {p.phone} · {p.experienceYears} yrs
                    </div>
                    <div className="mt-1 text-3xs font-bold uppercase tracking-wider text-muted-foreground">
                      Pincodes: {p.servicePincodes?.join(', ') || '—'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`badge ${p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {p.isActive ? '✓ Account active' : '⊘ Deactivated'}
                    </span>
                    <span className={`badge ${p.isActive && p.isAvailable ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                      {p.isActive && p.isAvailable ? '● Online' : '○ Offline'}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
                  <button className="btn-outline text-2xs uppercase tracking-wider" onClick={() => startEdit(p)}>
                    ✏️ Edit
                  </button>
                  <button className="btn-outline text-2xs uppercase tracking-wider" onClick={() => toggleActive(p)}>
                    {p.isActive ? '⊘ Deactivate account' : '✓ Activate account'}
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
            {pandits.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">No records found.</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
