'use client';

import { useRouter } from '@/i18n/navigation';
import { CustomerPanelNav } from '@/components/customer-panel-nav';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import { GENDER_LABELS, UserRole, type AccountProfile, type Gender } from '@poozari/shared';

import { useEffect, useState } from 'react';

export default function CustomerProfilePage() {
  const { user, ready, login, logout } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  // Devotee details. These pre-fill the sankalp when a puja is booked.
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<string>('UNSPECIFIED');
  const [gotra, setGotra] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [city, setCity] = useState('');
  const [stateName, setStateName] = useState('');
  const [pincode, setPincode] = useState('');
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
        setDateOfBirth(data.dateOfBirth ? data.dateOfBirth.slice(0, 10) : '');
        setGender(data.gender ?? 'UNSPECIFIED');
        setGotra(data.gotra ?? '');
        setAddressLine(data.addressLine ?? '');
        setCity(data.city ?? '');
        setStateName(data.state ?? '');
        setPincode(data.pincode ?? '');
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
      const auth = await api.updateCustomerProfile({
        name,
        email,
        // Blank clears the date rather than leaving a stale one behind.
        dateOfBirth: dateOfBirth || null,
        gender,
        gotra,
        addressLine,
        city,
        state: stateName,
        pincode,
      });
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
          Keep your contact details, sankalp details and sign-in password up to date.
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
            <div
              className="border-t pt-4"
              style={{ borderColor: 'hsl(var(--border) / 0.4)' }}
            >
              <h3 className="text-2xs font-extrabold uppercase tracking-wider text-foreground">
                Sankalp details
              </h3>
              <p className="mt-1 text-3xs leading-relaxed text-muted-foreground">
                Saved once, then filled in for you every time you book. The pandit recites your
                name and gotra when the puja is offered.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Gotra</label>
                <input
                  className="input"
                  placeholder="e.g. Bharadwaj"
                  value={gotra}
                  onChange={(e) => setGotra(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Date of birth</label>
                <input
                  className="input"
                  type="date"
                  max={new Date().toISOString().slice(0, 10)}
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Gender</label>
              <select
                className="input"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                {(Object.keys(GENDER_LABELS) as Gender[]).map((key) => (
                  <option key={key} value={key}>
                    {GENDER_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Address</label>
              <textarea
                className="input"
                rows={2}
                placeholder="Flat / house, street, area"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
              />
              <p className="mt-1.5 text-3xs font-semibold uppercase tracking-wider text-muted-foreground">
                Used for pujas at home and for couriering prasad.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">City</label>
                <input
                  className="input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div>
                <label className="label">State</label>
                <input
                  className="input"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                />
              </div>
              <div>
                <label className="label">Pincode</label>
                <input
                  className="input"
                  inputMode="numeric"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                />
              </div>
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
