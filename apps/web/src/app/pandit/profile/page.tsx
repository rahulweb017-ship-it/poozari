'use client';

import { PanditShell } from '@/components/pandit-shell';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import type { City, PanditProfile } from '@poozari/shared';
import { useEffect, useState } from 'react';

export default function PanditProfilePage() {
  const { updateUser, user } = useAuth();
  const [profile, setProfile] = useState<PanditProfile | null>(null);
  const [cities, setCities] = useState<City[]>([]);
  const [form, setForm] = useState({
    displayName: '',
    phone: '',
    experienceYears: '0',
    bio: '',
    specializations: '',
    servicePincodes: '',
    serviceCityIds: [] as string[],
  });
  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const [pandit, cityRows] = await Promise.all([api.panditProfile(), api.listCities()]);
    setProfile(pandit);
    setCities(cityRows);
    setForm({
      displayName: pandit.displayName,
      phone: pandit.phone,
      experienceYears: String(pandit.experienceYears),
      bio: pandit.bio,
      specializations: pandit.specializations.join(', '),
      servicePincodes: pandit.servicePincodes.join(', '),
      serviceCityIds: pandit.serviceCityIds,
    });
  }

  useEffect(() => {
    load().catch((e) => setError(e.message ?? 'Could not load profile'));
  }, []);

  async function saveProfile() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const updated = await api.panditUpdateProfile({
        displayName: form.displayName,
        phone: form.phone,
        experienceYears: Number(form.experienceYears) || 0,
        bio: form.bio,
        specializations: form.specializations.split(',').map((s) => s.trim()).filter(Boolean),
        servicePincodes: form.servicePincodes.split(',').map((s) => s.trim()).filter(Boolean),
        serviceCityIds: form.serviceCityIds,
      });
      setProfile(updated);
      if (user) updateUser({ ...user, name: updated.displayName });
      setMessage('Professional profile updated.');
    } catch (e: any) {
      setError(e.message ?? 'Could not update profile');
    } finally {
      setBusy(false);
    }
  }

  async function toggleAvailability() {
    if (!profile) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const updated = await api.panditSetAvailability(!profile.isAvailable);
      setProfile(updated);
      setMessage(updated.isAvailable ? 'You are online for new assignments.' : 'You are offline.');
    } catch (e: any) {
      setError(e.message ?? 'Could not change availability');
    } finally {
      setBusy(false);
    }
  }

  async function changePassword() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api.changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage('Password changed successfully.');
    } catch (e: any) {
      setError(e.message ?? 'Could not change password');
    } finally {
      setBusy(false);
    }
  }

  return (
    <PanditShell>
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">
          Profile &amp; Security
        </h1>
        <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Manage your professional details, availability, and password.
        </p>
      </div>

      {error ? <p className="mb-5 rounded-2xl bg-red-50 p-4 text-xs text-red-700">{error}</p> : null}
      {message ? <p className="mb-5 rounded-2xl bg-green-50 p-4 text-xs text-green-700">{message}</p> : null}

      <section className="card mb-6 flex flex-wrap items-center justify-between gap-5 bg-white p-6">
        <div>
          <h2 className="font-display text-base font-bold text-foreground">Assignment availability</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Go offline when you cannot accept new bookings. Existing assignments remain visible.
          </p>
        </div>
        <button
          className={profile?.isAvailable ? 'btn-primary' : 'btn-outline'}
          onClick={toggleAvailability}
          disabled={busy || !profile}
        >
          {profile?.isAvailable ? '● Online — go offline' : '○ Offline — go online'}
        </button>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card bg-white p-6">
          <h2 className="font-display text-base font-bold text-foreground">Professional profile</h2>
          <p className="mt-1 text-xs text-muted-foreground">Login email: {profile?.email ?? '—'}</p>
          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Display name</label>
              <input className="input" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div>
                <label className="label">Experience</label>
                <input className="input" type="number" min="0" max="80" value={form.experienceYears} onChange={(e) => setForm({ ...form, experienceYears: e.target.value })} />
              </div>
            </div>
            <div>
              <label className="label">Bio</label>
              <textarea className="input" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            </div>
            <div>
              <label className="label">Specializations (comma separated)</label>
              <input className="input" value={form.specializations} onChange={(e) => setForm({ ...form, specializations: e.target.value })} />
            </div>
            <div>
              <label className="label">Service pincodes (comma separated)</label>
              <input className="input" value={form.servicePincodes} onChange={(e) => setForm({ ...form, servicePincodes: e.target.value })} />
            </div>
            <div>
              <label className="label">Service cities</label>
              <select
                multiple
                className="input h-28"
                value={form.serviceCityIds}
                onChange={(e) => setForm({ ...form, serviceCityIds: Array.from(e.target.selectedOptions, (o) => o.value) })}
              >
                {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
              </select>
            </div>
            <button className="btn-primary w-full" onClick={saveProfile} disabled={busy || form.displayName.length < 2 || !form.phone}>
              Save profile
            </button>
          </div>
        </section>

        <section className="card self-start bg-white p-6">
          <h2 className="font-display text-base font-bold text-foreground">Change password</h2>
          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Current password</label>
              <input className="input" type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} />
            </div>
            <div>
              <label className="label">New password</label>
              <input className="input" type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input className="input" type="password" value={passwords.confirmPassword} onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })} />
            </div>
            <button
              className="btn-outline w-full"
              onClick={changePassword}
              disabled={busy || passwords.currentPassword.length < 8 || passwords.newPassword.length < 8 || passwords.confirmPassword.length < 8}
            >
              Change password
            </button>
          </div>
        </section>
      </div>
    </PanditShell>
  );
}
