'use client';

import { api } from '@/lib/client';
import { useRef, useState } from 'react';

/** What the upload endpoint accepts. Mirrors the check on the API side. */
const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Image field for the admin forms.
 *
 * Two ways in, because both are genuinely useful: pick a file from the machine
 * (uploaded to the API, which hands back a URL), or paste a URL you already
 * host elsewhere. Either way the value handed back is the `imageUrl` string the
 * record stores, so this drops into any form with such a field.
 */
export function ImagePicker({
  value,
  onChange,
  label = 'Image',
  hint,
  aspect = '16/10',
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
  /** Preview box ratio — match where the image will actually be shown. */
  aspect?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showUrl, setShowUrl] = useState(false);
  // A URL that 404s should not leave a broken-image icon in the form.
  const [brokenSrc, setBrokenSrc] = useState('');

  async function upload(file: File | undefined) {
    if (!file) return;
    setError('');
    if (file.size > MAX_BYTES) {
      setError(`That image is ${(file.size / 1048576).toFixed(1)} MB. Keep it under 5 MB.`);
      return;
    }
    setBusy(true);
    try {
      const { url } = await api.adminUploadImage(file, file.name);
      setBrokenSrc('');
      onChange(url);
    } catch (e: any) {
      setError(e.message ?? 'Could not upload that image');
    } finally {
      setBusy(false);
      // Let the same file be re-picked after an error.
      if (input.current) input.current.value = '';
    }
  }

  const isBroken = Boolean(value) && brokenSrc === value;

  return (
    <div>
      <label className="label">{label}</label>

      {/* Preview / drop area */}
      <div
        className="relative overflow-hidden rounded-2xl border bg-gray-50"
        style={{ borderColor: 'hsl(var(--border) / 0.6)', aspectRatio: aspect }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void upload(event.dataTransfer.files?.[0]);
        }}
      >
        {value && !isBroken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setBrokenSrc(value)}
          />
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex h-full w-full flex-col items-center justify-center gap-1.5 text-muted-foreground transition-colors hover:text-accent"
          >
            <span className="text-2xl" aria-hidden="true">
              {isBroken ? '⚠️' : '🖼'}
            </span>
            <span className="text-2xs font-bold uppercase tracking-wider">
              {busy ? 'Uploading…' : isBroken ? 'Image did not load' : 'Choose or drop an image'}
            </span>
            {!busy && !isBroken ? (
              <span className="text-3xs font-semibold uppercase tracking-wider opacity-70">
                JPG, PNG or WebP · up to 5 MB
              </span>
            ) : null}
          </button>
        )}

        {busy ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70">
            <span className="text-2xs font-bold uppercase tracking-wider text-accent">
              Uploading…
            </span>
          </div>
        ) : null}
      </div>

      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => void upload(event.target.files?.[0])}
      />

      {/* Actions */}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-outline px-4 py-1.5 text-2xs uppercase tracking-wider"
          onClick={() => input.current?.click()}
          disabled={busy}
        >
          {value ? 'Replace' : 'Upload'}
        </button>
        {value ? (
          <button
            type="button"
            className="rounded-xl border border-red-200 px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50"
            onClick={() => {
              setBrokenSrc('');
              onChange('');
            }}
          >
            Remove
          </button>
        ) : null}
        <button
          type="button"
          className="text-2xs font-bold uppercase tracking-wider text-accent hover:underline"
          onClick={() => setShowUrl(!showUrl)}
        >
          {showUrl ? 'Hide URL' : 'Use a URL'}
        </button>
      </div>

      {/* Paste-a-URL escape hatch, for images already hosted elsewhere. */}
      {showUrl ? (
        <input
          className="input mt-2 py-1.5 text-xs"
          placeholder="https://…/cover.jpg"
          value={value}
          onChange={(event) => {
            setBrokenSrc('');
            onChange(event.target.value);
          }}
        />
      ) : null}

      {error ? (
        <p className="mt-2 rounded-xl bg-red-50 p-2.5 text-2xs font-semibold text-red-700">
          {error}
        </p>
      ) : null}
      {hint && !error ? (
        <p className="mt-1.5 text-3xs font-semibold uppercase tracking-wider text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
