'use client';

import { useRouter } from '@/i18n/navigation';
import { api } from '@/lib/client';
import { openRazorpayCheckout } from '@/lib/razorpay';
import { formatInr } from '@poozari/shared';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

/**
 * Pay for a booking that was created but never paid — a dismissed checkout
 * modal, a declined card, a closed tab.
 *
 * The booking page promised this ("you can pay for it from My Bookings") long
 * before it existed, which left every abandoned checkout permanently unpayable.
 * It reuses the same create-order → checkout → verify path as the booking
 * page, so the amount still comes from the stored booking and none of the
 * modal handling is duplicated.
 */
export function PayNowButton({
  bookingId,
  amountInr,
  description,
  className,
  onPaid,
}: {
  bookingId: string;
  amountInr: number;
  description: string;
  className?: string;
  /** Called after a verified payment; defaults to refreshing the page. */
  onPaid?: () => void;
}) {
  const t = useTranslations('payNow');
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function pay() {
    setError('');
    setBusy(true);
    try {
      const order = await api.createPaymentOrder(bookingId);

      if ((order as any).devMode) {
        await api.verifyPayment(bookingId, {});
        settled();
        return;
      }

      await openRazorpayCheckout({
        order,
        description,
        onVerify: async (response) => {
          await api.verifyPayment(bookingId, response);
          settled();
        },
        onDismiss: () => {
          setBusy(false);
          setError(t('cancelled'));
        },
        onError: (message) => {
          setBusy(false);
          setError(message);
        },
      });
      // `busy` stays set while the modal is open, so the button underneath
      // cannot start a second payment for the same booking.
    } catch (e: any) {
      setError(e.message ?? t('errorStart'));
      setBusy(false);
    }
  }

  function settled() {
    if (onPaid) onPaid();
    else router.refresh();
    setBusy(false);
  }

  return (
    <div>
      <button
        className={className ?? 'btn-primary text-2xs uppercase tracking-widest'}
        disabled={busy}
        onClick={pay}
      >
        {busy ? t('processing') : t('pay', { amount: formatInr(amountInr) })}
      </button>
      {error ? (
        <p className="mt-2 rounded-2xl bg-red-50 p-2.5 text-3xs font-semibold text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
