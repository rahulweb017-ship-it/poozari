/**
 * Razorpay Standard Checkout, in one place.
 *
 * The three paid flows (puja booking, product order, live-darshan join) all
 * need the same things: load the script once, open the modal, verify the
 * signature server-side, and cope with the two non-success outcomes people
 * actually hit — closing the modal, and a declined card. Keeping it here means
 * none of those can be forgotten in one flow but not another.
 */

const SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

/** Brand saffron, so the modal does not look bolted on. */
const THEME_COLOR = '#d95d0e';

let scriptPromise: Promise<void> | null = null;

/** Load checkout.js once per page, however many times checkout is opened. */
export function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('Not in a browser'));
  if ((window as unknown as { Razorpay?: unknown }).Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      // Let a later attempt retry rather than caching the failure forever.
      scriptPromise = null;
      reject(new Error('Could not load the payment window. Check your connection.'));
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}

/** What the API's create-order endpoints return. */
export interface CheckoutOrder {
  orderId: string;
  amountInr: number;
  keyId: string;
}

export interface CheckoutOptions {
  order: CheckoutOrder;
  /** Shown as the line item in the modal. */
  description: string;
  prefill?: { name?: string; contact?: string; email?: string };
  /**
   * Verify the signature server-side. Throw to signal failure — the message is
   * passed to `onError`.
   */
  onVerify: (response: RazorpayResponse) => Promise<void>;
  /** The customer closed the modal without paying. */
  onDismiss: () => void;
  /** Anything went wrong: a declined payment, or a failed verification. */
  onError: (message: string) => void;
}

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

/**
 * Open the checkout modal and drive it to a conclusion.
 *
 * Note the key comes from the order the API just returned, not from a
 * `NEXT_PUBLIC_*` variable. One source of truth means the key can never
 * disagree with the account that created the order.
 */
export async function openRazorpayCheckout(options: CheckoutOptions): Promise<void> {
  await loadRazorpayScript();

  const RazorpayCtor = (window as unknown as { Razorpay: new (o: unknown) => RazorpayInstance })
    .Razorpay;

  const checkout = new RazorpayCtor({
    key: options.order.keyId,
    // Razorpay bills in paise.
    amount: options.order.amountInr * 100,
    currency: 'INR',
    name: 'poozari.com',
    description: options.description,
    order_id: options.order.orderId,
    prefill: options.prefill,
    theme: { color: THEME_COLOR },
    handler: (response: RazorpayResponse) => {
      // The modal has closed by now, so a rejection here would otherwise be an
      // unhandled promise and the customer would see nothing at all.
      void options.onVerify(response).catch((error: unknown) => {
        const message =
          error instanceof Error ? error.message : 'We could not verify that payment.';
        options.onError(message);
      });
    },
    modal: {
      ondismiss: () => options.onDismiss(),
    },
  });

  // A declined card or a failed UPI mandate arrives here, not in `handler`.
  checkout.on('payment.failed', (event: RazorpayFailure) => {
    const reason =
      event?.error?.description ??
      event?.error?.reason ??
      'The payment did not go through. No money has been taken.';
    options.onError(reason);
  });

  checkout.open();
}

interface RazorpayInstance {
  open(): void;
  on(event: 'payment.failed', handler: (event: RazorpayFailure) => void): void;
}

interface RazorpayFailure {
  error?: { description?: string; reason?: string; code?: string };
}
