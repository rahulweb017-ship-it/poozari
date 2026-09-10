'use client';

import { usePathname } from '@/i18n/navigation';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import { currentPageUrl, WHATSAPP_DISPLAY, WHATSAPP_NUMBER } from '@/lib/whatsapp';
import { whatsappLink, type WhatsappContext } from '@poozari/shared';
import { useLocale, useTranslations } from 'next-intl';

/** WhatsApp's glyph. Inline so there is no extra request for it. */
function WhatsappIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.347-.347.52-.52.174-.174.232-.298.347-.497.115-.198.057-.371-.058-.52-.115-.148-.646-1.558-.885-2.13-.233-.56-.47-.482-.646-.49-.174-.008-.372-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.263.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.29.173-1.414-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884a9.82 9.82 0 016.988 2.898 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  );
}

/**
 * Records the booking intent, then opens WhatsApp.
 *
 * The log is fire-and-forget and only lands for signed-in devotees (the API
 * rejects anonymous callers). A failed log must never cost a booking, so the
 * chat window opens regardless.
 */
function logLead(context: WhatsappContext, pujaSlug?: string) {
  api
    .logWhatsappLead({
      context: context.kind,
      title: 'title' in context ? context.title : '',
      packageName: 'packageName' in context ? (context.packageName ?? '') : '',
      price: 'price' in context ? (context.price ?? '') : '',
      pujaSlug: pujaSlug ?? '',
      url: context.url ?? '',
    })
    .catch(() => undefined);
}

/**
 * Context-aware "Book on WhatsApp" button.
 *
 * The pre-filled message already names the ritual, package and price, so the
 * conversation starts with the details rather than "which puja did you mean?".
 */
export function WhatsappBookButton({
  context,
  pujaSlug,
  label,
  className = 'btn-whatsapp w-full text-2xs uppercase tracking-wider',
}: {
  // `WhatsappContext` already makes `url` optional in every variant. Wrapping
  // it in Omit<> would collapse the union down to its shared keys.
  context: WhatsappContext;
  pujaSlug?: string;
  label?: string;
  className?: string;
}) {
  const t = useTranslations('whatsapp');
  const locale = useLocale();
  const { user } = useAuth();

  return (
    <a
      // A real href, not a click handler calling window.open: popup blockers
      // eat programmatic opens, and this keeps middle-click and long-press
      // working. The page URL is added at click time — reading `window` during
      // render would not match what the server rendered.
      href={whatsappLink(WHATSAPP_NUMBER, context, locale)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={(event) => {
        const full = { ...context, url: context.url ?? currentPageUrl() } as WhatsappContext;
        (event.currentTarget as HTMLAnchorElement).href = whatsappLink(
          WHATSAPP_NUMBER,
          full,
          locale,
        );
        if (user) logLead(full, pujaSlug);
      }}
    >
      <span className="inline-flex items-center justify-center gap-2">
        <WhatsappIcon size={15} />
        {label ?? t('bookOnWhatsapp')}
      </span>
    </a>
  );
}

/**
 * The persistent chat button, bottom-right on every public page.
 *
 * Hidden inside the Super Admin and pandit panels — those are staff tools, not
 * places to start a booking.
 */
export function WhatsappFab() {
  const t = useTranslations('whatsapp');
  const locale = useLocale();
  const pathname = usePathname();

  if (pathname.startsWith('/admin') || pathname.startsWith('/pandit')) return null;

  return (
    <a
      href={whatsappLink(WHATSAPP_NUMBER, { kind: 'general' }, locale)}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => {
        // Attach the page the devotee is actually on, resolved at click time so
        // the link stays correct as they navigate.
        (event.currentTarget as HTMLAnchorElement).href = whatsappLink(
          WHATSAPP_NUMBER,
          { kind: 'general', url: currentPageUrl() },
          locale,
        );
      }}
      aria-label={t('fabAria')}
      className="group fixed bottom-5 right-5 z-40 flex items-center gap-2.5 rounded-full bg-[#25D366] py-3 pl-3.5 pr-4 text-white shadow-lg transition-transform duration-300 hover:scale-105 sm:bottom-7 sm:right-7"
    >
      <WhatsappIcon size={22} />
      <span className="hidden text-2xs font-bold uppercase tracking-wider sm:inline">
        {t('chatWithUs')}
      </span>
    </a>
  );
}

/** WhatsApp presented as a contact channel, for the Contact page and footer. */
export function WhatsappContactCard() {
  const t = useTranslations('whatsapp');
  const locale = useLocale();

  return (
    <div className="card bg-white p-6">
      <div className="flex items-center gap-2.5">
        <span className="text-[#25D366]">
          <WhatsappIcon size={20} />
        </span>
        <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
          WhatsApp
        </h3>
      </div>
      <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{t('contactBlurb')}</p>
      <p className="mt-3 font-display text-base font-black text-foreground">{WHATSAPP_DISPLAY}</p>
      <a
        href={whatsappLink(WHATSAPP_NUMBER, { kind: 'general' }, locale)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-whatsapp mt-4 text-2xs uppercase tracking-wider"
      >
        <span className="inline-flex items-center gap-2">
          <WhatsappIcon size={15} />
          {t('openChat')}
        </span>
      </a>
    </div>
  );
}
