import { Link } from '@/i18n/navigation';
import { Price } from '@/lib/currency';
import { localized, type Puja } from '@poozari/shared';
import { getLocale, getTranslations } from 'next-intl/server';

/** Puja types with a card badge (`pujaCard.location.*`); the enum value itself is not customer copy. */
const LOCATION_BADGES = ['HOME', 'TEERTH', 'TEMPLE', 'DIGITAL'] as const;

export async function PujaCard({ puja }: { puja: Puja }) {
  const locale = await getLocale();
  const title = localized(puja, 'title', locale);
  const t = await getTranslations('pujaCard');
  const badgeKey = LOCATION_BADGES.find((k) => k === puja.locationType);
  return (
    <Link
      href={`/puja/${puja.slug}`}
      className="group elevated-card gold-glow flex h-full flex-col bg-white"
    >
      {/* Visual Header */}
      <div className="relative w-full overflow-hidden bg-gradient-to-br from-saffron-100 to-orange-200"
           style={{ aspectRatio: '16/10' }}>
        {puja.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={puja.imageUrl}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">🪔</div>
        )}
        <div className="absolute left-3 top-3">
          <span className="badge bg-[#0b0f19] text-white/95 text-3xs font-black uppercase tracking-widest shadow-md">
            {badgeKey ? t(`location.${badgeKey}`) : puja.locationType}
          </span>
        </div>
      </div>

      {/* Card Content Details */}
      <div className="flex flex-1 flex-col p-6">
        <h3 className="font-display text-base font-extrabold tracking-wide text-foreground transition-colors duration-300 group-hover:text-accent">
          {title}
        </h3>

        {puja.temple ? (
          <p className="mt-1 text-2xs font-bold uppercase tracking-wider text-muted-foreground">
            📍 {puja.temple.name}
            {puja.city ? `, ${puja.city.name}` : ''}
          </p>
        ) : null}

        <p className="mt-3.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {localized(puja, 'summary', locale)}
        </p>

        {/* Verification badges */}
        <div className="mt-4 flex flex-wrap gap-2">
          <span className="badge bg-emerald-50 text-emerald-700">
            ✓ {t('verified')}
          </span>
          <span className="badge bg-amber-50 text-amber-700">
            ✓ {t('inclusions')}
          </span>
        </div>

        {/* Action bar and price tag */}
        <div className="mt-auto pt-6 flex items-center justify-between border-t border-gray-100">
          <div>
            <div className="text-3xs font-extrabold uppercase tracking-widest text-muted-foreground">{t('startingFrom')}</div>
            <div className="text-base font-black text-accent"><Price amountInr={puja.startingPriceInr} /></div>
          </div>
          <span className="flex h-9 items-center justify-center rounded-full bg-accent px-4 py-2 text-2xs font-extrabold uppercase tracking-widest text-white shadow-sm transition-all duration-300 group-hover:bg-accent-hover group-hover:shadow-md">
            {t('book')} <span className="arrow-slide ml-1" aria-hidden="true">→</span>
          </span>
        </div>
      </div>
    </Link>
  );
}
