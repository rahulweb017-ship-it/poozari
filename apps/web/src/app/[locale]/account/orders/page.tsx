'use client';

import { Link, useRouter } from '@/i18n/navigation';
import { CustomerPanelNav } from '@/components/customer-panel-nav';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import { formatInr, UserRole, type ProductOrder } from '@poozari/shared';

import { useEffect, useState } from 'react';

export default function ProductOrdersPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<ProductOrder[] | null>(null);

  useEffect(() => {
    if (ready && !user) router.replace('/login?next=/account/orders');
    else if (ready && user?.role !== UserRole.CUSTOMER) router.replace('/');
  }, [ready, user, router]);

  useEffect(() => {
    if (user?.role === UserRole.CUSTOMER) {
      api.myProductOrders().then(setOrders).catch(() => setOrders([]));
    }
  }, [user]);

  if (!ready || !user || user.role !== UserRole.CUSTOMER) return null;

  return (
    <main className="app-container py-8 sm:py-12">
      <CustomerPanelNav />
      <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">
        Product Orders
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        View your puja product purchases and delivery details.
      </p>

      {orders === null ? (
        <div className="mt-8 space-y-4">
          {[1, 2].map((item) => (
            <div key={item} className="card h-28 animate-pulse bg-white" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="card mt-8 bg-white p-12 text-center">
          <div className="text-5xl">🪔</div>
          <h2 className="mt-4 font-display text-lg font-bold text-foreground">
            You have no product orders yet
          </h2>
          <Link href="/products" className="btn-primary mt-6 inline-flex">
            Browse Products
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.id}`}
              className="card group flex items-center gap-5 bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-accent-soft">
                {order.productImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={order.productImageUrl} alt="" className="h-full w-full object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-base font-bold text-foreground group-hover:text-accent">
                  {order.productName}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {order.reference} · Qty {order.quantity} ·{' '}
                  {new Date(order.createdAt).toLocaleDateString('en-IN')}
                </p>
              </div>
              <div className="text-right">
                <div className="font-black text-accent">{formatInr(order.totalAmountInr)}</div>
                <span className={`badge mt-2 ${order.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                  {order.status.replaceAll('_', ' ')}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
