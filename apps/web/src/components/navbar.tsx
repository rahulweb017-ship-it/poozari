'use client';

import { CurrencySwitcher, LocaleSwitcher } from '@/components/locale-switcher';
import { Link, usePathname } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

/** Main links, shown across the bar on desktop. */
const PRIMARY = [
  { href: '/puja?locationType=HOME', key: 'pujas' },
  { href: '/digital-puja', key: 'digitalPuja' },
  { href: '/teerth-puja', key: 'teerthPuja' },
  { href: '/live-darshan', key: 'liveDarshan' },
  { href: '/products', key: 'products' },
  { href: '/temples', key: 'temples' },
] as const;

/** Everything else, behind "More" on desktop and listed in full on mobile. */
const SECONDARY = [
  { href: '/about', key: 'about' },
  { href: '/how-it-works', key: 'howItWorks' },
  { href: '/blog', key: 'blog' },
  { href: '/deity', key: 'deity' },
  { href: '/faq', key: 'faq' },
  { href: '/contact', key: 'contact' },
  { href: '/become-a-pujari', key: 'becomePujari' },
] as const;

const SECONDARY_LABELS: Record<string, string> = {
  deity: 'By Deity',
};

export function Navbar() {
  const { user, logout, ready } = useAuth();
  const pathname = usePathname();
  const t = useTranslations('nav');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreBox = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    const onClick = (event: MouseEvent) => {
      if (moreBox.current && !moreBox.current.contains(event.target as Node)) setMoreOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [moreOpen]);

  // `usePathname` from @/i18n/navigation is locale-stripped, so these checks
  // work the same in every language.
  if (pathname.startsWith('/admin') || pathname.startsWith('/pandit')) return null;

  const label = (key: string) => SECONDARY_LABELS[key] ?? t(key as never);

  return (
    <>
      <header
        className="app-header sticky top-0 z-40 bg-white/70 backdrop-blur-md"
        style={{ borderBottomColor: 'hsl(var(--border) / 0.4)' }}
      >
        <div className="app-container flex h-16 items-center justify-between gap-3">
          {/* Logo / Brand */}
          <Link
            href="/"
            className="inline-block shrink-0 transition-transform duration-300 hover:scale-[1.02]"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/logo.png"
              alt="Poozari — Aapki Aasta, Humara Kartavya"
              className="block h-12 w-auto"
            />
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden items-center gap-5 xl:flex" aria-label="Primary">
            {PRIMARY.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="nav-link py-1"
                aria-current={pathname === n.href.split('?')[0] ? 'page' : undefined}
              >
                {t(n.key)}
              </Link>
            ))}

            {/* Secondary links, collapsed */}
            <div ref={moreBox} className="relative">
              <button
                type="button"
                onClick={() => setMoreOpen(!moreOpen)}
                className="nav-link flex items-center gap-1 py-1"
                aria-expanded={moreOpen}
              >
                {t('more')}
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className={`transition-transform ${moreOpen ? 'rotate-180' : ''}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {moreOpen ? (
                <div
                  className="absolute right-0 top-full z-50 mt-2 min-w-[13rem] overflow-hidden rounded-2xl border bg-white shadow-elevated"
                  style={{ borderColor: 'hsl(var(--border))' }}
                >
                  {SECONDARY.map((n) => (
                    <Link
                      key={n.href}
                      href={n.href}
                      onClick={() => setMoreOpen(false)}
                      className={`block px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-gray-50 ${
                        pathname === n.href.split('?')[0] ? 'text-accent' : 'text-gray-700'
                      }`}
                    >
                      {label(n.key)}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          </nav>

          {/* Desktop: language, currency, auth */}
          <div className="hidden items-center gap-2.5 xl:flex">
            <LocaleSwitcher />
            <CurrencySwitcher />
            {ready && user ? (
              <>
                <Link href="/account/bookings" className="nav-link ml-1 py-1">
                  {t('myAccount')}
                </Link>
                <button onClick={logout} className="btn-outline text-2xs uppercase tracking-wider">
                  {t('signOut')}
                </button>
              </>
            ) : (
              <Link href="/login" className="btn-primary text-2xs uppercase tracking-wider">
                {t('login')}
              </Link>
            )}
          </div>

          {/* Mobile: switchers stay reachable without opening the drawer */}
          <div className="flex items-center gap-2 xl:hidden">
            <LocaleSwitcher />
            <CurrencySwitcher />
            <button
              type="button"
              onClick={() => setMobileOpen(!mobileOpen)}
              className="btn--icon rounded-2xl border bg-white/50 transition-colors"
              style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
              aria-label={mobileOpen ? t('close') : t('menu')}
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

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity duration-300 xl:hidden"
            onClick={() => setMobileOpen(false)}
          />
          <div
            className="fixed inset-y-0 right-0 z-50 w-72 animate-slide-in-right overflow-y-auto border-l bg-white/95 shadow-2xl backdrop-blur-md xl:hidden"
            style={{ borderColor: 'hsl(var(--border))' }}
          >
            <div
              className="flex items-center justify-between border-b p-5"
              style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
            >
              <span className="font-display font-black uppercase tracking-wider text-accent">
                {t('menu')}
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                className="btn--icon rounded-xl"
                aria-label={t('close')}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>
              </button>
            </div>
            <nav className="flex flex-col gap-1 p-5">
              {[...PRIMARY, ...SECONDARY].map((n) => (
                <Link
                  key={n.href}
                  href={n.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-2xl px-4 py-3 text-xs font-bold uppercase tracking-wider transition-all ${
                    pathname === n.href.split('?')[0]
                      ? 'bg-accent-soft text-accent shadow-sm'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {label(n.key)}
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
                    {t('myAccount')}
                  </Link>
                  <button
                    onClick={() => {
                      logout();
                      setMobileOpen(false);
                    }}
                    className="btn-outline w-full text-2xs uppercase tracking-wider"
                  >
                    {t('signOut')}
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="btn-primary w-full text-2xs uppercase tracking-wider"
                >
                  {t('login')}
                </Link>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
