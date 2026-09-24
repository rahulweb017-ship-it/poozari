import { Link } from '@/i18n/navigation';
import { Price } from '@/lib/currency';
import { getLiveSessions } from '@/lib/server-api';
import { LiveSessionStatus, type LiveSession } from '@poozari/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export const revalidate = 15;

type Props = { params: { locale: string } };
type T = Awaited<ReturnType<typeof getTranslations>>;

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'live' });
  return { title: t('metaTitle'), description: t('metaDescription') };
}

function LiveBadge({ t }: { t: T }) {
  return (
    <span className="badge bg-red-600 text-white shadow-md">
      <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
      {t('badgeLive')}
    </span>
  );
}

function SessionCard({ s, t }: { s: LiveSession; t: T }) {
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
          {isLive ? <LiveBadge t={t} /> : null}
          {isEnded ? <span className="badge bg-gray-800 text-white/90">{t('badgeEnded')}</span> : null}
          {!isLive && !isEnded ? (
            <span className="badge bg-[#0b0f19] text-white/95">{t('badgeUpcoming')}</span>
          ) : null}
        </div>
        {typeof s.viewerCount === 'number' && isLive ? (
          <div className="absolute bottom-3 right-3">
            <span className="badge bg-black/60 text-white">👁 {t('watching', { count: s.viewerCount })}</span>
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
            ? t('happeningNow')
            : isEnded
              ? t('endedAt', { time: new Date(s.endedAt ?? s.scheduledAt).toLocaleString('en-IN') })
              : t('startsAt', { time: new Date(s.scheduledAt).toLocaleString('en-IN') })}
        </p>

        <div className="mt-auto flex items-center justify-between border-t border-gray-100 pt-5">
          <div>
            <div className="text-3xs font-extrabold uppercase tracking-widest text-muted-foreground">
              {t('joinFee')}
            </div>
            <div className="text-base font-black text-accent"><Price amountInr={s.joinPriceInr} /></div>
          </div>
          <span className="flex h-9 items-center justify-center rounded-full bg-accent px-4 py-2 text-2xs font-extrabold uppercase tracking-widest text-white shadow-sm transition-all duration-300 group-hover:bg-accent-hover group-hover:shadow-md">
            {isLive ? t('joinLive') : isEnded ? t('view') : t('details')}{' '}
            <span className="arrow-slide ml-1" aria-hidden="true">
              →
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}

export default async function LiveDarshanPage({ params: { locale } }: Props) {
  setRequestLocale(locale);
  const t = await getTranslations('live');
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
          <span className="section-pill">{t('pill')}</span>
          <h1 className="section-heading mt-3">
            {t('titleLead')} <span className="text-accent">{t('titleAccent')}</span> {t('titleTail')}
          </h1>
          <div className="section-bar mx-auto" aria-hidden="true" />
          <p className="section-subheading mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* Live now */}
        <div className="mt-14">
          <div className="mb-6 flex items-center gap-3">
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
            <h2 className="font-display text-xl font-extrabold uppercase tracking-wider text-foreground">
              {t('liveNow')}
            </h2>
          </div>
          {live.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {live.map((s) => (
                <SessionCard key={s.id} s={s} t={t} />
              ))}
            </div>
          ) : (
            <div className="card p-10 text-center">
              <div className="text-4xl">📿</div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t('emptyLive')}
              </p>
            </div>
          )}
        </div>

        {/* Upcoming */}
        {upcoming.length ? (
          <div className="mt-14">
            <h2 className="mb-6 font-display text-xl font-extrabold uppercase tracking-wider text-foreground">
              {t('upcoming')}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {upcoming.map((s) => (
                <SessionCard key={s.id} s={s} t={t} />
              ))}
            </div>
          </div>
        ) : null}

        {/* Past */}
        {ended.length ? (
          <div className="mt-14">
            <h2 className="mb-6 font-display text-xl font-extrabold uppercase tracking-wider text-foreground">
              {t('pastPujas')}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {ended.map((s) => (
                <SessionCard key={s.id} s={s} t={t} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
