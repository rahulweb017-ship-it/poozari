'use client';

import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import { UserRole } from '@poozari/shared';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AdminLoginPage() {
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
      if (res.user.role !== UserRole.SUPER_ADMIN) {
        setError('This login is for Super Admin only.');
        return;
      }
      login(res);
      router.push('/admin');
    } catch (e: any) {
      setError(e.message ?? 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4"
         style={{ background: 'linear-gradient(135deg, #0b0f19 0%, #151d30 100%)' }}>
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-md">
        {/* Branding */}
        <div className="flex items-center justify-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="Poozari diya mark" className="h-11 w-11 rounded-full shadow-lg" />
          <span className="font-display text-xl font-black uppercase tracking-widest text-white">poozari</span>
        </div>
        {/* Stripe */}
        <div className="mx-auto mt-4 h-0.5 w-16 rounded-full bg-gradient-to-r from-accent to-primary" />

        <h1 className="mt-6 text-center font-display text-base font-extrabold uppercase tracking-wider text-white">
          Super Admin Login
        </h1>
        <p className="mt-1.5 text-center text-xs text-white/50">
          Authorized console access credentials required.
        </p>

        {error ? (
          <p className="mt-4 rounded-2xl bg-red-500/20 p-3 text-center text-xs text-red-300 border border-red-500/30">{error}</p>
        ) : null}

        <div className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-3xs font-bold uppercase tracking-wider text-white/70">Email</label>
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 transition-all focus:border-accent/50 focus:outline-none focus:ring-4 focus:ring-accent/10"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@poozari.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-3xs font-bold uppercase tracking-wider text-white/70">Password</label>
            <input
              type="password"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30 transition-all focus:border-accent/50 focus:outline-none focus:ring-4 focus:ring-accent/10"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            className="btn-primary w-full text-2xs uppercase tracking-widest"
            onClick={submit}
            disabled={loading || !email || !password}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>

        <p className="mt-6 text-center text-3xs font-bold uppercase tracking-widest text-white/30">
          🔒 Secure Admin Gateway
        </p>
      </div>
    </div>
  );
}
