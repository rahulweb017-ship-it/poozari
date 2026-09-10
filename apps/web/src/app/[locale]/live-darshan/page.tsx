import { Link } from '@/i18n/navigation';
import { Price } from '@/lib/currency';
import { getLiveSessions } from '@/lib/server-api';
import { LiveSessionStatus, type LiveSession } from '@poozari/shared';

export const revalidate = 15;

export const metadata = {
  title: 'Live Darshan — poozari.com',
  description:
    'Watch live pooja darshan with verified pandits. Join a live Vedic ritual, pay the join fee, and take darshan from anywhere.',
};

function LiveBadge() {
  return (
    <span className="badge bg-red-600 text-white shadow-md">
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
      LIVE
    </span>
  );
}

function SessionCard({ s }: { s: LiveSession }) {
  const isLive = s.status === LiveSessionStatus.LIVE;
  const isEnded = s.status === LiveSessionStatus.ENDED;
  return (
    <Link
      href={`/live-darshan/${s.id}`}
      className="group elevated-card gold-glow flex h-full flex-col bg-white"
    >
      {/* Thumbnail */}
      <div
        className="relative w-full overflow-hidden bg-gradient-to-br from-accent-soft to-saffron-100"
        style={{ aspectRatio: '16/9' }}
      >
        {s.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={s.thumbnailUrl}
            alt={s.title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-5xl">🪔</div>
        )}
        <div className="absolute left-3 top-3">
          {isLive ? <LiveBadge /> : null}
          {isEnded ? <span className="badge bg-gray-800 text-white/90">ENDED</span> : null}
          {!isLive && !isEnded ? (
            <span className="badge bg-[#0b0f19] text-white/95">UPCOMING</span>
          ) : null}
        </div>
        {typeof s.viewerCount === 'number' && isLive ? (
          <div className="absolute bottom-3 right-3">
            <span className="badge bg-black/60 text-white">👁 {s.viewerCount} watching</span>
          </div>
        ) : null}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-base font-extrabold tracking-wide text-foreground transition-colors duration-300 group-hover:text-accent">
          {s.title}
        </h3>
        {s.pandit ? (
          <p className="mt-1 text-2xs font-bold uppercase tracking-wider text-muted-foreground">
            🙏 {s.pandit.displayName}
          </p>
        ) : null}
        {s.puja ? (
          <p className="mt-1 text-2xs font-semibold text-muted-foreground">🪔 {s.puja.title}</p>
        ) : null}
        <p className="mt-2 text-2xs font-semibold text-muted-foreground">
          {isLive
            ? 'Happening now'
            : isEnded
              ? `Ended ${new Date(s.endedAt ?? s.scheduledAt).toLocaleString('en-IN')}`
              : `Starts ${new Date(s.scheduledAt).toLocaleString('en-IN')}`}
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-5">
          <div>
            <div className="text-3xs font-extrabold uppercase tracking-widest text-muted-foreground">
              Join fee
            </div>
            <div className="text-base font-black text-accent"><Price amountInr={s.joinPriceInr} /></div>
          </div>
          <span className="flex h-9 items-center justify-center rounded-full bg-accent px-4 py-2 text-2xs font-extrabold uppercase tracking-widest text-white shadow-sm transition-all duration-300 group-hover:bg-accent-hover group-hover:shadow-md">
            {isLive ? 'Join live' : isEnded ? 'View' : 'Details'}{' '}
            <span className="arrow-slide ml-1" aria-hidden="true">
              →
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function LiveDarshanPage() {
  const [live, upcoming, ended] = await Promise.all([
    getLiveSessions('live').catch(() => []),
    getLiveSessions('upcoming').catch(() => []),
    getLiveSessions('ended').catch(() => []),
  ]);

  return (
    <div className="section--compact">
      <div className="app-container">
        {/* Header */}
        <div className="flex flex-col items-center text-center">
          <span className="section-pill">Live Darshan</span>
          <h1 className="section-heading mt-3">
            Join a <span className="text-accent">Live Pooja</span> from Anywhere
          </h1>
          <div className="section-bar mx-auto" aria-hidden="true" />
          <p className="section-subheading mx-auto">
            Take darshan of authentic Vedic rituals performed live by verified pandits. Pay the join
            fee and watch the ceremony in real time.
          </p>
        </div>

        {/* Live now */}
        <div className="mt-14">
          <div className="mb-6 flex items-center gap-3">
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
            <h2 className="font-display text-xl font-extrabold uppercase tracking-wider text-foreground">
              Live Now
            </h2>
          </div>
          {live.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {live.map((s) => (
                <SessionCard key={s.id} s={s} />
              ))}
            </div>
          ) : (
            <div className="card p-10 text-center">
              <div className="text-4xl">📿</div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                No live darshan right now. Check the upcoming schedule below.
              </p>
            </div>
          )}
        </div>

        {/* Upcoming */}
        {upcoming.length ? (
          <div className="mt-14">
            <h2 className="mb-6 font-display text-xl font-extrabold uppercase tracking-wider text-foreground">
              Upcoming
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((s) => (
                <SessionCard key={s.id} s={s} />
              ))}
            </div>
          </div>
        ) : null}

        {/* Past */}
        {ended.length ? (
          <div className="mt-14">
            <h2 className="mb-6 font-display text-xl font-extrabold uppercase tracking-wider text-foreground">
              Past Darshan
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {ended.map((s) => (
                <SessionCard key={s.id} s={s} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
