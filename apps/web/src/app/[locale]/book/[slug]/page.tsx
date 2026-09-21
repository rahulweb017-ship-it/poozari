'use client';

import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import { WhatsappBookButton } from '@/components/whatsapp';
import { Price, PriceNote } from '@/lib/currency';
import { openRazorpayCheckout } from '@/lib/razorpay';
import { formatInr, localized, type Addon, type Puja, type PujaPackage } from '@poozari/shared';
import {useParams, useSearchParams} from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { Suspense, useEffect, useMemo, useState } from 'react';

function BookInner() {
  const { user, ready } = useAuth();
  const t = useTranslations('booking');
  const wa = useTranslations('whatsapp');
  const locale = useLocale();
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const packageId = search.get('packageId') ?? '';

  const [puja, setPuja] = useState<Puja | null>(null);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>([]);
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
    api.getPuja(params.slug).then(setPuja).catch(() => setError(t('couldNotLoad')));
  }, [params.slug, t]);

  // Add-ons are optional extras — if the list fails to load, the devotee can
  // still book the puja itself, so this never surfaces an error.
  useEffect(() => {
    api.listAddons().then(setAddons).catch(() => setAddons([]));
  }, []);

  useEffect(() => {
    if (ready && !user) router.replace(`/login?next=/book/${params.slug}?packageId=${packageId}`);
  }, [ready, user, router, params.slug, packageId]);

  /**
   * Pre-fill the sankalp from the saved profile, so a returning devotee does
   * not retype their gotra and address on every booking. Only blank fields are
   * filled — anything already typed on this form wins.
   */
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      devoteeName: f.devoteeName || user.name,
      contactPhone: f.contactPhone || user.phone || '',
      contactEmail: f.contactEmail || user.email || '',
    }));

    api
      .myProfile()
      .then((profile) => {
        setForm((f) => ({
          ...f,
          gotra: f.gotra || profile.gotra || '',
          contactEmail: f.contactEmail || profile.email || '',
          addressLine: f.addressLine || profile.addressLine || '',
          city: f.city || profile.city || '',
          pincode: f.pincode || profile.pincode || '',
        }));
      })
      // A profile that fails to load just means an unfilled form, not an error.
      .catch(() => undefined);
  }, [user]);

  const pkg: PujaPackage | undefined = useMemo(
    () => puja?.packages.find((p) => p.id === packageId) ?? puja?.packages[0],
    [puja, packageId],
  );

  /**
   * Mirrors what the server will charge, so the button never promises a total
   * the API disagrees with. The API recomputes from its own prices regardless
   * — this is display only.
   */
  const chosenAddons = useMemo(
    () => addons.filter((a) => selectedAddonIds.includes(a.id)),
    [addons, selectedAddonIds],
  );
  const addonTotalInr = useMemo(
    () => chosenAddons.reduce((sum, a) => sum + a.priceInr, 0),
    [chosenAddons],
  );
  const totalInr = (pkg?.priceInr ?? 0) + addonTotalInr;

  function update(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function toggleAddon(id: string) {
    setSelectedAddonIds((ids) =>
      ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id],
    );
  }

  async function submit() {
    if (!puja || !pkg) return;
    setError('');
    setSubmitting(true);
    try {
      const booking = await api.createBooking({
        pujaId: puja.id,
        packageId: pkg.id,
        // Ids only. The server prices them; a total sent from here would be
        // trusted by nobody and is never read.
        addonIds: selectedAddonIds,
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

      // Live Razorpay checkout. The booking is already saved as
      // PENDING_PAYMENT, so abandoning the modal loses nothing.
      await openRazorpayCheckout({
        order,
        description: puja.title,
        prefill: {
          name: form.devoteeName,
          contact: form.contactPhone,
          email: form.contactEmail,
        },
        onVerify: async (response) => {
          await api.verifyPayment(booking.id, response);
          router.push(`/account/bookings/${booking.id}?paid=1`);
        },
        onDismiss: () => {
          setSubmitting(false);
          setError(t('paymentCancelled'));
        },
        onError: (message) => {
          setSubmitting(false);
          setError(message);
        },
      });
      // Deliberately leave `submitting` set: the modal is open on top of this
      // form, and re-enabling the button would allow a second booking.
    } catch (e: any) {
      setError(e.message ?? t('couldNotComplete'));
      setSubmitting(false);
    }
  }

  if (!ready || !user) return null;
  if (error && !puja) return <div className="app-container py-16 text-center text-red-600">{error}</div>;
  if (!puja || !pkg) {
    return (
      <div className="app-container py-16 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
        {t('loading')}
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
              ← {t('backTo', { title: localized(puja, 'title', locale) })}
            </Link>
          </nav>
        </div>
      </div>

      <div className="app-container grid gap-8 py-10 lg:grid-cols-3 lg:gap-12">
        {/* Form area details */}
        <div className="lg:col-span-2">
          <h1 className="font-display text-2xl font-extrabold uppercase tracking-wide" style={{ color: 'hsl(var(--foreground))' }}>
            {t('title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('subtitle')}</p>

          {error ? (
            <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
          ) : null}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Field label={t('devoteeName')}>
              <input className="input" value={form.devoteeName} onChange={(e) => update('devoteeName', e.target.value)} />
            </Field>
            <Field label={t('gotra')}>
              <input className="input" value={form.gotra} onChange={(e) => update('gotra', e.target.value)} />
            </Field>
            <Field label={t('contactPhone')}>
              <input className="input" value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} />
            </Field>
            <Field label={t('contactEmail')}>
              <input className="input" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} />
            </Field>
            <Field label={t('preferredDate')}>
              <input type="date" className="input" value={form.preferredDate} onChange={(e) => update('preferredDate', e.target.value)} />
            </Field>
            <Field label={t('preferredTime')}>
              <input className="input" placeholder={t('preferredTimePlaceholder')} value={form.preferredTime} onChange={(e) => update('preferredTime', e.target.value)} />
            </Field>
            {puja.locationType === 'HOME' ? (
              <>
                <Field label={t('addressLine')}>
                  <input className="input" value={form.addressLine} onChange={(e) => update('addressLine', e.target.value)} />
                </Field>
                <Field label={t('city')}>
                  <input className="input" value={form.city} onChange={(e) => update('city', e.target.value)} />
                </Field>
                <Field label={t('pincode')}>
                  <input className="input" value={form.pincode} onChange={(e) => update('pincode', e.target.value)} />
                </Field>
              </>
            ) : null}
            <div className="sm:col-span-2">
              <Field label={t('notes')}>
                <textarea className="input" rows={3} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
              </Field>
            </div>
          </div>

          {/* Optional paid extras. The same set is offered on every puja. */}
          {addons.length > 0 && (
            <div className="mt-10">
              <h2 className="font-display text-lg font-extrabold uppercase tracking-wide" style={{ color: 'hsl(var(--foreground))' }}>
                {t('addonsTitle')}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">{t('addonsSubtitle')}</p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {addons.map((addon) => {
                  const checked = selectedAddonIds.includes(addon.id);
                  return (
                    <label
                      key={addon.id}
                      className="flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors"
                      style={{
                        borderColor: checked
                          ? 'hsl(var(--accent))'
                          : 'hsl(var(--border) / 0.6)',
                        background: checked ? 'hsl(var(--accent) / 0.05)' : 'transparent',
                      }}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[hsl(var(--accent))]"
                        checked={checked}
                        onChange={() => toggleAddon(addon.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-3">
                          <span className="text-sm font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                            {localized(addon, 'name', locale)}
                          </span>
                          <span className="shrink-0 text-sm font-black text-accent">
                            +<Price amountInr={addon.priceInr} />
                          </span>
                        </span>
                        {localized(addon, 'description', locale) ? (
                          <span className="mt-1 block text-2xs leading-relaxed text-muted-foreground">
                            {localized(addon, 'description', locale)}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar summary panel */}
        <aside>
          <div className="elevated-card sticky top-20 p-6 bg-white">
            <h3 className="font-display text-sm font-extrabold uppercase tracking-widest text-foreground">
              {t('orderSummary')}
            </h3>
            <div className="mt-5 space-y-1.5 text-sm">
              <div className="font-bold" style={{ color: 'hsl(var(--foreground))' }}>{localized(puja, 'title', locale)}</div>
              <div className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{localized(pkg, 'name', locale)}</div>
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

            {/* Itemise only once there is more than the package to show. */}
            {chosenAddons.length > 0 && (
              <div className="mt-5 space-y-2 border-t pt-4" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
                <div className="flex items-baseline justify-between gap-3 text-xs">
                  <span className="min-w-0 truncate font-semibold text-muted-foreground">
                    {localized(pkg, 'name', locale)}
                  </span>
                  <span className="shrink-0 font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                    <Price amountInr={pkg.priceInr} />
                  </span>
                </div>
                {chosenAddons.map((addon) => (
                  <div key={addon.id} className="flex items-baseline justify-between gap-3 text-xs">
                    <span className="min-w-0 truncate font-semibold text-muted-foreground">
                      {localized(addon, 'name', locale)}
                    </span>
                    <span className="shrink-0 font-bold" style={{ color: 'hsl(var(--foreground))' }}>
                      <Price amountInr={addon.priceInr} />
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between border-t pt-4 text-sm" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
              <span className="font-bold text-xs uppercase tracking-wider text-muted-foreground">{t('total')}</span>
              <span className="text-base font-black text-accent">
                <Price amountInr={totalInr} />
              </span>
            </div>
            {/* Razorpay bills in rupees, so show the exact charge. */}
            <PriceNote
              amountInr={totalInr}
              className="mt-1.5 block text-3xs font-semibold text-muted-foreground"
            />
            <button
              className="btn-primary mt-6 w-full text-2xs uppercase tracking-widest"
              disabled={submitting || !form.devoteeName || !form.contactPhone || !form.preferredDate}
              onClick={submit}
            >
              {submitting ? t('processing') : t('pay', { amount: formatInr(totalInr) })}
            </button>
            {/* Booking by chat instead. The message carries the puja, the
                package and the rupee price. */}
            <div
              className="mt-5 rounded-2xl border p-4"
              style={{ borderColor: 'hsl(var(--border) / 0.6)' }}
            >
              <p className="text-2xs font-bold uppercase tracking-wider text-foreground">
                {wa('preferWhatsapp')}
              </p>
              <p className="mt-1.5 text-3xs leading-relaxed text-muted-foreground">
                {wa('preferWhatsappBody')}
              </p>
              <div className="mt-3">
                <WhatsappBookButton
                  pujaSlug={params.slug}
                  context={{
                    kind: 'puja',
                    title: puja ? localized(puja, 'title', locale) : '',
                    packageName: pkg ? localized(pkg, 'name', locale) : undefined,
                    price: pkg ? formatInr(pkg.priceInr) : undefined,
                  }}
                />
              </div>
            </div>

            <div className="mt-4 space-y-2 text-center text-3xs font-extrabold uppercase tracking-widest text-muted-foreground">
              <p>🔒 {t('securePayment')}</p>
              <p>
                <span className="mr-1 text-emerald-500">●</span> {t('supportActive')}
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

