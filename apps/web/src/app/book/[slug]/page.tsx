'use client';

import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import { formatInr, type Puja, type PujaPackage } from '@poozari/shared';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

function BookInner() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const packageId = search.get('packageId') ?? '';

  const [puja, setPuja] = useState<Puja | null>(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    devoteeName: '',
    gotra: '',
    contactPhone: '',
    contactEmail: '',
    preferredDate: '',
    preferredTime: '',
    addressLine: '',
    city: '',
    pincode: '',
    notes: '',
  });

  useEffect(() => {
    api.getPuja(params.slug).then(setPuja).catch(() => setError('Could not load puja'));
  }, [params.slug]);

  useEffect(() => {
    if (ready && !user) router.replace(`/login?next=/book/${params.slug}?packageId=${packageId}`);
  }, [ready, user, router, params.slug, packageId]);

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        devoteeName: f.devoteeName || user.name,
        contactPhone: f.contactPhone || user.phone || '',
      }));
    }
  }, [user]);

  const pkg: PujaPackage | undefined = useMemo(
    () => puja?.packages.find((p) => p.id === packageId) ?? puja?.packages[0],
    [puja, packageId],
  );

  function update(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit() {
    if (!puja || !pkg) return;
    setError('');
    setSubmitting(true);
    try {
      const booking = await api.createBooking({
        pujaId: puja.id,
        packageId: pkg.id,
        devoteeName: form.devoteeName,
        gotra: form.gotra || undefined,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail || undefined,
        preferredDate: form.preferredDate,
        preferredTime: form.preferredTime || undefined,
        addressLine: form.addressLine || undefined,
        city: form.city || undefined,
        pincode: form.pincode || undefined,
        notes: form.notes || undefined,
      });

      // Create the payment order.
      const order = await api.createPaymentOrder(booking.id);

      if ((order as any).devMode) {
        // Dev/mock payment: mark as paid immediately.
        await api.verifyPayment(booking.id, {});
        router.push(`/account/bookings/${booking.id}?paid=1`);
        return;
      }

      // Live Razorpay checkout.
      await loadRazorpay();
      const rzp = new (window as any).Razorpay({
        key: order.keyId,
        amount: order.amountInr * 100,
        currency: 'INR',
        name: 'poozari.com',
        description: puja.title,
        order_id: order.orderId,
        handler: async (resp: any) => {
          await api.verifyPayment(booking.id, resp);
          router.push(`/account/bookings/${booking.id}?paid=1`);
        },
        prefill: { name: form.devoteeName, contact: form.contactPhone, email: form.contactEmail },
        theme: { color: '#d95d0e' },
      });
      rzp.open();
    } catch (e: any) {
      setError(e.message ?? 'Could not complete booking');
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready || !user) return null;
  if (error && !puja) return <div className="app-container py-16 text-center text-red-600">{error}</div>;
  if (!puja || !pkg) {
    return (
      <div className="app-container py-16 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
        Loading…
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumbs navigation */}
      <div className="border-b" style={{ borderColor: 'hsl(var(--border) / 0.3)', background: 'hsl(var(--card))' }}>
        <div className="app-container py-3.5">
          <nav className="flex items-center gap-2 text-2xs font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>
            <Link href={`/puja/${puja.slug}`} className="hover:text-accent transition-colors">
              ← Back to {puja.title}
            </Link>
          </nav>
        </div>
      </div>

      <div className="app-container grid gap-8 py-10 lg:grid-cols-3 lg:gap-12">
        {/* Form area details */}
        <div className="lg:col-span-2">
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-wide" style={{ color: 'hsl(var(--foreground))' }}>
            Complete booking
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Provide sankalp details and coordinate scheduling.
          </p>

          {error ? (
            <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
          ) : null}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Field label="Devotee name *">
              <input className="input" value={form.devoteeName} onChange={(e) => update('devoteeName', e.target.value)} />
            </Field>
            <Field label="Gotra (Ancestry)">
              <input className="input" value={form.gotra} onChange={(e) => update('gotra', e.target.value)} />
            </Field>
            <Field label="Contact phone *">
              <input className="input" value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} />
            </Field>
            <Field label="Contact email">
              <input className="input" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} />
            </Field>
            <Field label="Preferred date *">
              <input type="date" className="input" value={form.preferredDate} onChange={(e) => update('preferredDate', e.target.value)} />
            </Field>
            <Field label="Preferred time / muhurat">
              <input className="input" placeholder="e.g. morning, 10:00 AM" value={form.preferredTime} onChange={(e) => update('preferredTime', e.target.value)} />
            </Field>
            {puja.locationType === 'HOME' ? (
              <>
                <Field label="Address Line">
                  <input className="input" value={form.addressLine} onChange={(e) => update('addressLine', e.target.value)} />
                </Field>
                <Field label="City">
                  <input className="input" value={form.city} onChange={(e) => update('city', e.target.value)} />
                </Field>
                <Field label="Pincode (for matching pandit)">
                  <input className="input" value={form.pincode} onChange={(e) => update('pincode', e.target.value)} />
                </Field>
              </>
            ) : null}
            <div className="sm:col-span-2">
              <Field label="Notes / Special requests">
                <textarea className="input" rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
              </Field>
            </div>
          </div>
        </div>

        {/* Sidebar summary panel */}
        <aside>
          <div className="elevated-card sticky top-20 p-6 bg-white">
            <h3 className="font-display text-sm font-extrabold uppercase tracking-widest text-foreground">
              Order summary
            </h3>
            <div className="mt-5 space-y-1.5 text-sm">
              <div className="font-bold" style={{ color: 'hsl(var(--foreground))' }}>{puja.title}</div>
              <div className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{pkg.name}</div>
            </div>

            {/* Inclusions checklist details */}
            {pkg.inclusions.length > 0 && (
              <ul className="mt-4 space-y-1.5 border-t pt-4" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
                {pkg.inclusions.map((inc) => (
                  <li key={inc} className="flex items-start gap-2 text-2xs font-semibold text-muted-foreground">
                    <span className="text-emerald-600">✓</span>
                    {inc}
                  </li>
                ))}
              </ul>
            )}

            <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
              <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Total</span>
              <span className="text-base font-black text-accent">{formatInr(pkg.priceInr)}</span>
            </div>
            <button
              className="btn-primary mt-6 w-full text-2xs uppercase tracking-widest"
              disabled={submitting || !form.devoteeName || !form.contactPhone || !form.preferredDate}
              onClick={submit}
            >
              {submitting ? 'Processing…' : `Pay ${formatInr(pkg.priceInr)}`}
            </button>
            <div className="mt-4 space-y-2 text-center text-3xs font-extrabold uppercase tracking-widest text-muted-foreground">
              <p>🔒 Secure payment via Razorpay</p>
              <p>
                <span className="mr-1 text-emerald-500">●</span> Support Active
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={null}>
      <BookInner />
    </Suspense>
  );
}

function loadRazorpay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) return resolve();
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay'));
    document.body.appendChild(script);
  });
}
