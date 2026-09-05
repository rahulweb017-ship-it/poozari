'use client';

import { LIVE_CAPTION_LANGS, type LiveCaptionLang } from '@poozari/shared';
import { useEffect, useRef, useState } from 'react';

/** Caption overlay data passed down from the viewer page. */
export interface LivePlayerCaption {
  /** Caption text already resolved to the active language. */
  text: string;
  /** Currently active caption language. */
  lang: LiveCaptionLang;
  /** Languages the current caption is available in. */
  availableLangs: LiveCaptionLang[];
  /** Cycle to the next available caption language. */
  onCycleLang: () => void;
}

/**
 * Live darshan player. Plays an HLS stream (.m3u8) via hls.js on browsers that
 * lack native HLS (Chrome/Firefox/Edge) and falls back to native playback on
 * Safari. Non-HLS URLs (YouTube/Vimeo/embed) render in an iframe instead.
 *
 * hls.js is imported dynamically so it never runs on the server.
 *
 * When `caption` is provided, the current caption is overlaid on the video and
 * a CC button lets the viewer switch caption language.
 */
export function LivePlayer({
  playbackUrl,
  title,
  caption,
}: {
  playbackUrl: string;
  title: string;
  caption?: LivePlayerCaption;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');

  const isHls = /\.m3u8(\?|$)/i.test(playbackUrl);
  const isEmbed = /youtube\.com|youtu\.be|vimeo\.com|facebook\.com|instagram\.com/i.test(playbackUrl);

  useEffect(() => {
    if (!isHls || isEmbed) return;
    const video = videoRef.current;
    if (!video) return;

    let hls: any;
    let cancelled = false;

    (async () => {
      // Native HLS (Safari / iOS).
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = playbackUrl;
        return;
      }
      try {
        const Hls = (await import('hls.js')).default;
        if (cancelled) return;
        if (Hls.isSupported()) {
          hls = new Hls({ enableWorker: true });
          hls.loadSource(playbackUrl);
          hls.attachMedia(video);
          hls.on(Hls.Events.ERROR, (_e: unknown, data: any) => {
            if (data?.fatal) setError('The live stream is unavailable right now.');
          });
        } else {
          setError('Your browser cannot play this live stream.');
        }
      } catch {
        if (!cancelled) setError('Failed to load the live player.');
      }
    })();

    return () => {
      cancelled = true;
      hls?.destroy?.();
    };
  }, [playbackUrl, isHls, isEmbed]);

  const langMeta = caption ? LIVE_CAPTION_LANGS.find((l) => l.code === caption.lang) : undefined;

  // CC language toggle, top-right. Only useful when there is more than one language.
  const langButton =
    caption && caption.availableLangs.length > 1 ? (
      <button
        type="button"
        onClick={caption.onCycleLang}
        className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-lg bg-black/60 px-2.5 py-1.5 text-3xs font-black uppercase tracking-widest text-white backdrop-blur-sm transition-colors hover:bg-accent"
        title="Change caption language"
        aria-label="Change caption language"
      >
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-saffron-400" />
        CC · {langMeta?.short ?? caption.lang.toUpperCase()}
      </button>
    ) : null;

  // Caption strip near the bottom, above the native video controls.
  const captionOverlay =
    caption && caption.text ? (
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center px-4 pb-14">
        <div className="max-w-2xl rounded-xl bg-black/70 px-4 py-2 text-center backdrop-blur-sm">
          <p className="text-sm font-semibold leading-snug text-white sm:text-base">{caption.text}</p>
        </div>
      </div>
    ) : null;

  if (isEmbed) {
    return (
      <div
        className="relative overflow-hidden rounded-3xl bg-black shadow-lg"
        style={{ aspectRatio: '16/9' }}
      >
        <iframe
          src={playbackUrl}
          title={title}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
        {langButton}
        {captionOverlay}
      </div>
    );
  }

  return (
    <div
      className="relative overflow-hidden rounded-3xl bg-black shadow-lg"
      style={{ aspectRatio: '16/9' }}
    >
      <video ref={videoRef} controls autoPlay playsInline className="h-full w-full" />
      {langButton}
      {captionOverlay}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6 text-center">
          <p className="text-sm font-semibold text-white/90">{error}</p>
        </div>
      ) : null}
    </div>
  );
}
