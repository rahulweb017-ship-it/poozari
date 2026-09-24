'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

const ITEMS = [
  { href: '/account/bookings', key: 'bookings' },
  { href: '/account/orders', key: 'orders' },
  { href: '/account/profile', key: 'profile' },
] as const;

export function CustomerPanelNav() {
  const t = useTranslations('account.nav');
  const pathname = usePathname();

  return (
    <nav
      className="mb-8 flex gap-2 overflow-x-auto border-b pb-3"
      style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
      aria-label={t('aria')}
    >
      {ITEMS.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shrink-0 rounded-full px-5 py-2.5 text-2xs font-bold uppercase tracking-wider transition-colors ${
              active ? 'bg-accent text-white shadow-sm' : 'bg-white text-gray-500 hover:text-accent'
            }`}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
