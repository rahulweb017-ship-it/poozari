'use client';

import { Link, useRouter } from '@/i18n/navigation';
import { api } from '@/lib/client';
import { useAuth } from '@/lib/auth';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

/** Which identifier the devotee is signing in with. */
type Channel = 'phone' | 'email';

/**
 * Mobile sign-in waits on DLT registration for SMS, so the Mobile tab only
 * shows when the build turns it on. The API refuses SMS codes on its own too.
 */
const PHONE_LOGIN_ENABLED = process.env.NEXT_PUBLIC_PHONE_LOGIN_ENABLED === 'true';

const REASSURANCES = ['No password needed', '30-second login', 'Quick verification'];

function LoginInner() {
  const { login } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get('next') ?? '/account/bookings';

  const [method, setMethod] = useState<'otp' | 'password'>('otp');
  const [channel, setChannel] = useState<Channel>(PHONE_LOGIN_ENABLED ? 'phone' : 'email');
  const [step, setStep] = useState<'identify' | 'code'>('identify');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  // The API refuses a resend inside its cooldown, so the button counts down
  // rather than letting the devotee tap into an error.
  const [resendIn, setResendIn] = useState(0);

  const identifier = channel === 'phone' ? phone : email;
  /** The one field the API expects — it rejects a body carrying both. */
  const target = channel === 'phone' ? { phone: phone.trim() } : { email: email.trim() };

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  /**
   * Switching channel starts a fresh attempt: a code, dev banner or countdown
   * belonging to the number must not carry over to the email tab.
   */
  function switchChannel(to: Channel) {
    if (to === channel) return;
    setChannel(to);
    setStep('identify');
    setCode('');
    setDevCode(null);
    setResendIn(0);
    setError('');
  }

  function switchMethod(to: 'otp' | 'password') {
    setMethod(to);
    setStep('identify');
    setError('');
  }

  async function requestOtp() {
    setError('');
    setLoading(true);
    try {
      const res = await api.requestOtp(target);
      setDevCode(res.devCode ?? null);
      setResendIn(res.resendAfterSeconds ?? 60);
      setStep('code');
    } catch (e: any) {
      setError(e.message ?? 'Failed to send the code');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError('');
    setLoading(true);
    try {
      const res = await api.verifyOtp({ ...target, code, name: name || undefined });
      login(res);
      router.push(next);
    } catch (e: any) {
      setError(e.message ?? 'Invalid code');
    } finally {
      setLoading(false);
    }
  }

  async function passwordLogin() {
    setError('');
    setLoading(true);
    try {
      const res = await api.customerPasswordLogin({ ...target, password });
      login(res);
      router.push(next);
    } catch (e: any) {
      setError(e.message ?? 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  const identifierField =
    channel === 'phone' ? (
      <div>
        <label className="label">Mobile number</label>
        <input
          className="input"
          inputMode="tel"
          autoComplete="tel"
          placeholder="10-digit number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
      </div>
    ) : (
      <div>
        <label className="label">Email address</label>
        <input
          className="input"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
    );

  return (
    <div
      className="flex min-h-[80vh] items-center justify-center px-4"
      style={{ background: 'linear-gradient(180deg, hsl(var(--background)) 0%, hsl(var(--card)) 100%)' }}
    >
      <div className="elevated-card saffron-glow w-full max-w-md p-8 bg-white">
        {/* Branding */}
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo.png" alt="Poozari — Aapki Aasta, Humara Kartavya" className="mx-auto block h-20 w-auto" />
        </div>
        {/* Accent stripe */}
        <div className="mx-auto mt-4 h-0.5 w-16 rounded-full bg-gradient-to-r from-accent to-primary" />

        <h1 className="mt-6 text-center font-display text-base font-extrabold uppercase tracking-wider text-foreground">
          Create account or sign in
        </h1>
        <p className="mt-1.5 text-center text-xs text-muted-foreground">
          {method === 'password'
            ? 'Sign in with the password on your account.'
            : 'Enter your details to get started. We will send you a code to verify.'}
        </p>

        {/* Channel toggle — governs both the OTP and the password form. */}
        {PHONE_LOGIN_ENABLED && step === 'identify' ? (
          <div
            className="mt-6 grid grid-cols-2 gap-1 rounded-2xl p-1"
            style={{ backgroundColor: 'hsl(var(--border) / 0.4)' }}
          >
            {(['phone', 'email'] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => switchChannel(option)}
                className={
                  'rounded-xl px-4 py-2.5 text-2xs font-extrabold uppercase tracking-widest transition ' +
                  (channel === option
                    ? 'bg-white text-foreground shadow-card'
                    : 'text-muted-foreground hover:text-foreground')
                }
              >
                {option === 'phone' ? 'Mobile' : 'Email'}
              </button>
            ))}
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-center text-xs text-red-700">{error}</p>
        ) : null}

        {method === 'password' ? (
          <div className="mt-6 space-y-4">
            {identifierField}
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
              />
            </div>
            <button
              className="btn-primary w-full text-2xs uppercase tracking-widest"
              onClick={passwordLogin}
              disabled={loading || !identifier.trim() || password.length < 8}
            >
              {loading ? 'Signing in…' : 'Sign in with password'}
            </button>
            <button
              className="btn-outline w-full text-2xs uppercase tracking-widest"
              onClick={() => switchMethod('otp')}
            >
              Use a one-time code instead
            </button>
          </div>
        ) : step === 'identify' ? (
          <div className="mt-6 space-y-4">
            {identifierField}
            <div>
              <label className="label">Name (optional)</label>
              <input
                className="input"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
              />
            </div>
            <button
              className="btn-primary w-full text-2xs uppercase tracking-widest"
              onClick={requestOtp}
              disabled={loading || !identifier.trim()}
            >
              {loading ? 'Sending…' : 'Send OTP'}
            </button>

            <ul className="space-y-1.5 pt-1">
              {REASSURANCES.map((line) => (
                <li
                  key={line}
                  className="flex items-center justify-center gap-2 text-2xs text-muted-foreground"
                >
                  <span className="text-emerald-500">✓</span>
                  {line}
                </li>
              ))}
            </ul>

            <button
              className="btn-outline w-full text-2xs uppercase tracking-widest"
              onClick={() => switchMethod('password')}
            >
              Sign in with password
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {devCode ? (
              <p className="rounded-2xl bg-amber-50 p-3 text-center text-xs font-semibold text-amber-800 border border-amber-100">
                Dev mode — nothing was sent. Code:{' '}
                <strong className="ml-1 tracking-[0.2em]">{devCode}</strong>
              </p>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                We sent a 6-digit code to{' '}
                <strong className="text-foreground">{identifier.trim()}</strong>.
              </p>
            )}
            <div>
              <label className="label">Enter 6-digit OTP</label>
              <input
                className="input text-center text-lg tracking-[0.4em]"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="• • • • • •"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                maxLength={6}
              />
            </div>
            <button
              className="btn-primary w-full text-2xs uppercase tracking-widest"
              onClick={verifyOtp}
              disabled={loading || code.length !== 6}
            >
              {loading ? 'Verifying…' : 'Verify & Continue'}
            </button>
            <button
              className="btn-outline w-full text-2xs uppercase tracking-widest"
              onClick={requestOtp}
              disabled={loading || resendIn > 0}
            >
              {resendIn > 0 ? 'Resend code in ' + resendIn + 's' : 'Resend code'}
            </button>
            <button
              className="btn-outline w-full text-2xs uppercase tracking-widest"
              onClick={() => {
                setStep('identify');
                setCode('');
                setError('');
              }}
            >
              {channel === 'phone' ? 'Change number' : 'Change email'}
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-2xs leading-relaxed text-muted-foreground">
          By continuing, you agree to our{' '}
          <Link href="/terms-and-conditions" className="font-bold text-accent hover:underline">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/privacy-policy" className="font-bold text-accent hover:underline">
            Privacy Policy
          </Link>
          .
        </p>

        <p className="mt-4 text-center text-3xs font-extrabold uppercase tracking-widest text-muted-foreground">
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
