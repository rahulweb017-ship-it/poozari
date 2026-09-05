'use client';

import { PoozariClient } from '@poozari/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export const TOKEN_KEY = 'poozari_token';
export const USER_KEY = 'poozari_user';

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

/** A browser API client that automatically attaches the stored bearer token. */
export const api = new PoozariClient({
  baseUrl: API_URL,
  getToken: getStoredToken,
});
