'use client';

import { StatusBadge } from '@/components/status-badge';
import { CustomerPanelNav } from '@/components/customer-panel-nav';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import { BOOKING_STATUS_FLOW, BOOKING_STATUS_LABELS, BookingStatus, formatInr, UserRole, type Booking } from '@poozari/shared';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function BookingDetailPage() {
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

  useEffect(() => {
    if (user?.role === UserRole.CUSTOMER) {
      api.getBooking(params.id).then(setBooking).catch(() => setBooking(null));
    }
  }, [user, params.id]);

  async function submitReview() {
    setMsg('');
    try {
      await api.createReview(params.id, { rating, comment });
      setMsg('Thank you for your review!');
    } catch (e: any) {
      setMsg(e.message ?? 'Could not submit review');
    }
  }

  if (!ready || !user || user.role !== UserRole.CUSTOMER) return null;
  if (!booking) {
    return (
      <div className="app-container py-16 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
        Loading…
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
        ← Back to list
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
                {BOOKING_STATUS_LABELS[s]}
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
                  🎥 Recorded Pooja Video
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
                    Video log pending
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Your recorded pooja video will be uploaded by the pandit once completed.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Feedback review */}
          {booking.status === BookingStatus.COMPLETED ? (
            <div className="card p-6 bg-white">
              <h3 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
                Rate your experience
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
                placeholder="Share your experience..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
              />
              <button className="btn-primary mt-4 text-2xs uppercase tracking-widest" onClick={submitReview}>
                Submit review
              </button>
            </div>
          ) : null}
        </div>

        {/* Sidebar details */}
        <aside className="space-y-4">
          <div className="card p-6 bg-white">
            <h3 className="mb-4 font-display text-xs font-bold uppercase tracking-widest text-foreground">
              Booking details
            </h3>
            <div className="space-y-1.5 text-xs font-semibold">
              <Row label="Devotee" value={booking.devoteeName} />
              {booking.gotra ? <Row label="Gotra" value={booking.gotra} /> : null}
              <Row label="Date" value={new Date(booking.preferredDate).toLocaleDateString('en-IN')} />
              {booking.preferredTime ? <Row label="Time" value={booking.preferredTime} /> : null}
              {booking.city ? <Row label="City" value={booking.city} /> : null}
              <div className="!mt-3 border-t pt-3" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
                <Row label="Amount" value={formatInr(booking.amountInr)} bold />
              </div>
            </div>
          </div>

          {booking.assignment?.pandit ? (
            <div className="card p-6 bg-white">
              <h3 className="mb-4 font-display text-xs font-bold uppercase tracking-widest text-foreground">
                Your pandit
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
                    {booking.assignment.pandit.experienceYears} yrs experience
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
