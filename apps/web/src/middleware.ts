import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  /*
   * Run on page routes only. Skips Next internals, the API, and anything with a
   * file extension (favicons, /brand/*.png, uploads) so static assets are not
   * rewritten into a locale.
   */
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
