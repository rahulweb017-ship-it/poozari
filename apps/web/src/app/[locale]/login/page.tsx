'use client';

import { useRouter } from '@/i18n/navigation';
import { api } from '@/lib/client';
import { useAuth } from '@/lib/auth';
import {useSearchParams} from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function LoginInner() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/account/bookings';

  const [method, setMethod] = useState<'otp' | 'password'>('otp');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // The API refuses a resend inside its cooldown, so the button counts down
  // rather than letting the devotee tap into an error.
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  async function requestOtp() {
    setError('');
    setLoading(true);
    try {
      const res = await api.requestOtp({ phone });
      setDevCode(res.devCode ?? null);
      setResendIn(res.resendAfterSeconds ?? 60);
      setStep('otp');
    } catch (e: any) {
      setError(e.message ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError('');
    setLoading(true);
    try {
      const res = await api.verifyOtp({ phone, code, name: name || undefined });
      login(res);
      router.push(next);
    } catch (e: any) {
      setError(e.message ?? 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  }

  async function passwordLogin() {
    setError('');
    setLoading(true);
    try {
      const res = await api.customerPasswordLogin({ phone, password });
      login(res);
      router.push(next);
    } catch (e: any) {
      setError(e.message ?? 'Invalid phone number or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4"
         style={{ background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)' }}>
      <div className="elevated-card saffron-glow w-full max-w-md p-8 bg-white">
        {/* Branding */}
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="Poozari — Aapki Aasta, Humara Kartavya" className="mx-auto block h-20 w-auto" />
        </div>
        {/* Accent stripe */}
        <div className="mx-auto mt-4 h-0.5 w-16 rounded-full bg-gradient-to-r from-accent to-primary" />

        <h1 className="mt-6 text-center font-display text-base font-extrabold uppercase tracking-wider text-foreground">
          Devotee Login
        </h1>
        <p className="mt-1.5 text-center text-xs text-muted-foreground">
          Sign in using OTP or your account password.
        </p>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-center text-xs text-red-700">{error}</p>
        ) : null}

        {method === 'password' ? (
          <div className="mt-6 space-y-4">
            <div>
              <label className="label">Mobile number</label>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="10-digit number" />
            </div>
            <div>
              <label className="label">Password</label>
              <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
            </div>
            <button className="btn-primary w-full" onClick={passwordLogin} disabled={loading || !phone || password.length < 8}>
              {loading ? 'Signing in…' : 'Sign in with password'}
            </button>
            <button className="btn-outline w-full" onClick={() => { setMethod('otp'); setError(''); }}>
              Use OTP instead
            </button>
          </div>
        ) : step === 'phone' ? (
          <div className="mt-6 space-y-4">
            <div>
              <label className="label">Mobile number</label>
              <input
                className="input"
                placeholder="10-digit number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Name (optional)</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Rahul Sharma" />
            </div>
            <button className="btn-primary w-full text-2xs uppercase tracking-widest" onClick={requestOtp} disabled={loading || !phone}>
              {loading ? 'Sending…' : 'Send OTP'}
            </button>
            <button className="btn-outline w-full" onClick={() => { setMethod('password'); setError(''); }}>
              Sign in with password
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {devCode ? (
              <p className="rounded-2xl bg-amber-50 p-3 text-center text-xs font-semibold text-amber-800 border border-amber-100">
                Dev mode — no SMS sent. Code:{' '}
                <strong className="ml-1 tracking-[0.2em]">{devCode}</strong>
              </p>
            ) : null}
            <div>
              <label className="label">Enter 6-digit OTP</label>
              <input
                className="input text-center text-lg tracking-[0.4em]"
                placeholder="• • • • • •"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
              />
            </div>
            <button className="btn-primary w-full text-2xs uppercase tracking-widest" onClick={verifyOtp} disabled={loading || code.length !== 6}>
              {loading ? 'Verifying…' : 'Verify & Login'}
            </button>
            <button
              className="btn-outline w-full text-2xs uppercase tracking-widest"
              onClick={requestOtp}
              disabled={loading || resendIn > 0}
            >
              {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
            </button>
            <button className="btn-outline w-full text-2xs uppercase tracking-widest" onClick={() => setStep('phone')}>
              Change number
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-3xs font-extrabold uppercase tracking-widest text-muted-foreground">
          <span className="mr-1.5 text-emerald-500">●</span> Support Active
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
