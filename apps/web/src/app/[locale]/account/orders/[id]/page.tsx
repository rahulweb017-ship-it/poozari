'use client';

import { Link, useRouter } from '@/i18n/navigation';
import { CustomerPanelNav } from '@/components/customer-panel-nav';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import { formatInr, ProductOrderStatus, UserRole, type ProductOrder } from '@poozari/shared';
import {useParams, useSearchParams} from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Suspense, useEffect, useState } from 'react';

function ProductOrderDetail() {
  const t = useTranslations('account.order');
  const to = useTranslations('account.orderStatus');
  const { user, ready } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const [order, setOrder] = useState<ProductOrder | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready && !user) router.replace(`/login?next=/account/orders/${params.id}`);
    else if (ready && user?.role !== UserRole.CUSTOMER) router.replace('/');
  }, [ready, user, router, params.id]);

  useEffect(() => {
    if (user?.role === UserRole.CUSTOMER) {
      api
        .getProductOrder(params.id)
        .then(setOrder)
        .catch((e: any) => setError(e.message ?? t('errors.loadFailed')));
    }
  }, [user, params.id]);

  if (!ready || !user || user.role !== UserRole.CUSTOMER) return null;
  if (!order) {
    return (
      <div className="app-container py-16 text-center text-muted-foreground">
        {error || t('loading')}
      </div>
    );
  }

  const paid = order.status === ProductOrderStatus.PAID;

  return (
    <main className="app-container py-8 sm:py-12">
      <CustomerPanelNav />
      <Link
        href="/account/orders"
        className="text-2xs font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-accent"
      >
        ← {t('back')}
      </Link>

      {(search.get('paid') === '1' || paid) && (
        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-5 text-emerald-800">
          <div className="font-display text-lg font-bold">{t('paidTitle')}</div>
          <p className="mt-1 text-xs">
            {t('paidBody')}
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="section-pill">{t('reference', { reference: order.reference })}</span>
          <h1 className="mt-4 font-display text-3xl font-black text-foreground">
            {order.productName}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {t('orderedOn', { date: new Date(order.createdAt).toLocaleDateString('en-IN') })}
          </p>
        </div>
        <span className={`badge ${paid ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {to.has(order.status as never) ? to(order.status as never) : order.status.replaceAll('_', ' ')}
        </span>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <section className="card bg-white p-6 lg:col-span-2">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
            {t('items')}
          </h2>
          <div className="mt-5 flex items-center gap-5 border-t pt-5">
            <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-accent-soft">
              {order.productImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={order.productImageUrl} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="flex-1">
              <h3 className="font-display text-base font-bold text-foreground">{order.productName}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatInr(order.unitPriceInr)} × {order.quantity}
              </p>
            </div>
            <div className="font-black text-accent">{formatInr(order.totalAmountInr)}</div>
          </div>
          <div className="mt-5 flex items-center justify-between border-t pt-5">
            <span className="text-sm font-black text-foreground">{t('totalPaid')}</span>
            <span className="font-display text-xl font-black text-accent">
              {formatInr(order.totalAmountInr)}
            </span>
          </div>
        </section>

        <aside className="card bg-white p-6">
          <h2 className="font-display text-sm font-bold uppercase tracking-wider text-foreground">
            {t('deliveryAddress')}
          </h2>
          <div className="mt-5 space-y-1 text-xs leading-relaxed text-muted-foreground">
            <div className="font-bold text-foreground">{order.customerName}</div>
            <div>{order.addressLine}</div>
            <div>{order.city}, {order.state} {order.pincode}</div>
            <div className="pt-3 font-semibold text-foreground">{order.contactPhone}</div>
            {order.contactEmail ? <div>{order.contactEmail}</div> : null}
          </div>
        </aside>
      </div>
    </main>
  );
}

export default function ProductOrderDetailPage() {
  return (
    <Suspense fallback={null}>
      <ProductOrderDetail />
    </Suspense>
  );
}
