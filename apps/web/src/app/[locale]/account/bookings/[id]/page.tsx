'use client';

import { Link, useRouter } from '@/i18n/navigation';
import { StatusBadge } from '@/components/status-badge';
import { CustomerPanelNav } from '@/components/customer-panel-nav';
import { PayNowButton } from '@/components/pay-now-button';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import { BOOKING_STATUS_FLOW, BookingStatus, formatInr, UserRole, type Booking } from '@poozari/shared';
import {useParams} from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

export default function BookingDetailPage() {
  const t = useTranslations('account.booking');
  const ts = useTranslations('account.status');
  const { user, ready } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (ready && !user) router.replace('/login?next=/account/bookings');
    else if (ready && user && user.role !== UserRole.CUSTOMER) router.replace('/');
  }, [ready, user, router]);

  const reload = useCallback(() => {
    api.getBooking(params.id).then(setBooking).catch(() => setBooking(null));
  }, [params.id]);

  useEffect(() => {
    if (user?.role === UserRole.CUSTOMER) reload();
  }, [user, reload]);

  async function submitReview() {
    setMsg('');
    try {
      await api.createReview(params.id, { rating, comment });
      setMsg(t('reviewThanks'));
    } catch (e: any) {
      setMsg(e.message ?? t('errors.reviewFailed'));
    }
  }

  if (!ready || !user || user.role !== UserRole.CUSTOMER) return null;
  if (!booking) {
    return (
      <div className="app-container py-16 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
        {t('loading')}
      </div>
    );
  }

  const currentIndex = BOOKING_STATUS_FLOW.indexOf(booking.status as BookingStatus);

  return (
    <div className="app-container py-8 sm:py-12">
      <CustomerPanelNav />
      {/* Back navigation */}
      <Link href="/account/bookings" className="text-2xs font-bold uppercase tracking-wider transition-colors hover:text-accent"
            style={{ color: 'hsl(var(--muted-foreground))' }}>
        ← {t('back')}
      </Link>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">
            {booking.puja.title}
          </h1>
          <p className="mt-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {booking.reference} · {booking.package.name}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      {/* Progress tracker stepper */}
      <div className="card mt-8 p-6 bg-white">
        <div className="flex flex-wrap gap-4 items-center">
          {BOOKING_STATUS_FLOW.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all ${
                i <= currentIndex
                  ? 'bg-accent text-white shadow-md'
                  : 'bg-gray-100 text-gray-400'
              }`}>
                {i <= currentIndex ? '✓' : i + 1}
              </span>
              <span className={`text-2xs font-bold uppercase tracking-wider transition-colors ${
                i <= currentIndex ? 'text-accent' : 'text-gray-400'
              }`}>
                {ts(s)}
              </span>
              {i < BOOKING_STATUS_FLOW.length - 1 && (
                <div className={`hidden h-0.5 w-8 sm:block ${i < currentIndex ? 'bg-accent/40' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-3 lg:gap-10">
        <div className="lg:col-span-2 space-y-6">
          {/* Video logs panel */}
          {booking.videoUrl ? (
            <div className="card overflow-hidden bg-white">
              <div className="border-b px-6 py-4 bg-gray-50/50" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
                <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                  🎥 {t('videoTitle')}
                </h3>
              </div>
              <div className="p-6">
                <video className="w-full rounded-2xl border" controls poster={booking.thumbnailUrl ?? undefined}>
                  <source src={booking.videoUrl} />
                </video>
              </div>
            </div>
          ) : (
            <div className="card p-6 bg-white">
              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent-soft text-xl text-accent shadow-sm">🎥</span>
                <div>
                  <div className="text-sm font-bold text-foreground">
                    {t('videoPending')}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {t('videoPendingBody')}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feedback review */}
          {booking.status === BookingStatus.COMPLETED ? (
            <div className="card p-6 bg-white">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                {t('rateTitle')}
              </h3>
              {msg ? <p className="mt-3 rounded-2xl bg-green-50 p-3 text-xs text-green-700">{msg}</p> : null}
              <div className="mt-4 flex gap-1.5 text-3xl">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setRating(n)}
                    className={`transition-colors duration-200 ${n <= rating ? 'text-accent' : 'text-gray-300'}`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <textarea
                className="input mt-4"
                rows={3}
                placeholder={t('reviewPlaceholder')}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button className="btn-primary mt-4 text-2xs uppercase tracking-widest" onClick={submitReview}>
                {t('submitReview')}
              </button>
            </div>
          ) : null}
        </div>

        {/* Sidebar details */}
        <aside className="space-y-4">
          <div className="card p-6 bg-white">
            <h3 className="mb-4 font-display text-xs font-bold uppercase tracking-widest text-foreground">
              {t('details')}
            </h3>
            <div className="space-y-1.5 text-xs font-semibold">
              <Row label={t('devotee')} value={booking.devoteeName} />
              {booking.gotra ? <Row label={t('gotra')} value={booking.gotra} /> : null}
              <Row label={t('date')} value={new Date(booking.preferredDate).toLocaleDateString('en-IN')} />
              {booking.preferredTime ? <Row label={t('time')} value={booking.preferredTime} /> : null}
              {booking.city ? <Row label={t('city')} value={booking.city} /> : null}
              {/* Itemise only when add-ons were bought, so a plain booking
                  does not grow a one-line breakdown of itself. */}
              {booking.addons.length > 0 ? (
                <div className="!mt-3 border-t pt-3" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
                  <Row label={booking.package.name} value={formatInr(booking.packageAmountInr)} />
                  {booking.addons.map((addon) => (
                    <Row key={addon.id} label={addon.name} value={formatInr(addon.priceInr)} />
                  ))}
                </div>
              ) : null}
              <div className="!mt-3 border-t pt-3" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
                <Row label={t('amount')} value={formatInr(booking.amountInr)} bold />
              </div>
            </div>

            {/* An unpaid booking is payable from here. Without this a dismissed
                checkout modal left the booking permanently unpayable. */}
            {booking.status === BookingStatus.PENDING_PAYMENT ? (
              <div className="mt-5 border-t pt-5" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
                <p className="mb-3 text-3xs font-bold uppercase tracking-wider text-amber-700">
                  {t('notPaid')}
                </p>
                <PayNowButton
                  bookingId={booking.id}
                  amountInr={booking.amountInr}
                  description={booking.puja.title}
                  className="btn-primary w-full text-2xs uppercase tracking-widest"
                  onPaid={reload}
                />
              </div>
            ) : null}
          </div>

          {booking.assignment?.pandit ? (
            <div className="card p-6 bg-white">
              <h3 className="mb-4 font-display text-xs font-bold uppercase tracking-widest text-foreground">
                {t('yourPandit')}
              </h3>
              <div className="flex items-center gap-3.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent shadow-sm">
                  {booking.assignment.pandit.displayName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-sm text-foreground">
                    {booking.assignment.pandit.displayName}
                  </div>
                  <div className="text-2xs text-muted-foreground mt-0.5">
                    {t('experience', { years: booking.assignment.pandit.experienceYears })}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between py-1.5">
      <span className="text-muted-foreground">{label}</span>
      <span className={bold ? 'font-black text-accent' : 'text-foreground'}>
        {value}
      </span>
    </div>
  );
}
