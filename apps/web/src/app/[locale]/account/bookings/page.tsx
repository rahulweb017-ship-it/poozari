'use client';

import { Link, useRouter } from '@/i18n/navigation';
import { StatusBadge } from '@/components/status-badge';
import { CustomerPanelNav } from '@/components/customer-panel-nav';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import { BookingStatus, formatInr, UserRole, type Booking } from '@poozari/shared';

import { useEffect, useState } from 'react';

export default function MyBookingsPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  useEffect(() => {
    if (ready && !user) router.replace('/login?next=/account/bookings');
    else if (ready && user && user.role !== UserRole.CUSTOMER) router.replace('/');
  }, [ready, user, router]);

  useEffect(() => {
    if (user?.role === UserRole.CUSTOMER) {
      api.myBookings().then(setBookings).catch(() => setBookings([]));
    }
  }, [user]);

  if (!ready || !user || user.role !== UserRole.CUSTOMER) return null;

  return (
    <div className="app-container py-8 sm:py-12">
      <CustomerPanelNav />
      <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">My Bookings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Track your registered puja bookings, live status, and uploaded video logs.
      </p>

      {bookings === null ? (
        <div className="mt-6 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card animate-pulse p-6">
              <div className="h-4 w-40 rounded bg-gray-200" />
              <div className="mt-3 h-3 w-64 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="card mt-8 p-12 text-center bg-white">
          <div className="text-5xl">🕉️</div>
          <p className="mt-4 font-display text-base font-bold text-foreground">
            You have no bookings yet.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Browse our list of Vedic services and coordinate your first booking.
          </p>
          <Link href="/puja" className="btn-primary mt-6 inline-flex text-2xs uppercase tracking-widest">
            Browse Puja
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {bookings.map((b) => (
            <Link
              key={b.id}
              href={`/account/bookings/${b.id}`}
              className="card group flex items-center justify-between p-6 transition-all duration-300 hover:translate-y-[-2px] hover:shadow-md"
            >
              <div className="min-w-0 flex-1">
                <div className="font-display font-bold text-sm text-foreground transition-colors duration-300 group-hover:text-accent">
                  {b.puja.title}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground">
                  <span>{b.reference}</span>
                  <span>{b.package.name}</span>
                  <span>📅 {new Date(b.preferredDate).toLocaleDateString('en-IN')}</span>
                </div>
                {/* The row is already a link, so this points at the detail page
                    where the pay button lives rather than nesting a button. */}
                {b.status === BookingStatus.PENDING_PAYMENT ? (
                  <div className="mt-2.5 text-2xs font-extrabold uppercase tracking-wider text-amber-700">
                    ⚠ Not paid — open to pay {formatInr(b.amountInr)}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-4">
                <span className="hidden font-black text-accent sm:inline">{formatInr(b.amountInr)}</span>
                <StatusBadge status={b.status} />
                <span className="text-gray-300 transition-colors group-hover:text-accent font-bold text-sm">→</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
