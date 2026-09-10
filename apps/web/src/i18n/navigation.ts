import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/*
 * Locale-aware replacements for next/link and next/navigation.
 *
 * Import `Link`, `redirect`, `usePathname` and `useRouter` from here rather
 * than from next/* anywhere inside the public site: these keep the reader in
 * the language they are already browsing in, instead of dropping them back to
 * English on the next click.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
