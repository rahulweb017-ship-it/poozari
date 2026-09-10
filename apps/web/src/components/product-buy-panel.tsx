'use client';

import { useRouter } from '@/i18n/navigation';
import { WhatsappBookButton } from '@/components/whatsapp';
import { Price, PriceNote, useCurrency } from '@/lib/currency';
import type { Product } from '@poozari/shared';

import { useTranslations } from 'next-intl';
import { useState } from 'react';

export function ProductBuyPanel({ product }: { product: Product }) {
  const router = useRouter();
  const wa = useTranslations('whatsapp');
  const { formatInrExact } = useCurrency();
  const maxQuantity = Math.min(product.stockQuantity, 10);
  const [quantity, setQuantity] = useState(1);

  function changeQuantity(next: number) {
    setQuantity(Math.max(1, Math.min(maxQuantity, next)));
  }

  return (
    <div className="elevated-card bg-white p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-3xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Price
          </div>
          <div className="mt-1 font-display text-3xl font-black text-accent">
            <Price amountInr={product.priceInr} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Inclusive of all taxes</p>
        </div>
        <span
          className={`badge ${
            product.stockQuantity > 0
              ? 'bg-emerald-50 text-emerald-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {product.stockQuantity > 0 ? 'In stock' : 'Out of stock'}
        </span>
      </div>

      {product.stockQuantity > 0 ? (
        <>
          <div className="mt-6">
            <label className="label">Quantity</label>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex items-center overflow-hidden rounded-xl border border-gray-200">
                <button
                  type="button"
                  aria-label="Decrease quantity"
                  className="h-11 w-11 text-lg font-bold text-foreground transition-colors hover:bg-accent-soft hover:text-accent"
                  onClick={() => changeQuantity(quantity - 1)}
                  disabled={quantity <= 1}
                >
                  −
                </button>
                <span className="flex h-11 min-w-12 items-center justify-center border-x border-gray-200 text-sm font-black">
                  {quantity}
                </span>
                <button
                  type="button"
                  aria-label="Increase quantity"
                  className="h-11 w-11 text-lg font-bold text-foreground transition-colors hover:bg-accent-soft hover:text-accent"
                  onClick={() => changeQuantity(quantity + 1)}
                  disabled={quantity >= maxQuantity}
                >
                  +
                </button>
              </div>
              <span className="text-xs text-muted-foreground">
                {product.stockQuantity} available
              </span>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between border-t pt-5 text-sm">
            <span className="font-bold text-muted-foreground">Order total</span>
            <span className="font-display text-xl font-black text-foreground">
              <Price amountInr={product.priceInr * quantity} />
            </span>
          </div>
          {/* Non-INR readers must see the exact rupee amount before paying. */}
          <PriceNote
            amountInr={product.priceInr * quantity}
            className="mt-1.5 block text-3xs font-semibold text-muted-foreground"
          />
          <button
            type="button"
            className="btn-primary mt-5 w-full text-2xs uppercase tracking-widest"
            onClick={() =>
              router.push(`/checkout/product/${product.slug}?quantity=${quantity}`)
            }
          >
            Buy Now
          </button>
          {/* Ordering over WhatsApp, with the item and quantity pre-filled. */}
          <div className="mt-3">
            <WhatsappBookButton
              label={wa('orderOnWhatsapp')}
              context={{
                kind: 'product',
                title: quantity > 1 ? `${product.name} x ${quantity}` : product.name,
                price: formatInrExact(product.priceInr * quantity),
              }}
            />
          </div>
        </>
      ) : (
        <button type="button" className="btn-primary mt-6 w-full" disabled>
          Currently unavailable
        </button>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 border-t pt-5 text-center text-3xs font-bold uppercase tracking-wider text-muted-foreground">
        <span>Secure payment</span>
        <span>Careful packaging</span>
        <span>Authentic products</span>
        <span>Delivery support</span>
      </div>
    </div>
  );
}
