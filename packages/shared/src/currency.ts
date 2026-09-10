import { z } from 'zod';

/**
 * Display currencies.
 *
 * Prices are stored and charged in INR everywhere in this codebase
 * (`priceInr`, `amountInr`). A currency here only changes what a reader *sees*
 * — Razorpay still takes the payment in rupees and the customer's card issuer
 * does the conversion. That keeps refunds exact and avoids FX settlement.
 */
export interface Currency {
  code: string;
  /** Language-neutral label for the switcher, e.g. "US Dollar". */
  label: string;
  symbol: string;
  /** How many units of this currency one rupee buys. INR is 1. */
  ratePerInr: number;
  /** BCP-47 tag used for digit grouping, e.g. "en-IN" -> 5,100. */
  locale: string;
  /** Decimals to show. INR prices are whole rupees. */
  decimals: number;
  isActive: boolean;
  sortOrder: number;
}

/** Remembered client-side so server-rendered pages can price correctly too. */
export const CURRENCY_COOKIE = 'poozari_currency';

/**
 * Seed rates, and the fallback if the rates API is unreachable.
 *
 * These are indicative only — the Super Admin maintains the live numbers under
 * Admin → Currencies. Treat them as a starting point, not a market feed.
 */
export const DEFAULT_CURRENCIES: Currency[] = [
  {
    code: 'INR',
    label: 'Indian Rupee',
    symbol: '₹',
    ratePerInr: 1,
    locale: 'en-IN',
    decimals: 0,
    isActive: true,
    sortOrder: 0,
  },
  {
    code: 'USD',
    label: 'US Dollar',
    symbol: '$',
    ratePerInr: 0.012,
    locale: 'en-US',
    decimals: 2,
    isActive: true,
    sortOrder: 1,
  },
  {
    code: 'EUR',
    label: 'Euro',
    symbol: '€',
    ratePerInr: 0.011,
    locale: 'de-DE',
    decimals: 2,
    isActive: true,
    sortOrder: 2,
  },
  {
    code: 'GBP',
    label: 'Pound Sterling',
    symbol: '£',
    ratePerInr: 0.0094,
    locale: 'en-GB',
    decimals: 2,
    isActive: true,
    sortOrder: 3,
  },
];

/** Convert an INR amount and format it in the given currency. */
export function formatMoney(amountInr: number, currency: Currency): string {
  const converted = amountInr * currency.ratePerInr;
  try {
    return new Intl.NumberFormat(currency.locale, {
      style: 'currency',
      currency: currency.code,
      minimumFractionDigits: currency.decimals,
      maximumFractionDigits: currency.decimals,
    }).format(converted);
  } catch {
    // Unknown ISO code (an admin can add one) — fall back to the symbol.
    return `${currency.symbol}${converted.toFixed(currency.decimals)}`;
  }
}

/* ----------------------------- Admin writes ----------------------------- */

export const currencyRateSchema = z.object({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'Use a 3-letter ISO code, e.g. USD'),
  label: z.string().trim().min(2).max(60),
  symbol: z.string().trim().min(1).max(6),
  ratePerInr: z.number().positive('Rate must be greater than 0'),
  locale: z.string().trim().min(2).max(20).default('en-US'),
  decimals: z.number().int().min(0).max(4).default(2),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(999).default(0),
});
export type CurrencyRateInput = z.infer<typeof currencyRateSchema>;

export const updateCurrencyRateSchema = currencyRateSchema.partial().omit({ code: true });
export type UpdateCurrencyRateInput = z.infer<typeof updateCurrencyRateSchema>;
