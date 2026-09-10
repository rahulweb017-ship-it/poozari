'use client';

import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import { UserRole } from '@poozari/shared';

import { useEffect, useState } from 'react';

const NAV = [
  { href: '/pandit/bookings', label: 'Bookings', icon: '📋' },
  { href: '/pandit/live', label: 'Live Darshan', icon: '📡' },
  { href: '/pandit/profile', label: 'Profile', icon: '👤' },
];

/** Guards Pandit pages and renders the panel chrome. */
export function PanditShell({ children }: { children: React.ReactNode }) {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [accessReady, setAccessReady] = useState(false);

  useEffect(() => {
    if (ready && (!user || user.role !== UserRole.PANDIT)) {
      router.replace('/pandit/login');
    }
  }, [ready, user, router]);

  useEffect(() => {
    if (!ready || !user || user.role !== UserRole.PANDIT) {
      setAccessReady(false);
      return;
    }
    api.panditProfile()
      .then(() => setAccessReady(true))
      .catch((error: any) => {
        if (error?.status === 401 || error?.status === 403) {
          logout();
          router.replace('/pandit/login');
          return;
        }
        setAccessReady(true);
      });
  }, [ready, user, logout, router]);

  if (!ready || !user || user.role !== UserRole.PANDIT || !accessReady) return null;

  return (
    <div className="min-h-screen" style={{ background: 'hsl(var(--background))' }}>
      <header className="border-b bg-white shadow-sm" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        {/* Accent top stripe */}
        <div className="h-1 bg-gradient-to-r from-accent via-primary to-accent" />
        <div className="app-container flex h-16 items-center justify-between">
          <Link href="/pandit/bookings" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/mark.png" alt="Poozari diya mark" className="h-10 w-10 rounded-2xl shadow-sm" />
            <div>
              <span className="font-display text-sm font-extrabold uppercase tracking-wider text-accent">poozari</span>
              <span className="ml-2 text-2xs font-bold uppercase tracking-widest text-gray-400">Pandit Portal</span>
            </div>
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-bold text-white shadow-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden text-xs font-bold uppercase tracking-wider text-gray-700 sm:inline">
                {user.name}
              </span>
            </div>
            <button onClick={logout} className="btn-outline text-2xs uppercase tracking-wider">
              Logout
            </button>
          </div>
        </div>
        {/* Section tabs */}
        <div className="app-container flex gap-1.5 overflow-x-auto border-t py-2"
             style={{ borderColor: 'hsl(var(--border) / 0.4)' }}>
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`shrink-0 rounded-xl px-4 py-2 text-2xs font-bold uppercase tracking-wider transition-colors ${
                  active ? 'bg-accent-soft text-accent' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {n.icon} {n.label}
              </Link>
            );
          })}
        </div>
      </header>
      <div className="app-container py-8">{children}</div>
    </div>
  );
}
