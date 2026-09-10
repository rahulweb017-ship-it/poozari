'use client';

/**
 * The small set of form pieces the public forms share, so Contact, Enquiry and
 * the pujari application look and behave identically.
 */

export function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="label">
        {label}
        {required ? <span className="ml-0.5 text-accent">*</span> : null}
      </label>
      {children}
      {hint ? (
        <p className="mt-1.5 text-3xs font-semibold uppercase tracking-wider text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700">
      {message}
    </p>
  );
}

/** The panel shown after a successful submit, in place of the form. */
export function SubmittedPanel({
  heading,
  body,
  actionLabel,
  onAction,
}: {
  heading: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="card bg-white p-8 text-center">
      <div
        className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl text-emerald-600"
        aria-hidden="true"
      >
        ✓
      </div>
      <h3 className="mt-4 font-display text-lg font-bold text-foreground">{heading}</h3>
      <p className="mx-auto mt-2.5 max-w-md text-xs leading-relaxed text-muted-foreground">
        {body}
      </p>
      <button onClick={onAction} className="btn-outline mt-6 text-2xs uppercase tracking-wider">
        {actionLabel}
      </button>
    </div>
  );
}

/** Turn "a, b, c" into ['a','b','c'] for the array fields. */
export function splitCommaList(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}
