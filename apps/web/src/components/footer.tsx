import { Link } from '@/i18n/navigation';
import { WHATSAPP_DISPLAY, WHATSAPP_NUMBER } from '@/lib/whatsapp';
import { whatsappLink } from '@poozari/shared';
import { getLocale, getTranslations } from 'next-intl/server';

const EXPLORE = [
  { href: '/puja?locationType=HOME', key: 'pujasAtHome' },
  { href: '/digital-puja', key: 'digitalPuja' },
  { href: '/teerth-puja', key: 'teerthPuja' },
  { href: '/temples', key: 'famousTemples' },
  { href: '/products', key: 'pujaProducts' },
  { href: '/live-darshan', key: 'livePuja' },
  { href: '/deity', key: 'byDeity' },
] as const;

const COMPANY = [
  { href: '/about', key: 'about' },
  { href: '/how-it-works', key: 'howItWorks' },
  { href: '/blog', key: 'blog' },
  { href: '/become-a-pujari', key: 'becomePujari' },
  { href: '/contact', key: 'contact' },
] as const;

const LEGAL = [
  { href: '/privacy-policy', key: 'privacy' },
  { href: '/terms-and-conditions', key: 'terms' },
  { href: '/cancellation-and-refund', key: 'refund' },
  { href: '/shipping-policy', key: 'shipping' },
] as const;

const PARTNERS = [
  { href: '/faq', key: 'faq' },
  { href: '/enquiry', key: 'enquiry' },
  { href: '/admin/login', key: 'superAdmin' },
  { href: '/pandit/login', key: 'panditLogin' },
] as const;

const linkClass = 'text-xs transition-colors duration-300 hover:text-saffron-400';
const headingClass = 'font-display text-xs font-bold uppercase tracking-widest text-white';

export async function Footer() {
  const t = await getTranslations('footer');
  const nav = await getTranslations('nav');
  const wa = await getTranslations('whatsapp');
  // The pre-filled WhatsApp message follows the language being read.
  const locale = await getLocale();

  return (
    <footer
      className="mt-20 border-t bg-[#0b0f19] text-white/70"
      style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
    >
      <div className="app-container grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-5">
        {/* Brand */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/mark.png"
              alt="Poozari diya mark"
              className="h-10 w-10 rounded-full shadow-md"
            />
            <span className="font-display text-lg font-black uppercase tracking-widest text-white">
              poozari
            </span>
          </div>
          <p className="mt-4 max-w-sm text-xs leading-relaxed text-white/50">{t('tagline')}</p>
          <a
            href={whatsappLink(WHATSAPP_NUMBER, { kind: 'general' }, locale)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={wa('openChat')}
            className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2.5 text-xs font-bold text-white shadow-md transition-all duration-300 hover:-translate-y-px hover:bg-[#1EBE5B]"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.347-.347.52-.52.174-.174.232-.298.347-.497.115-.198.057-.371-.058-.52-.115-.148-.646-1.558-.885-2.13-.233-.56-.47-.482-.646-.49-.174-.008-.372-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.988 2.898 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            {WHATSAPP_DISPLAY}
          </a>
          <p className="mt-4 text-xs font-semibold text-saffron-400">
            <span className="mr-2 text-emerald-400">●</span>
            {t('madeIn')}
          </p>
        </div>

        {/* Explore */}
        <div>
          <h4 className={headingClass}>{t('explore')}</h4>
          <ul className="mt-5 space-y-3">
            {EXPLORE.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {t(l.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Company */}
        <div>
          <h4 className={headingClass}>{t('company')}</h4>
          <ul className="mt-5 space-y-3">
            {COMPANY.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {nav(l.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Legal + support */}
        <div>
          <h4 className={headingClass}>{t('legal')}</h4>
          <ul className="mt-5 space-y-3">
            {LEGAL.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {t(l.key)}
                </Link>
              </li>
            ))}
          </ul>
          <h4 className={`${headingClass} mt-8`}>{t('support')}</h4>
          <ul className="mt-5 space-y-3">
            {PARTNERS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className={linkClass}>
                  {t(l.key)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        className="border-t py-6 text-2xs uppercase tracking-wider text-white/30"
        style={{ borderColor: 'rgba(255, 255, 255, 0.05)' }}
      >
        <div className="app-container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <span>
            © {new Date().getFullYear()} poozari.com — {t('rights')}
          </span>
          <span className="font-bold text-saffron-500">Om Namah Shivaya 🙏</span>
        </div>
      </div>
    </footer>
  );
}
