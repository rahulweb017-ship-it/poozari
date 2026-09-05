'use client';

import { CustomerPanelNav } from '@/components/customer-panel-nav';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import { UserRole, type AccountProfile } from '@poozari/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function CustomerProfilePage() {
  const { user, ready, login, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && !user) router.replace('/login?next=/account/profile');
    else if (ready && user && user.role !== UserRole.CUSTOMER) router.replace('/');
  }, [ready, user, router]);

  useEffect(() => {
    if (!user || user.role !== UserRole.CUSTOMER) return;
    api.myProfile()
      .then((data) => {
        setProfile(data);
        setName(data.name);
        setEmail(data.email ?? '');
      })
      .catch((e) => {
        if (e?.status === 401 || e?.status === 403) {
          logout();
          router.replace('/login?next=/account/profile');
          return;
        }
        setError(e.message ?? 'Could not load profile');
      });
  }, [user, logout, router]);

  async function saveProfile() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const auth = await api.updateCustomerProfile({ name, email });
      login(auth);
      setProfile((current) => current ? { ...current, ...auth.user } : current);
      setMessage('Profile updated successfully.');
    } catch (e: any) {
      setError(e.message ?? 'Could not update profile');
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api.changePassword({ newPassword, confirmPassword });
      setNewPassword('');
      setConfirmPassword('');
      setProfile((current) => current ? { ...current, hasPassword: true } : current);
      setMessage('Password saved. You can now sign in using phone and password.');
    } catch (e: any) {
      setError(e.message ?? 'Could not save password');
    } finally {
      setBusy(false);
    }
  }

  if (!ready || !user || user.role !== UserRole.CUSTOMER) return null;

  return (
    <div className="app-container py-8 sm:py-12">
      <CustomerPanelNav />
      <div className="mb-8">
        <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">
          Profile &amp; Security
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Keep your contact details and sign-in password up to date.
        </p>
      </div>

      {error ? <p className="mb-5 rounded-2xl bg-red-50 p-4 text-xs text-red-700">{error}</p> : null}
      {message ? <p className="mb-5 rounded-2xl bg-green-50 p-4 text-xs text-green-700">{message}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card bg-white p-6">
          <h2 className="font-display text-base font-bold text-foreground">Basic details</h2>
          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Full name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="label">Verified mobile</label>
              <input className="input bg-gray-50" value={profile?.phone ?? user.phone ?? ''} disabled />
              <p className="mt-1.5 text-3xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mobile changes require OTP verification.
              </p>
            </div>
            <button className="btn-primary w-full" onClick={saveProfile} disabled={busy || name.trim().length < 2}>
              Save profile
            </button>
          </div>
        </section>

        <section className="card bg-white p-6">
          <h2 className="font-display text-base font-bold text-foreground">
            {profile?.hasPassword ? 'Reset password' : 'Create password'}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Your verified OTP session authorizes this reset. OTP login will continue to work.
          </p>
          <div className="mt-5 space-y-4">
            <div>
              <label className="label">New password</label>
              <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div>
              <label className="label">Confirm new password</label>
              <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <button
              className="btn-outline w-full"
              onClick={resetPassword}
              disabled={busy || newPassword.length < 8 || confirmPassword.length < 8}
            >
              {profile?.hasPassword ? 'Reset password' : 'Create password'}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
