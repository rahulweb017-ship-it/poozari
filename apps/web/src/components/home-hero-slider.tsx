'use client';

import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

export interface HeroSlide {
  /** Basename in /public/home-slider, e.g. `temple-dawn`. */
  image: string;
  href: string;
  pill: string;
  title: string;
  subtitle: string;
  cta: string;
}

const DESKTOP_WIDTHS = [828, 1280, 1920, 2172];
const MOBILE_WIDTHS = [828, 1200];
/** Below `lg` the slide stacks: a 3:2 crop of the artwork, then the copy. */
const MOBILE_MEDIA = '(max-width: 1023px)';

function srcSet(image: string, widths: number[], format: 'avif' | 'webp', prefix = '') {
  return widths.map((w) => `/home-slider/${image}-${prefix}${w}.${format} ${w}w`).join(', ');
}

function SlidePicture({ image, priority }: { image: string; priority: boolean }) {
  return (
    <picture>
      <source media={MOBILE_MEDIA} type="image/avif" srcSet={srcSet(image, MOBILE_WIDTHS, 'avif', 'm')} sizes="100vw" />
      <source media={MOBILE_MEDIA} type="image/webp" srcSet={srcSet(image, MOBILE_WIDTHS, 'webp', 'm')} sizes="100vw" />
      <source type="image/avif" srcSet={srcSet(image, DESKTOP_WIDTHS, 'avif')} sizes="100vw" />
      <source type="image/webp" srcSet={srcSet(image, DESKTOP_WIDTHS, 'webp')} sizes="100vw" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/home-slider/${image}-1280.webp`}
        alt=""
        width={1920}
        height={640}
        fetchPriority={priority ? 'high' : 'low'}
        decoding={priority ? 'sync' : 'async'}
        className="h-full w-full object-cover object-right"
      />
    </picture>
  );
}

export function HomeHeroSlider({ slides }: { slides: HeroSlide[] }) {
  const t = useTranslations('heroSlider');
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Only the first banner is in the server HTML; the rest load once the page has.
  const [restReady, setRestReady] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = slides.length;

  useEffect(() => {
    const ready = () => setRestReady(true);
    if (document.readyState === 'complete') {
      ready();
      return;
    }
    window.addEventListener('load', ready, { once: true });
    return () => window.removeEventListener('load', ready);
  }, []);

  useEffect(() => {
    if (paused || !restReady || count <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % count);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [paused, restReady, count]);

  const go = (delta: number) => setActiveIndex((current) => (current + delta + count) % count);

  if (!count) return null;

  return (
    <section
      className="relative w-full overflow-hidden border-b bg-[#fdf6ea]"
      style={{ borderColor: 'hsl(var(--border) / 0.3)' }}
      aria-roledescription="carousel"
      aria-label={t('label')}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        const end = e.changedTouches[0]?.clientX;
        touchStartX.current = null;
        if (start == null || end == null || Math.abs(end - start) < 40) return;
        go(end < start ? 1 : -1);
      }}
    >
      <div
        className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{ transform: `translateX(-${activeIndex * 100}%)` }}
      >
        {slides.map((slide, index) => {
          const active = index === activeIndex;
          const Heading = index === 0 ? 'h1' : 'h2';
          return (
            <div
              key={slide.image}
              className="relative w-full shrink-0"
              role="group"
              aria-roledescription="slide"
              aria-label={t('position', { current: index + 1, total: count })}
              aria-hidden={!active}
            >
              <div className="relative aspect-[3/2] w-full sm:aspect-[2/1] lg:aspect-[3/1] lg:max-h-[620px]">
                {index === 0 || restReady ? <SlidePicture image={slide.image} priority={index === 0} /> : null}
                {/* Below lg the copy sits under the image; fade the image into it. */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#fdf6ea] to-transparent lg:hidden" />
              </div>

              <div className="lg:absolute lg:inset-0 lg:flex lg:items-center">
                <div className="app-container w-full">
                  <div className="px-1 pb-14 pt-2 text-center lg:max-w-[46%] lg:px-0 lg:pb-0 lg:pt-0 lg:text-left xl:max-w-[42%]">
                    <span className="section-pill">{slide.pill}</span>
                    <Heading className="mt-3 font-display text-3xl font-black leading-[1.15] tracking-tight text-foreground sm:text-4xl xl:text-5xl">
                      {slide.title}
                    </Heading>
                    <p
                      className="mx-auto mt-3 max-w-xl text-sm leading-relaxed sm:text-base lg:mx-0"
                      style={{ color: 'hsl(var(--muted-foreground))' }}
                    >
                      {slide.subtitle}
                    </p>
                    <Link href={slide.href} tabIndex={active ? 0 : -1} className="btn-primary btn-lg mt-6 inline-flex">
                      {slide.cta}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {count > 1 ? (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label={t('previous')}
            className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-md transition hover:bg-white lg:flex"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label={t('next')}
            className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-foreground shadow-md transition hover:bg-white lg:flex"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>

          <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2">
            {slides.map((slide, index) => (
              <button
                key={slide.image}
                type="button"
                className={`h-2 rounded-full transition-all ${
                  index === activeIndex ? 'w-7 bg-accent' : 'w-2 bg-accent/30 ring-1 ring-white/80 hover:bg-accent/60'
                }`}
                aria-label={t('showSlide', { title: slide.title })}
                aria-current={index === activeIndex ? 'true' : undefined}
                onClick={() => setActiveIndex(index)}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}
