'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';

/* ------------------------------------------------------------------ Header */

export function AdminPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div
      className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b pb-6"
      style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
    >
      <div>
        <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Notice({ error, message }: { error?: string; message?: string }) {
  if (!error && !message) return null;
  return (
    <div className="mb-4 space-y-2">
      {error ? (
        <p role="alert" className="rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-2xl bg-green-50 p-3 text-xs font-semibold text-green-700">{message}</p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------- Modal */

const MODAL_WIDTHS = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' } as const;

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  size = 'md',
}: {
  open: boolean;
  title: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  size?: keyof typeof MODAL_WIDTHS;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:items-center"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className={`elevated-card my-8 flex max-h-[90vh] w-full flex-col ${MODAL_WIDTHS[size]}`}
      >
        <div
          className="flex items-center justify-between gap-4 border-b px-6 py-4"
          style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
        >
          <h2 className="font-display text-base font-bold uppercase tracking-wider text-foreground">
            {title}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-muted-foreground hover:bg-gray-100 hover:text-foreground"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer ? (
          <div
            className="flex flex-wrap justify-end gap-2 border-t px-6 py-4"
            style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Label/value rows for a details popup. Empty values render as an em dash. */
export function DetailList({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-3xs font-extrabold uppercase tracking-widest text-muted-foreground">
            {item.label}
          </dt>
          <dd className="mt-1 break-words text-sm text-foreground">
            {item.value === null || item.value === undefined || item.value === '' ? '—' : item.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/* ----------------------------------------------------------- Action button */

const ACTION_TONES = {
  default: 'border-gray-200 text-gray-700 hover:bg-gray-50',
  accent: 'border-accent/30 text-accent hover:bg-accent-soft',
  danger: 'border-red-200 text-red-600 hover:bg-red-50',
  success: 'border-emerald-200 text-emerald-700 hover:bg-emerald-50',
} as const;

export function ActionButton({
  children,
  onClick,
  tone = 'default',
  disabled,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: keyof typeof ACTION_TONES;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={(event) => {
        // Rows open the details popup on click; actions must not also trigger it.
        event.stopPropagation();
        onClick();
      }}
      className={`whitespace-nowrap rounded-lg border px-2.5 py-1 text-3xs font-bold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${ACTION_TONES[tone]}`}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------- Data table */

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

export interface FilterDef<T> {
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  match: (row: T, value: string) => boolean;
}

/**
 * The shared admin list: search, dropdown filters, a table and "Load more".
 * Filtering runs client-side over the rows the page already loaded.
 */
export function DataTable<T>({
  rows,
  columns,
  getRowId,
  searchText,
  searchPlaceholder = 'Search…',
  filters = [],
  pageSize = 20,
  onRowClick,
  actions,
  loading,
  emptyText = 'No records found.',
  toolbar,
}: {
  rows: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  filters?: FilterDef<T>[];
  pageSize?: number;
  onRowClick?: (row: T) => void;
  actions?: (row: T) => ReactNode;
  loading?: boolean;
  emptyText?: string;
  toolbar?: ReactNode;
}) {
  const [query, setQuery] = useState('');
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [visible, setVisible] = useState(pageSize);

  useEffect(() => {
    setVisible(pageSize);
  }, [query, filterValues, pageSize]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (needle && searchText && !searchText(row).toLowerCase().includes(needle)) return false;
      return filters.every((filter) => {
        const value = filterValues[filter.key];
        return !value || filter.match(row, value);
      });
    });
  }, [rows, query, filterValues, filters, searchText]);

  const shown = filtered.slice(0, visible);
  const hasActiveFilters = Boolean(query) || Object.values(filterValues).some(Boolean);

  return (
    <div className="card overflow-hidden bg-white">
      <div
        className="flex flex-wrap items-center gap-3 border-b p-4"
        style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
      >
        {searchText ? (
          <div className="relative min-w-[200px] flex-1">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              🔍
            </span>
            <input
              className="input py-2 pl-9 text-xs"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        ) : null}
        {filters.map((filter) => (
          <select
            key={filter.key}
            aria-label={filter.label}
            className="input w-auto py-2 text-xs"
            value={filterValues[filter.key] ?? ''}
            onChange={(event) =>
              setFilterValues((current) => ({ ...current, [filter.key]: event.target.value }))
            }
          >
            <option value="">{filter.label}: All</option>
            {filter.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ))}
        {hasActiveFilters ? (
          <button
            type="button"
            className="text-2xs font-bold uppercase tracking-wider text-accent hover:underline"
            onClick={() => {
              setQuery('');
              setFilterValues({});
            }}
          >
            Clear
          </button>
        ) : null}
        {toolbar}
        <span className="ml-auto text-3xs font-bold uppercase tracking-widest text-muted-foreground">
          {filtered.length} of {rows.length}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-gray-50/70">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`whitespace-nowrap px-4 py-3 text-3xs font-extrabold uppercase tracking-widest text-muted-foreground ${column.className ?? ''}`}
                >
                  {column.header}
                </th>
              ))}
              {actions ? (
                <th className="px-4 py-3 text-right text-3xs font-extrabold uppercase tracking-widest text-muted-foreground">
                  Actions
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {shown.map((row) => (
              <tr
                key={getRowId(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`border-t align-middle transition-colors ${onRowClick ? 'cursor-pointer hover:bg-accent-soft/40' : ''}`}
                style={{ borderColor: 'hsl(var(--border) / 0.35)' }}
              >
                {columns.map((column) => (
                  <td key={column.key} className={`px-4 py-3 ${column.className ?? ''}`}>
                    {column.render(row)}
                  </td>
                ))}
                {actions ? (
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap justify-end gap-1.5">{actions(row)}</div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {shown.length === 0 ? (
        <p className="p-10 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {loading ? 'Loading…' : hasActiveFilters ? 'No records match your search.' : emptyText}
        </p>
      ) : null}

      {filtered.length > shown.length ? (
        <div className="border-t p-4 text-center" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
          <button
            type="button"
            className="btn-outline text-2xs uppercase tracking-wider"
            onClick={() => setVisible((count) => count + pageSize)}
          >
            Load more ({filtered.length - shown.length} remaining)
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** A thumbnail cell; falls back to the first letter when there is no image. */
export function Thumb({ src, label }: { src?: string | null; label: string }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-accent-soft text-sm font-bold text-accent">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        label.charAt(0).toUpperCase() || '?'
      )}
    </div>
  );
}

export function StatusPill({ on, onLabel, offLabel }: { on: boolean; onLabel: string; offLabel: string }) {
  return (
    <span className={`badge ${on ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
      {on ? onLabel : offLabel}
    </span>
  );
}
