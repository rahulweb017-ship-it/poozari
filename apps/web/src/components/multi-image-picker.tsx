'use client';

import { api } from '@/lib/client';
import { useRef, useState } from 'react';

/** What the upload endpoint accepts. Mirrors the check on the API side. */
const ACCEPT = 'image/jpeg,image/png,image/webp';
const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Gallery field for the admin forms: several images, the first being the
 * cover. Picked files are uploaded to the API one by one; an image hosted
 * elsewhere can be added by URL.
 */
export function MultiImagePicker({
  value,
  onChange,
  label = 'Images',
  hint,
  max = 10,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  label?: string;
  hint?: string;
  max?: number;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [url, setUrl] = useState('');

  async function upload(files: FileList | null | undefined) {
    if (!files?.length) return;
    setError('');
    const room = max - value.length;
    const picked = Array.from(files).slice(0, room);
    if (files.length > room) setError(`Only ${max} images are allowed; the extra files were skipped.`);
    setBusy(true);
    const added: string[] = [];
    try {
      for (const file of picked) {
        if (file.size > MAX_BYTES) {
          setError(`${file.name} is ${(file.size / 1048576).toFixed(1)} MB. Keep each image under 5 MB.`);
          continue;
        }
        const res = await api.adminUploadImage(file, file.name);
        added.push(res.url);
      }
    } catch (e: any) {
      setError(e.message ?? 'Could not upload that image');
    } finally {
      // Keep whatever made it up before a failure.
      if (added.length) onChange([...value, ...added]);
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= value.length) return;
    const next = [...value];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  }

  function addUrl() {
    const trimmed = url.trim();
    if (!trimmed || value.length >= max) return;
    onChange([...value, trimmed]);
    setUrl('');
  }

  return (
    <div>
      <label className="label">{label}</label>
      <div
        className="grid grid-cols-3 gap-2 sm:grid-cols-4"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void upload(event.dataTransfer.files);
        }}
      >
        {value.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="relative overflow-hidden rounded-xl border bg-gray-50"
            style={{ borderColor: 'hsl(var(--border) / 0.6)', aspectRatio: '1/1' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-full w-full object-cover" />
            {i === 0 ? (
              <span className="absolute left-1.5 top-1.5 rounded-md bg-accent px-1.5 py-0.5 text-3xs font-extrabold uppercase tracking-wider text-white">
                Cover
              </span>
            ) : null}
            <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/55 px-1 py-0.5 text-white">
              <button type="button" className="px-1.5 text-xs disabled:opacity-30" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Move earlier">
                ←
              </button>
              <button type="button" className="px-1.5 text-xs" onClick={() => onChange(value.filter((_, x) => x !== i))} aria-label="Remove image">
                ✕
              </button>
              <button type="button" className="px-1.5 text-xs disabled:opacity-30" onClick={() => move(i, i + 1)} disabled={i === value.length - 1} aria-label="Move later">
                →
              </button>
            </div>
          </div>
        ))}
        {value.length < max ? (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed bg-gray-50 text-muted-foreground transition-colors hover:text-accent"
            style={{ borderColor: 'hsl(var(--border))', aspectRatio: '1/1' }}
          >
            <span className="text-xl" aria-hidden="true">+</span>
            <span className="text-3xs font-bold uppercase tracking-wider">{busy ? 'Uploading…' : 'Add images'}</span>
          </button>
        ) : null}
      </div>

      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        className="hidden"
        onChange={(event) => void upload(event.target.files)}
      />

      {value.length < max ? (
        <div className="mt-2 flex gap-2">
          <input
            className="input py-1.5 text-xs"
            placeholder="Or paste an image URL"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                addUrl();
              }
            }}
          />
          <button type="button" className="btn-outline px-4 py-1.5 text-2xs uppercase tracking-wider" onClick={addUrl} disabled={!url.trim()}>
            Add
          </button>
        </div>
      ) : null}

      {error ? (
        <p className="mt-2 rounded-xl bg-red-50 p-2.5 text-2xs font-semibold text-red-700">{error}</p>
      ) : null}
      {hint && !error ? (
        <p className="mt-1.5 text-3xs font-semibold uppercase tracking-wider text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
