'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/puja', label: 'Puja at Home' },
  { href: '/teerth-puja', label: 'Teerth Puja' },
  { href: '/live-darshan', label: 'Live Darshan' },
  { href: '/products', label: 'Products' },
  { href: '/temples', label: 'Famous Temples' },
  { href: '/deity', label: 'By Deity' },
];

export function Navbar() {
  const { user, logout, ready } = useAuth();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Hide public navbar on admin/pandit shells
  if (pathname.startsWith('/admin') || pathname.startsWith('/pandit')) return null;

  return (
    <>
      <header className="app-header sticky top-0 z-40 bg-white/70 backdrop-blur-md"
              style={{ borderBottomColor: 'hsl(var(--border) / 0.4)' }}>
        <div className="app-container flex h-16 items-center justify-between gap-4">
          {/* Logo / Brand */}
          <Link href="/" className="inline-block shrink-0 transition-transform duration-300 hover:scale-[1.02]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo.png"
              alt="Poozari — Aapki Aasta, Humara Kartavya"
              className="block h-12 w-auto"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-6 lg:flex" aria-label="Primary">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="nav-link py-1"
                aria-current={pathname === n.href ? 'page' : undefined}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          {/* Desktop Authentication Controls */}
          <div className="hidden items-center gap-4 lg:flex">
            {ready && user ? (
              <>
                <Link href="/account/bookings" className="nav-link py-1">
                  My Bookings
                </Link>
                <Link
                  href="/account/profile"
                  className="nav-link py-1"
                  aria-current={pathname.startsWith('/account/profile') ? 'page' : undefined}
                  onClick={(event) => {
                    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    window.location.assign('/account/profile');
                  }}
                >
                  Profile
                </Link>
                <button onClick={logout} className="btn-outline text-2xs uppercase tracking-wider">
                  Logout
                </button>
              </>
            ) : (
              <Link href="/login" className="btn-primary text-2xs uppercase tracking-wider">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                  <polyline points="10 17 15 12 10 7" />
                  <line x1="15" x2="3" y1="12" y2="12" />
                </svg>
                Login
              </Link>
            )}
          </div>

          {/* Mobile Hamburguer Action */}
          <div className="flex items-center gap-2 lg:hidden">
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="btn--icon rounded-2xl border bg-white/50 transition-colors"
              style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Sidebar Navigation Drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 z-50 w-72 animate-slide-in-right border-l bg-white/95 shadow-2xl backdrop-blur-md lg:hidden"
               style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="flex items-center justify-between border-b p-5" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
              <span className="font-display font-black uppercase tracking-wider text-accent">Menu</span>
              <button onClick={() => setMobileOpen(false)} className="btn--icon rounded-xl" aria-label="Close menu">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>
            <nav className="flex flex-col gap-1.5 p-5">
              {NAV.map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                    pathname === n.href
                      ? 'bg-accent-soft text-accent shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="border-t p-5" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
              {ready && user ? (
                <div className="space-y-3">
                  <Link
                    href="/account/bookings"
                    onClick={() => setMobileOpen(false)}
                    className="block rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-50"
                  >
                    My Bookings
                  </Link>
                  <Link
                    href="/account/profile"
                    onClick={(event) => {
                      setMobileOpen(false);
                      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
                      event.preventDefault();
                      window.location.assign('/account/profile');
                    }}
                    className="block rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-wider text-gray-700 hover:bg-gray-50"
                  >
                    Profile &amp; Security
                  </Link>
                  <button
                    onClick={() => { logout(); setMobileOpen(false); }}
                    className="btn-outline w-full text-2xs uppercase tracking-wider"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <Link href="/login" onClick={() => setMobileOpen(false)} className="btn-primary w-full text-2xs uppercase tracking-wider">
                  Login
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
