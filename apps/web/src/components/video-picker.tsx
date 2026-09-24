'use client';

import { api } from '@/lib/client';
import { youtubeEmbedUrl } from '@/lib/video';
import { useRef, useState } from 'react';

/** What the upload endpoint accepts. Mirrors the check on the API side. */
const ACCEPT = 'video/mp4,video/webm,video/quicktime,.m4v';
const MAX_BYTES = 50 * 1024 * 1024;

/**
 * Single video field for the admin forms: upload a short clip, or paste a
 * YouTube or hosted video link. The value is the URL the record stores.
 */
export function VideoPicker({
  value,
  onChange,
  label = 'Video',
  hint,
}: {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(file: File | undefined) {
    if (!file) return;
    setError('');
    if (file.size > MAX_BYTES) {
      setError(
        `That video is ${(file.size / 1048576).toFixed(1)} MB. Keep it under 50 MB, or put it on YouTube and paste the link.`,
      );
      return;
    }
    setBusy(true);
    try {
      const { url } = await api.adminUploadVideo(file, file.name);
      onChange(url);
    } catch (e: any) {
      setError(e.message ?? 'Could not upload that video');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  }

  const embed = value ? youtubeEmbedUrl(value) : null;

  return (
    <div>
      <label className="label">{label}</label>
      {value ? (
        <div className="overflow-hidden rounded-2xl border bg-black" style={{ borderColor: 'hsl(var(--border) / 0.6)', aspectRatio: '16/9' }}>
          {embed ? (
            <iframe src={embed} title="Video preview" className="h-full w-full" allowFullScreen />
          ) : (
            <video src={value} controls preload="metadata" className="h-full w-full" />
          )}
        </div>
      ) : null}

      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => void upload(event.target.files?.[0])}
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-outline px-4 py-1.5 text-2xs uppercase tracking-wider"
          onClick={() => input.current?.click()}
          disabled={busy}
        >
          {busy ? 'Uploading…' : value ? 'Replace video' : 'Upload video'}
        </button>
        {value ? (
          <button
            type="button"
            className="rounded-xl border border-red-200 px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50"
            onClick={() => onChange('')}
          >
            Remove
          </button>
        ) : null}
      </div>
      <input
        className="input mt-2 py-1.5 text-xs"
        placeholder="Or paste a YouTube / video URL"
        value={value}
        onChange={(event) => onChange(event.target.value.trim())}
      />

      {error ? (
        <p className="mt-2 rounded-xl bg-red-50 p-2.5 text-2xs font-semibold text-red-700">{error}</p>
      ) : null}
      {hint && !error ? (
        <p className="mt-1.5 text-3xs font-semibold uppercase tracking-wider text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}
