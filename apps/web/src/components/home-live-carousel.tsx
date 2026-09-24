'use client';

import { Link } from '@/i18n/navigation';
import { Price } from '@/lib/currency';
import {
  LiveSessionStatus,
  type LiveSession,
} from '@poozari/shared';
import { useEffect, useState } from 'react';

export function HomeLiveCarousel({ sessions }: { sessions: LiveSession[] }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const hasLiveSession = sessions.some(
    (session) => session.status === LiveSessionStatus.LIVE,
  );

  useEffect(() => {
    if (paused || sessions.length <= 1) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % sessions.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [paused, sessions.length]);

  useEffect(() => {
    if (activeIndex >= sessions.length) setActiveIndex(0);
  }, [activeIndex, sessions.length]);

  return (
    <div
      className="elevated-card saffron-glow bg-white/70 p-5 backdrop-blur-md sm:p-6 md:p-8"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span
          className={`rounded-full px-3.5 py-1 text-2xs font-bold uppercase tracking-wider ${
            hasLiveSession
              ? 'bg-red-50 text-red-700'
              : 'bg-emerald-50 text-emerald-700'
          }`}
        >
          <span
            className={`mr-1.5 inline-block h-1.5 w-1.5 rounded-full ${
              hasLiveSession ? 'animate-pulse bg-red-600' : 'bg-emerald-600'
            }`}
          />
          {hasLiveSession ? 'Live puja now' : 'Upcoming pujas'}
        </span>
        <Link
          href="/live-darshan"
          className="text-3xs font-extrabold uppercase tracking-widest text-accent transition-colors hover:text-accent-hover"
        >
          View schedule →
        </Link>
      </div>

      <div
        className="mt-5 overflow-hidden rounded-3xl border bg-accent-soft"
        style={{ borderColor: 'hsl(var(--accent) / 0.15)' }}
        aria-roledescription="carousel"
        aria-label="Live and upcoming pujas"
      >
        {sessions.length ? (
          <div
            className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {sessions.map((session, index) => {
              const isLive = session.status === LiveSessionStatus.LIVE;
              return (
                <article
                  key={session.id}
                  className="min-w-full p-5 md:p-6"
                  aria-hidden={index !== activeIndex}
                >
                  <div className="flex flex-col gap-5 sm:flex-row">
                    <div
                      className="relative h-auto w-full shrink-0 overflow-hidden rounded-2xl border bg-white sm:h-44 sm:w-44"
                      style={{ borderColor: 'hsl(var(--border) / 0.8)' }}
                    >
                      {session.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={session.thumbnailUrl}
                          alt=""
                          className="h-full min-h-[140px] w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full min-h-[140px] items-center justify-center bg-gradient-to-br from-saffron-100 to-orange-100 text-5xl">
                          🪔
                        </div>
                      )}
                      <span
                        className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-3xs font-black uppercase tracking-widest text-white shadow ${
                          isLive ? 'bg-red-600' : 'bg-[#0b0f19]/90'
                        }`}
                      >
                        {isLive ? '● Live' : 'Upcoming'}
                      </span>
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col">
                      <p className="font-display text-lg font-bold leading-snug text-foreground">
                        {session.title}
                      </p>
                      {session.pandit ? (
                        <p className="mt-2 text-2xs font-bold uppercase tracking-wider text-muted-foreground">
                          With {session.pandit.displayName}
                        </p>
                      ) : null}
                      <p className="mt-2 text-xs font-semibold text-muted-foreground">
                        {isLive
                          ? 'Join the ceremony happening now'
                          : `Starts ${new Date(session.scheduledAt).toLocaleString('en-IN', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}`}
                      </p>
                      <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-5">
                        <div>
                          <div className="text-3xs font-extrabold uppercase tracking-widest text-muted-foreground">
                            Join fee
                          </div>
                          <div className="text-base font-black text-accent">
                            <Price amountInr={session.joinPriceInr} />
                          </div>
                        </div>
                        <Link
                          href={`/live-darshan/${session.id}`}
                          tabIndex={index === activeIndex ? 0 : -1}
                          className="btn-primary rounded-full text-2xs"
                        >
                          {isLive ? 'Join Live Puja' : 'View Details'}
                        </Link>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center">
            <div className="text-4xl">🪔</div>
            <p className="mt-3 font-display text-lg font-bold text-foreground">
              New live pujas are being scheduled
            </p>
            <Link href="/live-darshan" className="btn-primary mt-5 inline-flex rounded-full">
              View Live Puja
            </Link>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2" aria-label="Select puja slide">
          {sessions.map((session, index) => (
            <button
              key={session.id}
              type="button"
              className={`h-2 rounded-full transition-all ${
                index === activeIndex ? 'w-7 bg-accent' : 'w-2 bg-accent/25 hover:bg-accent/50'
              }`}
              aria-label={`Show ${session.title}`}
              aria-current={index === activeIndex ? 'true' : undefined}
              onClick={() => setActiveIndex(index)}
            />
          ))}
        </div>
        <span className="rounded-full bg-amber-100/70 px-3 py-1 text-2xs font-bold uppercase tracking-wider text-amber-800">
          ★ 4.9 rating
        </span>
      </div>
    </div>
  );
}
