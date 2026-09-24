'use client';

import { youtubeEmbedUrl } from '@/lib/video';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

type Slide = { kind: 'image' | 'video'; src: string };

/** Product page media: a main viewer, and a thumbnail strip of the images and the video. */
export function ProductGallery({
  images,
  videoUrl,
  name,
}: {
  images: string[];
  videoUrl?: string | null;
  name: string;
}) {
  const slides: Slide[] = [
    ...images.map((src) => ({ kind: 'image' as const, src })),
    ...(videoUrl ? [{ kind: 'video' as const, src: videoUrl }] : []),
  ];
  const t = useTranslations('products');
  const [active, setActive] = useState(0);
  const current = slides[active];

  return (
    <div>
      <div
        className="elevated-card overflow-hidden bg-gradient-to-br from-saffron-100 to-orange-200"
        style={{ aspectRatio: '1/1' }}
      >
        {!current ? (
          <div className="flex h-full items-center justify-center text-8xl">🪔</div>
        ) : current.kind === 'image' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current.src} alt={name} className="h-full w-full object-cover" />
        ) : (
          <VideoPlayer src={current.src} title={name} />
        )}
      </div>

      {slides.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {slides.map((slide, i) => (
            <button
              key={`${slide.src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={slide.kind === 'video' ? t('gallery.playVideo') : t('gallery.showImage', { n: i + 1 })}
              aria-current={i === active}
              className={
                'relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 bg-gray-100 transition ' +
                (i === active ? 'border-accent' : 'border-transparent opacity-70 hover:opacity-100')
              }
            >
              {slide.kind === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={slide.src} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-[#0b0f19] text-lg text-white" aria-hidden="true">
                  ▶
                </span>
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function VideoPlayer({ src, title }: { src: string; title: string }) {
  const embed = youtubeEmbedUrl(src);
  if (embed) {
    return (
      <iframe
        src={embed}
        title={title}
        className="h-full w-full bg-black"
        allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return <video src={src} controls playsInline preload="metadata" className="h-full w-full bg-black object-contain" />;
}
