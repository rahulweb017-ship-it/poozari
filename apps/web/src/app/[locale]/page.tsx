import { Link } from '@/i18n/navigation';
import { HomeBell } from '@/components/home-bell';
import { HomeHeroSlider, type HeroSlide } from '@/components/home-hero-slider';
import { PujaCard } from '@/components/puja-card';
import { getCities, getPujas } from '@/lib/server-api';
import { getTranslations } from 'next-intl/server';

export const revalidate = 15;

const STEP_ICONS = ['📝', '🛡️', '📦', '🪔', '🎥'];

/** Icons only; the copy is `home.features`, in the same order. */
const FEATURE_ICONS = [
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
      </svg>
    ),
  },
];

/** Images and links only; the copy is `home.heroSlides`, in the same order. */
const HERO_SLIDES = [
  { image: 'temple-dawn', href: '/teerth-puja' },
  { image: 'home-mandir', href: '/puja' },
  { image: 'live-puja', href: '/live-darshan' },
  { image: 'havan', href: '/puja' },
  { image: 'puja-thali', href: '/products' },
];

interface Copy {
  title: string;
  desc: string;
}

export default async function HomePage() {
  const [homePujas, teerthPujas, cities] = await Promise.all([
    getPujas({ locationType: 'HOME' }).catch(() => []),
    getPujas({ locationType: 'TEERTH' }).catch(() => []),
    getCities().catch(() => []),
  ]);
  const t = await getTranslations('home');
  const steps = (t.raw('steps') as Copy[]).map((s, i) => ({ ...s, icon: STEP_ICONS[i] }));
  const features = (t.raw('features') as Copy[]).map((f, i) => ({ ...f, icon: FEATURE_ICONS[i]?.icon }));
  const slides: HeroSlide[] = (t.raw('heroSlides') as Omit<HeroSlide, 'image' | 'href'>[]).map((s, i) => ({
    ...s,
    ...HERO_SLIDES[i]!,
  }));

  return (
    <div>
      <HomeBell />
      <HomeHeroSlider slides={slides} />

      {/* ─── Features / About Us Section ──────────────────────────── */}
      <section className="section--compact border-b" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
        <div className="app-container">
          <div className="flex flex-col items-center text-center mx-auto max-w-4xl">
            <span className="section-pill">{t('aboutPill')}</span>
            <h2 className="section-heading mt-3">
              {t('aboutTitleLead')} <span className="text-accent">{t('aboutTitleAccent')}</span>
            </h2>
            <div className="section-bar mx-auto" aria-hidden="true" />
            <p className="section-subheading mx-auto">
              {t('aboutLead')}
            </p>
          </div>
          <div className="mx-auto mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="card group saffron-glow p-6 text-left"
                   style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent transition-colors duration-300 group-hover:bg-accent group-hover:text-white shadow-sm">
                  {f.icon}
                </div>
                <h3 className="font-display text-base font-bold mt-5 text-foreground">{f.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Teerth Cities Gallery (Circular/Oval Unique layout) ──── */}
      {cities.length ? (
        <section className="section--compact relative overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
          <div className="app-container relative z-10">
            <div className="flex flex-col items-center text-center mb-12">
              <span className="section-pill">{t('citiesPill')}</span>
              <h2 className="section-heading mt-3">
                {t('citiesTitleLead')} <span className="text-accent">{t('citiesTitleAccent')}</span>
              </h2>
              <div className="section-bar mx-auto" aria-hidden="true" />
              <p className="section-subheading mx-auto">
                {t('citiesLead')}
              </p>
            </div>
            {/* Oval cities display layout */}
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 justify-center">
              {cities.map((c) => (
                <Link
                  key={c.id}
                  href={`/puja?cityId=${c.id}`}
                  className="group block text-center"
                >
                  <div className="mx-auto overflow-hidden border-2 border-primary/20 shadow-md transition-all duration-500 group-hover:shadow-xl group-hover:scale-105 group-hover:border-accent"
                       style={{ width: '180px', height: '240px', borderRadius: '5rem' }}>
                    {c.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.imageUrl}
                        alt={c.name}
                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-accent-soft to-saffron-100 text-5xl">🛕</div>
                    )}
                  </div>
                  <h3 className="mt-4 font-display text-base font-extrabold tracking-wide text-foreground transition-colors duration-300 group-hover:text-accent">
                    {c.name}
                  </h3>
                  <p className="mt-1 text-3xs font-extrabold uppercase tracking-widest text-muted-foreground">
                    {t('templesServed', { count: c.templeCount ?? 0 })}
                  </p>
                </Link>
              ))}
            </div>
            <div className="mt-12 text-center">
              <Link href="/teerth-puja" className="btn-outline btn-lg rounded-full">
                {t('exploreCities')} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {/* ─── Puja at Home Section ─────────────────────────────────── */}
      <section className="section--compact">
        <div className="app-container">
          <div className="flex flex-col items-center text-center mb-12">
            <span className="section-pill">{t('homePill')}</span>
            <h2 className="section-heading mt-3">
              {t('homeTitleLead')} <span className="text-accent">{t('homeTitleAccent')}</span>
            </h2>
            <div className="section-bar mx-auto" aria-hidden="true" />
            <p className="section-subheading mx-auto">
              {t('homeLead')}
            </p>
          </div>
          {homePujas.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {homePujas.slice(0, 4).map((p) => (
                <PujaCard key={p.id} puja={p} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
          {homePujas.length > 4 && (
            <div className="mt-10 text-center">
              <Link href="/puja" className="btn-outline rounded-full">
                {t('viewAllHome')} <span aria-hidden="true">→</span>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ─── Teerth Puja Section ──────────────────────────────────── */}
      <section className="section--compact" style={{ background: 'hsl(var(--card))' }}>
        <div className="app-container">
          <div className="flex flex-col items-center text-center mb-12">
            <span className="section-pill">{t('teerthPill')}</span>
            <h2 className="section-heading mt-3">
              {t('teerthTitleLead')} <span className="text-accent">{t('teerthTitleAccent')}</span>
            </h2>
            <div className="section-bar mx-auto" aria-hidden="true" />
            <p className="section-subheading mx-auto">
              {t('teerthLead')}
            </p>
          </div>
          {teerthPujas.length ? (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {teerthPujas.slice(0, 4).map((p) => (
                <PujaCard key={p.id} puja={p} />
              ))}
            </div>
          ) : (
            <EmptyState />
          )}
        </div>
      </section>

      {/* ─── How it works Section ─────────────────────────────────── */}
      <section className="section--compact bg-accent-soft border-t" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
        <div className="app-container">
          <div className="flex flex-col items-center text-center mb-12">
            <span className="section-pill">{t('stepsPill')}</span>
            <h2 className="section-heading mt-3">
              {t('stepsTitleLead')} <span className="text-accent">{t('stepsTitleAccent')}</span>
            </h2>
            <div className="section-bar mx-auto" aria-hidden="true" />
          </div>
          <div className="grid gap-6 md:grid-cols-5">
            {steps.map((s, i) => (
              <div key={s.title} className="card p-6 text-center border-none shadow-sm bg-white/60 backdrop-blur-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-lg font-bold text-white shadow-md">
                  {i + 1}
                </div>
                <div className="mx-auto mt-3 text-2xl">{s.icon}</div>
                <h3 className="font-display mt-4 text-xs font-bold text-foreground">
                  {s.title}
                </h3>
                <p className="mt-2 text-3xs font-semibold leading-relaxed text-muted-foreground">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

async function EmptyState() {
  const t = await getTranslations('home');
  return (
    <div className="card p-12 text-center">
      <div className="text-4xl">🕉️</div>
      <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {t('emptyTitle')}
      </p>
      <Link href="/puja" className="btn-outline mt-5 inline-flex text-2xs uppercase tracking-wider">
        {t('emptyCta')}
      </Link>
    </div>
  );
}
