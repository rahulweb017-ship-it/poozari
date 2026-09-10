'use client';

import { api } from '@/lib/client';
import {
  CURRENCY_COOKIE,
  DEFAULT_CURRENCIES,
  formatMoney,
  type Currency,
} from '@poozari/shared';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

interface CurrencyContextValue {
  /** Currency the reader is browsing in. Prices are only *displayed* in it. */
  currency: Currency;
  /** Every currency the admin has switched on. */
  options: Currency[];
  setCurrencyCode: (code: string) => void;
  /** Format an INR amount in the reader's currency, e.g. 5100 -> "$61". */
  format: (amountInr: number) => string;
  /** Always the real charge amount, e.g. "₹5,100". Use it wherever money moves. */
  formatInrExact: (amountInr: number) => string;
  /** True when the reader is not looking at INR, so prices are converted. */
  isConverted: boolean;
}

const INR = DEFAULT_CURRENCIES.find((c) => c.code === 'INR') as Currency;

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: INR,
  options: DEFAULT_CURRENCIES,
  setCurrencyCode: () => undefined,
  format: (amountInr) => formatMoney(amountInr, INR),
  formatInrExact: (amountInr) => formatMoney(amountInr, INR),
  isConverted: false,
});

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Holds the reader's display currency.
 *
 * Rates are pulled from the API (Super Admin maintains them) and fall back to
 * the built-in defaults if that call fails, so a rate outage never leaves the
 * catalogue without prices. Payment is always taken in INR — see `PriceNote`.
 */
export function CurrencyProvider({
  children,
  initialCode,
}: {
  children: React.ReactNode;
  initialCode?: string;
}) {
  const [options, setOptions] = useState<Currency[]>(DEFAULT_CURRENCIES);
  const [code, setCode] = useState(initialCode ?? 'INR');

  // Pick up a choice made before this page was server-rendered.
  useEffect(() => {
    const saved = readCookie(CURRENCY_COOKIE);
    if (saved) setCode(saved);
  }, []);

  useEffect(() => {
    api
      .listCurrencies()
      .then((rates) => {
        if (rates.length) setOptions(rates);
      })
      .catch(() => undefined);
  }, []);

  const setCurrencyCode = useCallback((next: string) => {
    setCode(next);
    // A cookie (not localStorage) so the server can render the right prices too.
    document.cookie = `${CURRENCY_COOKIE}=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const value = useMemo<CurrencyContextValue>(() => {
    const currency = options.find((c) => c.code === code) ?? INR;
    return {
      currency,
      options,
      setCurrencyCode,
      format: (amountInr: number) => formatMoney(amountInr, currency),
      formatInrExact: (amountInr: number) => formatMoney(amountInr, INR),
      isConverted: currency.code !== 'INR',
    };
  }, [code, options, setCurrencyCode]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

/** A price in the reader's currency. */
export function Price({ amountInr, className }: { amountInr: number; className?: string }) {
  const { format } = useCurrency();
  return <span className={className}>{format(amountInr)}</span>;
}

/**
 * Shown next to any amount the customer is about to pay. Non-INR readers see
 * an approximate price, so the exact INR charge has to be on screen before
 * they commit — their card issuer, not us, does the conversion.
 */
export function PriceNote({ amountInr, className }: { amountInr: number; className?: string }) {
  const { isConverted, formatInrExact } = useCurrency();
  if (!isConverted) return null;
  return (
    <span className={className}>
      Charged as {formatInrExact(amountInr)} — your bank converts it.
    </span>
  );
}
