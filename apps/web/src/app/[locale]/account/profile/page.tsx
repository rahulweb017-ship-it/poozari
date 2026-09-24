'use client';

import { useRouter } from '@/i18n/navigation';
import { CustomerPanelNav } from '@/components/customer-panel-nav';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import { Gender as GenderValues, UserRole, type AccountProfile, type Gender } from '@poozari/shared';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

export default function CustomerProfilePage() {
  const t = useTranslations('account.profile');
  const tg = useTranslations('account.gender');
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
        setError(e.message ?? t('errors.loadFailed'));
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
      setMessage(t('saved'));
    } catch (e: any) {
      setError(e.message ?? t('errors.saveFailed'));
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
      setMessage(t('passwordSaved'));
    } catch (e: any) {
      setError(e.message ?? t('errors.passwordFailed'));
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
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('lead')}
        </p>
      </div>

      {error ? <p className="mb-5 rounded-2xl bg-red-50 p-4 text-xs text-red-700">{error}</p> : null}
      {message ? <p className="mb-5 rounded-2xl bg-green-50 p-4 text-xs text-green-700">{message}</p> : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card bg-white p-6">
          <h2 className="font-display text-base font-bold text-foreground">{t('basicDetails')}</h2>
          <div className="mt-5 space-y-4">
            <div>
              <label className="label">{t('fullName')}</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="label">{t('email')}</label>
              <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('emailPlaceholder')} />
            </div>
            <div>
              <label className="label">{t('verifiedMobile')}</label>
              <input className="input bg-gray-50" value={profile?.phone ?? user.phone ?? ''} disabled />
              <p className="mt-1.5 text-3xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('mobileHint')}
              </p>
            </div>
            <div
              className="border-t pt-4"
              style={{ borderColor: 'hsl(var(--border) / 0.4)' }}
            >
              <h3 className="text-2xs font-extrabold uppercase tracking-wider text-foreground">
                {t('sankalpTitle')}
              </h3>
              <p className="mt-1 text-3xs leading-relaxed text-muted-foreground">
                {t('sankalpBody')}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">{t('gotra')}</label>
                <input
                  className="input"
                  placeholder={t('gotraPlaceholder')}
                  value={gotra}
                  onChange={(e) => setGotra(e.target.value)}
                />
              </div>
              <div>
                <label className="label">{t('dateOfBirth')}</label>
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
              <label className="label">{t('gender')}</label>
              <select
                className="input"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                {(Object.values(GenderValues) as Gender[]).map((key) => (
                  <option key={key} value={key}>
                    {tg(key)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">{t('address')}</label>
              <textarea
                className="input"
                rows={2}
                placeholder={t('addressPlaceholder')}
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
              />
              <p className="mt-1.5 text-3xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('addressHint')}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">{t('city')}</label>
                <input
                  className="input"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div>
                <label className="label">{t('state')}</label>
                <input
                  className="input"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                />
              </div>
              <div>
                <label className="label">{t('pincode')}</label>
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
              {t('save')}
            </button>
          </div>
        </section>

        <section className="card bg-white p-6">
          <h2 className="font-display text-base font-bold text-foreground">
            {profile?.hasPassword ? t('resetPassword') : t('createPassword')}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('passwordLead')}
          </p>
          <div className="mt-5 space-y-4">
            <div>
              <label className="label">{t('newPassword')}</label>
              <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
            </div>
            <div>
              <label className="label">{t('confirmPassword')}</label>
              <input className="input" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            </div>
            <button
              className="btn-outline w-full"
              onClick={resetPassword}
              disabled={busy || newPassword.length < 8 || confirmPassword.length < 8}
            >
              {profile?.hasPassword ? t('resetPassword') : t('createPassword')}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
