'use client';

import { useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import { UserRole } from '@poozari/shared';

import { useState } from 'react';

export default function PanditLoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError('');
    setLoading(true);
    try {
      const res = await api.staffLogin({ email, password });
      if (res.user.role !== UserRole.PANDIT) {
        setError('This login is for pandits only.');
        return;
      }
      login(res);
      router.push('/pandit/bookings');
    } catch (e: any) {
      setError(e.message ?? 'Login failed');
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

        <h1 className="mt-5 text-center font-display text-base font-extrabold uppercase tracking-wider text-foreground">
          Poojari ji Login
        </h1>
        <p className="mt-1.5 text-center text-xs text-muted-foreground">
          Access assigned bookings and video logs.
        </p>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 p-3 text-center text-xs text-red-700">{error}</p>
        ) : null}

        <div className="mt-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="pandit@poozari.com" />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </div>
          <button className="btn-primary w-full text-2xs uppercase tracking-widest" onClick={submit} disabled={loading || !email || !password}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>

        <p className="mt-6 text-center text-3xs font-extrabold uppercase tracking-widest text-muted-foreground">
          🔒 Secure pandit access
        </p>
      </div>
    </div>
  );
}
