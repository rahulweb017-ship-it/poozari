'use client';

import { Link, useRouter } from '@/i18n/navigation';
import { LivePlayer } from '@/components/live-player';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import { WhatsappBookButton } from '@/components/whatsapp';
import { openRazorpayCheckout } from '@/lib/razorpay';
import { Price, PriceNote } from '@/lib/currency';
import {
  formatInr,
  LIVE_CAPTION_LANGS,
  LiveSessionStatus,
  type LiveCaption,
  type LiveCaptionLang,
  type LiveSession,
} from '@poozari/shared';
import {useParams} from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

const CAPTION_LANG_KEY = 'poozari_caption_lang';

export default function LiveDarshanViewerPage() {
  const { user, ready } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [session, setSession] = useState<LiveSession | null>(null);
  const [error, setError] = useState('');
  const [paying, setPaying] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [caption, setCaption] = useState<LiveCaption | null>(null);
  const [captionLang, setCaptionLang] = useState<LiveCaptionLang>('sa');

  const load = useCallback(async () => {
    try {
      const s = await api.getLiveSession(id);
      setSession(s);
    } catch (e: any) {
      if (e.status === 404) setNotFound(true);
      else setError(e.message ?? 'Could not load live darshan');
    }
  }, [id]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  // Restore the viewer's preferred caption language.
  useEffect(() => {
    const saved = localStorage.getItem(CAPTION_LANG_KEY) as LiveCaptionLang | null;
    if (saved && LIVE_CAPTION_LANGS.some((l) => l.code === saved)) setCaptionLang(saved);
  }, []);

  // Poll for status changes while live or upcoming (cheap refresh).
  useEffect(() => {
    if (!session) return;
    if (session.status === LiveSessionStatus.ENDED) return;
    const t = setInterval(() => load().catch(() => undefined), 15000);
    return () => clearInterval(t);
  }, [session, load]);

  const isLive = session?.status === LiveSessionStatus.LIVE;
  const canWatch = Boolean(session?.hasAccess && isLive && session?.playbackUrl);

  // Poll the current caption while watching a live session.
  useEffect(() => {
    if (!canWatch) return;
    let stop = false;
    const tick = () =>
      api
        .getLiveCaption(id)
        .then((c) => {
          if (!stop) setCaption(c);
        })
        .catch(() => undefined);
    tick();
    const t = setInterval(tick, 5000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [canWatch, id]);

  // Languages the current caption is actually available in, in display order.
  const availableLangs = useMemo(
    () =>
      caption
        ? LIVE_CAPTION_LANGS.map((l) => l.code).filter((code) => Boolean(caption.translations[code]))
        : [],
    [caption],
  );
  // Fall back to the first available language if the preferred one is missing.
  const effectiveLang: LiveCaptionLang = availableLangs.includes(captionLang)
    ? captionLang
    : (availableLangs[0] ?? 'en');
  const captionText = caption?.translations[effectiveLang] ?? '';

  const cycleCaptionLang = useCallback(() => {
    if (availableLangs.length === 0) return;
    const idx = availableLangs.indexOf(effectiveLang);
    const next = availableLangs[(idx + 1) % availableLangs.length];
    setCaptionLang(next);
    localStorage.setItem(CAPTION_LANG_KEY, next);
  }, [availableLangs, effectiveLang]);

  async function payAndJoin() {
    if (!ready) return;
    if (!user) {
      router.push(`/login?next=/live-darshan/${id}`);
      return;
    }
    if (!session) return;
    setError('');
    setPaying(true);
    try {
      const order = await api.createLiveOrder(session.id);
      if ((order as any).devMode) {
        await api.verifyLiveAccess(session.id, {});
        await load();
        return;
      }
      await openRazorpayCheckout({
        order,
        description: `Live Darshan — ${session.title}`,
        prefill: { name: user.name, contact: user.phone ?? '', email: user.email ?? '' },
        onVerify: async (response) => {
          await api.verifyLiveAccess(session.id, response);
          await load();
          setPaying(false);
        },
        onDismiss: () => {
          setPaying(false);
          setError('Payment was cancelled. You have not been charged.');
        },
        onError: (message) => {
          setPaying(false);
          setError(message);
        },
      });
      // `paying` stays set while the modal is open; the callbacks above clear it.
    } catch (e: any) {
      setError(e.message ?? 'Could not start payment');
      setPaying(false);
    }
  }

  if (notFound) {
    return (
      <div className="app-container py-24 text-center">
        <div className="text-5xl">🪔</div>
        <h1 className="section-heading mt-4">Live darshan not found</h1>
        <Link href="/live-darshan" className="btn-outline mt-6 inline-flex text-2xs uppercase tracking-wider">
          ← Back to Live Darshan
        </Link>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="app-container py-24 text-center" style={{ color: 'hsl(var(--muted-foreground))' }}>
        {error || 'Loading…'}
      </div>
    );
  }

  const isEnded = session.status === LiveSessionStatus.ENDED;

  return (
    <div className="section--compact">
      <div className="app-container max-w-5xl">
        {/* Breadcrumb */}
        <nav className="mb-6 flex items-center gap-2 text-2xs font-bold uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>
          <Link href="/live-darshan" className="transition-colors hover:text-accent">
            ← Live Darshan
          </Link>
        </nav>

        {/* Title row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              {isLive ? (
                <span className="badge bg-red-600 text-white shadow-md">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                  LIVE
                </span>
              ) : null}
              {isEnded ? <span className="badge bg-gray-800 text-white/90">ENDED</span> : null}
              {!isLive && !isEnded ? <span className="badge bg-[#0b0f19] text-white/95">UPCOMING</span> : null}
            </div>
            <h1 className="display-title mt-3 !text-3xl sm:!text-4xl">{session.title}</h1>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-muted-foreground">
              {session.pandit ? <span>🙏 {session.pandit.displayName}</span> : null}
              {session.puja ? <span>🪔 {session.puja.title}</span> : null}
              <span>
                {isLive
                  ? 'Happening now'
                  : isEnded
                    ? `Ended ${new Date(session.endedAt ?? session.scheduledAt).toLocaleString('en-IN')}`
                    : `Starts ${new Date(session.scheduledAt).toLocaleString('en-IN')}`}
              </span>
            </div>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        {/* Viewer / paywall */}
        <div className="mt-8">
          {canWatch ? (
            <LivePlayer
              playbackUrl={session.playbackUrl!}
              title={session.title}
              caption={
                captionText
                  ? {
                      text: captionText,
                      lang: effectiveLang,
                      availableLangs,
                      onCycleLang: cycleCaptionLang,
                    }
                  : undefined
              }
            />
          ) : isEnded ? (
            <EndedPanel session={session} />
          ) : (
            <PaywallPanel
              session={session}
              isLive={isLive}
              paying={paying}
              loggedIn={Boolean(user)}
              onPay={payAndJoin}
            />
          )}
        </div>

        {/* Description */}
        {session.description ? (
          <div className="card mt-8 bg-white p-6">
            <h3 className="font-display text-sm font-extrabold uppercase tracking-widest text-foreground">
              About this darshan
            </h3>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              {session.description}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PaywallPanel({
  session,
  isLive,
  paying,
  loggedIn,
  onPay,
}: {
  session: LiveSession;
  isLive: boolean;
  paying: boolean;
  loggedIn: boolean;
  onPay: () => void;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-[#0b0f19] to-[#1a1025] p-10 text-center shadow-lg"
      style={{ aspectRatio: '16/9', borderColor: 'hsl(var(--accent) / 0.3)' }}
    >
      <div className="flex h-full flex-col items-center justify-center">
        <div className="text-5xl">🪔</div>
        <h2 className="font-display mt-4 text-xl font-extrabold text-white">
          {isLive ? 'This pooja is live now' : 'This darshan is upcoming'}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
          {isLive
            ? 'Pay the join fee to watch the live ceremony and take darshan with panditji.'
            : `Reserve your spot now — the darshan begins ${new Date(session.scheduledAt).toLocaleString('en-IN')}.`}
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <div className="text-2xl font-black text-saffron-400">
            <Price amountInr={session.joinPriceInr} />
          </div>
          {/* The join fee is charged in rupees. */}
          <PriceNote
            amountInr={session.joinPriceInr}
            className="text-3xs font-semibold text-white/50"
          />
          <button
            onClick={onPay}
            disabled={paying}
            className="btn-primary btn-lg text-2xs uppercase tracking-widest"
          >
            {paying ? 'Processing…' : loggedIn ? `Pay ${formatInr(session.joinPriceInr)} & Join` : 'Login to Join'}
          </button>
          {/* Devotees who would rather arrange it in chat. */}
          <WhatsappBookButton
            className="btn-whatsapp text-2xs uppercase tracking-wider"
            context={{
              kind: 'live',
              title: session.title,
              price: formatInr(session.joinPriceInr),
            }}
          />
          <p className="text-3xs font-bold uppercase tracking-widest text-white/40">
            🔒 Secure payment via Razorpay
          </p>
        </div>
      </div>
    </div>
  );
}

function EndedPanel({ session }: { session: LiveSession }) {
  return (
    <div
      className="relative overflow-hidden rounded-3xl border bg-gradient-to-br from-[#0b0f19] to-[#1a1025] p-10 text-center shadow-lg"
      style={{ aspectRatio: '16/9', borderColor: 'hsl(var(--border) / 0.3)' }}
    >
      <div className="flex h-full flex-col items-center justify-center">
        <div className="text-5xl">📿</div>
        <h2 className="font-display mt-4 text-xl font-extrabold text-white">This darshan has ended</h2>
        {session.recordingUrl ? (
          <a
            href={session.recordingUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary mt-6 text-2xs uppercase tracking-widest"
          >
            ▶ Watch recording
          </a>
        ) : (
          <p className="mt-2 text-sm text-white/60">A recording will be available here soon.</p>
        )}
        <Link href="/live-darshan" className="btn-outline mt-4 text-2xs uppercase tracking-wider !text-white/80">
          Browse other darshan
        </Link>
      </div>
    </div>
  );
}

