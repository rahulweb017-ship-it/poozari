'use client';

import { Link, useRouter } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import { Price, PriceNote } from '@/lib/currency';
import { openRazorpayCheckout } from '@/lib/razorpay';
import { formatInr, UserRole, type Product } from '@poozari/shared';
import { useTranslations } from 'next-intl';
import {useParams, useSearchParams} from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';

function ProductCheckout() {
  const t = useTranslations('productCheckout');
  const { user, ready } = useAuth();
  const router = useRouter();
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const requestedQuantity = Number(search.get('quantity') ?? 1);

  const [product, setProduct] = useState<Product | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    customerName: '',
    contactPhone: '',
    contactEmail: '',
    addressLine: '',
    city: '',
    state: '',
    pincode: '',
  });

  const quantity = useMemo(() => {
    const normalized = Number.isInteger(requestedQuantity) ? requestedQuantity : 1;
    return Math.max(1, Math.min(10, normalized));
  }, [requestedQuantity]);

  useEffect(() => {
    const next = `/checkout/product/${params.slug}?quantity=${quantity}`;
    if (ready && !user) router.replace(`/login?next=${encodeURIComponent(next)}`);
    else if (ready && user?.role !== UserRole.CUSTOMER) router.replace('/products');
  }, [ready, user, router, params.slug, quantity]);

  useEffect(() => {
    api
      .getProduct(params.slug)
      .then(setProduct)
      .catch((e: any) => setError(e.message ?? t('errorLoad')))
      .finally(() => setLoadingProduct(false));
  }, [params.slug, t]);

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      customerName: current.customerName || user.name,
      contactPhone: current.contactPhone || user.phone || '',
      contactEmail: current.contactEmail || user.email || '',
    }));
  }, [user]);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  const canSubmit =
    product &&
    product.stockQuantity >= quantity &&
    form.customerName.trim().length >= 2 &&
    form.contactPhone.trim() &&
    form.addressLine.trim().length >= 5 &&
    form.city.trim().length >= 2 &&
    form.state.trim().length >= 2 &&
    /^\d{6}$/.test(form.pincode);

  async function submit() {
    if (!product || !canSubmit) return;
    setError('');
    setSubmitting(true);
    try {
      const order = await api.createProductOrder({
        productId: product.id,
        quantity,
        customerName: form.customerName,
        contactPhone: form.contactPhone,
        contactEmail: form.contactEmail || undefined,
        addressLine: form.addressLine,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
      });
      const paymentOrder = await api.createProductPaymentOrder(order.id);

      if (paymentOrder.devMode) {
        await api.verifyProductPayment(order.id, {});
        router.push(`/account/orders/${order.id}?paid=1`);
        return;
      }

      // The order is already saved as PENDING_PAYMENT, so abandoning the
      // modal loses nothing.
      await openRazorpayCheckout({
        order: paymentOrder,
        description: product.name,
        prefill: {
          name: form.customerName,
          contact: form.contactPhone,
          email: form.contactEmail,
        },
        onVerify: async (response) => {
          await api.verifyProductPayment(order.id, response);
          router.push(`/account/orders/${order.id}?paid=1`);
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
    } catch (e: any) {
      setError(e.message ?? t('errorCheckout'));
      setSubmitting(false);
    }
  }

  if (!ready || !user || user.role !== UserRole.CUSTOMER) return null;
  if (loadingProduct) {
    return <div className="app-container py-16 text-center text-muted-foreground">{t('loading')}</div>;
  }
  if (!product) {
    return <div className="app-container py-16 text-center text-red-600">{error || t('notFound')}</div>;
  }

  const total = product.priceInr * quantity;

  return (
    <main className="app-container py-8 sm:py-12">
      <Link
        href={`/products/${product.slug}`}
        className="text-2xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-accent"
      >
        ← {t('back')}
      </Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_380px] lg:gap-12">
        <section>
          <span className="section-pill">{t('pill')}</span>
          <h1 className="mt-4 font-display text-3xl font-black text-foreground">
            {t('title')}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t('subtitle')}
          </p>

          {error ? (
            <p className="mt-5 rounded-2xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <Field label={`${t('fullName')} *`}>
              <input className="input" value={form.customerName} onChange={(e) => update('customerName', e.target.value)} />
            </Field>
            <Field label={`${t('mobile')} *`}>
              <input className="input" inputMode="tel" value={form.contactPhone} onChange={(e) => update('contactPhone', e.target.value)} />
            </Field>
            <div className="sm:col-span-2">
              <Field label={t('email')}>
                <input className="input" type="email" value={form.contactEmail} onChange={(e) => update('contactEmail', e.target.value)} />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label={`${t('address')} *`}>
                <textarea className="input" rows={3} placeholder={t('addressPlaceholder')} value={form.addressLine} onChange={(e) => update('addressLine', e.target.value)} />
              </Field>
            </div>
            <Field label={`${t('city')} *`}>
              <input className="input" value={form.city} onChange={(e) => update('city', e.target.value)} />
            </Field>
            <Field label={`${t('state')} *`}>
              <input className="input" value={form.state} onChange={(e) => update('state', e.target.value)} />
            </Field>
            <Field label={`${t('pincode')} *`}>
              <input className="input" inputMode="numeric" maxLength={6} value={form.pincode} onChange={(e) => update('pincode', e.target.value.replace(/\D/g, ''))} />
            </Field>
          </div>
        </section>

        <aside>
          <div className="elevated-card sticky top-20 bg-white p-6">
            <h2 className="font-display text-sm font-extrabold uppercase tracking-widest text-foreground">
              {t('orderSummary')}
            </h2>
            <div className="mt-5 flex gap-4">
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-accent-soft">
                {product.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div>
                <div className="font-display text-sm font-bold text-foreground">{product.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{t('quantity', { quantity })}</div>
                <div className="mt-1 text-xs font-bold text-accent">
                  <Price amountInr={product.priceInr} /> {t('each')}
                </div>
              </div>
            </div>
            <div className="mt-6 space-y-3 border-t pt-5 text-xs">
              <SummaryRow label={t('subtotal')} value={<Price amountInr={total} />} />
              <SummaryRow label={t('delivery')} value={t('free')} />
              <div className="flex items-center justify-between border-t pt-4">
                <span className="font-black uppercase tracking-wider text-foreground">{t('total')}</span>
                <span className="font-display text-xl font-black text-accent">
                  <Price amountInr={total} />
                </span>
              </div>
              {/* The card is charged in rupees, so a non-INR reader has to see
                  the exact amount before committing. */}
              <PriceNote
                amountInr={total}
                className="block pt-1 text-3xs font-semibold text-muted-foreground"
              />
            </div>
            <button
              type="button"
              className="btn-primary mt-6 w-full text-2xs uppercase tracking-widest"
              disabled={submitting || !canSubmit}
              onClick={submit}
            >
              {submitting ? t('processing') : t('pay', { amount: formatInr(total) })}
            </button>
            <p className="mt-4 text-center text-3xs font-bold uppercase tracking-widest text-muted-foreground">
              {t('securePayment')}
            </p>
          </div>
        </aside>
      </div>
    </main>
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

function SummaryRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}


export default function ProductCheckoutPage() {
  return (
    <Suspense fallback={null}>
      <ProductCheckout />
    </Suspense>
  );
}
