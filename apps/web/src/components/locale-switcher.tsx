'use client';

import { usePathname, useRouter } from '@/i18n/navigation';
import { LOCALE_LABELS, locales, type Locale } from '@/i18n/routing';
import { useCurrency } from '@/lib/currency';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

/** Shared dropdown shell for the two pickers. */
function Picker({
  label,
  trigger,
  children,
  align = 'right',
}: {
  label: string;
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (event: MouseEvent) => {
      if (box.current && !box.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-label={label}
        aria-expanded={open}
        className="flex items-center gap-1 rounded-2xl border bg-white/60 px-2.5 py-1.5 text-2xs font-bold uppercase tracking-wider text-gray-700 transition-colors hover:text-accent"
        style={{ borderColor: 'hsl(var(--border) / 0.6)' }}
      >
        {trigger}
        <svg
          width="10"
          height="10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open ? (
        <div
          className={`absolute top-full z-50 mt-2 min-w-[11rem] overflow-hidden rounded-2xl border bg-white shadow-elevated ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
          style={{ borderColor: 'hsl(var(--border))' }}
          role="menu"
        >
          <div
            className="border-b px-3 py-2 text-3xs font-extrabold uppercase tracking-wider text-muted-foreground"
            style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
          >
            {label}
          </div>
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}

/** Switches language while keeping the reader on the same page. */
export function LocaleSwitcher() {
  const t = useTranslations('nav');
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Picker label={t('language')} trigger={<span>{LOCALE_LABELS[locale].short}</span>}>
      {(close) =>
        locales.map((option) => (
          <button
            key={option}
            type="button"
            role="menuitem"
            onClick={() => {
              close();
              // `pathname` here is locale-stripped, so this lands on the same page.
              router.replace(pathname, { locale: option });
            }}
            className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-xs font-semibold transition-colors hover:bg-gray-50 ${
              option === locale ? 'text-accent' : 'text-gray-700'
            }`}
          >
            {LOCALE_LABELS[option].name}
            {option === locale ? <span aria-hidden>✓</span> : null}
          </button>
        ))
      }
    </Picker>
  );
}

/** Switches the display currency. Charges stay in INR. */
export function CurrencySwitcher() {
  const t = useTranslations('nav');
  // Read at the top level: the dropdown body only renders when open, so a hook
  // called down there would change hook order between renders.
  const note = useTranslations('currencyNote')('approx');
  const { currency, options, setCurrencyCode } = useCurrency();

  if (options.length < 2) return null;

  return (
    <Picker label={t('currency')} trigger={<span>{currency.code}</span>}>
      {(close) => (
        <>
          {options.map((option) => (
            <button
              key={option.code}
              type="button"
              role="menuitem"
              onClick={() => {
                setCurrencyCode(option.code);
                close();
              }}
              className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-xs font-semibold transition-colors hover:bg-gray-50 ${
                option.code === currency.code ? 'text-accent' : 'text-gray-700'
              }`}
            >
              <span>
                <span className="mr-1.5">{option.symbol}</span>
                {option.code}
              </span>
              <span className="text-3xs font-normal text-muted-foreground">{option.label}</span>
            </button>
          ))}
          <p
            className="border-t px-3 py-2 text-3xs leading-relaxed text-muted-foreground"
            style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
          >
            {note}
          </p>
        </>
      )}
    </Picker>
  );
}
