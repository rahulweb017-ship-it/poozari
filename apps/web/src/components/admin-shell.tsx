'use client';

import { Link, usePathname, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth';
import { UserRole } from '@poozari/shared';

import { useEffect } from 'react';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/bookings', label: 'Bookings', icon: '📋' },
  { href: '/admin/pandits', label: 'Pandits', icon: '👨‍🏫' },
  { href: '/admin/pujas', label: 'Pujas', icon: '🪔' },
  { href: '/admin/addons', label: 'Add-ons', icon: '🌼' },
  { href: '/admin/products', label: 'Products', icon: '📦' },
  { href: '/admin/catalog', label: 'Catalog', icon: '🗂️' },
  { href: '/admin/import', label: 'Bulk Import', icon: '📥' },
  { href: '/admin/blog', label: 'Blog', icon: '📝' },
  { href: '/admin/inbox', label: 'Inbox', icon: '📨' },
  { href: '/admin/applications', label: 'Applications', icon: '📜' },
  { href: '/admin/currencies', label: 'Currencies', icon: '💱' },
  { href: '/admin/live', label: 'Live Darshan', icon: '📡' },
];

/** Guards Super Admin pages and renders the panel chrome. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, ready, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (ready && (!user || user.role !== UserRole.SUPER_ADMIN)) {
      router.replace('/admin/login');
    }
  }, [ready, user, router]);

  if (!ready || !user || user.role !== UserRole.SUPER_ADMIN) return null;

  return (
    <div className="flex min-h-screen" style={{ background: 'hsl(var(--background))' }}>
      {/* Sidebar navigation panel */}
      <aside className="hidden w-64 shrink-0 flex-col border-r bg-white shadow-sm md:flex"
             style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        {/* Sidebar brand header */}
        <div className="flex items-center gap-3 border-b px-6 py-5" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/mark.png" alt="Poozari diya mark" className="h-10 w-10 rounded-2xl shadow-sm" />
          <div>
            <div className="font-display text-sm font-extrabold uppercase tracking-wider text-accent">poozari</div>
            <div className="text-2xs font-bold uppercase tracking-widest text-gray-400">Admin Control</div>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 space-y-1.5 p-4">
          {NAV.map((n) => {
            const active = pathname === n.href;
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                  active
                    ? 'bg-accent-soft text-accent shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <span className="text-base">{n.icon}</span>
                {n.label}
                {active && (
                  <span className="ml-auto h-1.5 w-1.5 rounded-full bg-accent" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar user footer */}
        <div className="border-t p-4" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
          <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-xs font-bold text-white">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-bold text-gray-900">{user.name}</div>
              <div className="truncate text-2xs font-semibold text-gray-400">{user.email}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="mt-2.5 w-full rounded-2xl px-4 py-2.5 text-left text-2xs font-bold uppercase tracking-wider text-gray-400 transition-colors hover:bg-red-50 hover:text-red-700"
          >
            ← Sign out
          </button>
        </div>
      </aside>

      {/* Main page content area */}
      <div className="flex flex-1 flex-col">
        {/* Mobile top navigation header */}
        <div className="flex items-center justify-between border-b bg-white px-5 py-3 md:hidden"
             style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/mark.png" alt="Poozari" className="h-7 w-7 rounded-full" />
            <span className="font-display text-sm font-black uppercase tracking-wider text-accent">Admin</span>
          </div>
          <button onClick={logout} className="text-2xs font-bold uppercase tracking-wider text-gray-500 hover:text-red-600">
            Sign out
          </button>
        </div>
        {/* Mobile quick tabs navigation */}
        <div className="flex gap-1.5 overflow-x-auto border-b bg-white px-4 py-2 md:hidden"
             style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`shrink-0 rounded-xl px-4 py-2 text-2xs font-bold uppercase tracking-wider transition-colors ${
                pathname === n.href
                  ? 'bg-accent-soft text-accent'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {n.icon} {n.label}
            </Link>
          ))}
        </div>

        <div className="flex-1 p-6 sm:p-10">{children}</div>
      </div>
    </div>
  );
}
