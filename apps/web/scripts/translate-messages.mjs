#!/usr/bin/env node
/**
 * Fill in missing translations with Google Cloud Translation.
 *
 *   GOOGLE_TRANSLATE_API_KEY=... pnpm --filter @poozari/web i18n:translate [hi fr es] [--dry-run]
 *
 * English (messages/en.json) is the source of truth. For each target locale,
 * every string key present in English but missing from that locale's file is
 * machine-translated and written back. Keys that already exist are never
 * touched, so a translation someone has corrected by hand stays corrected —
 * delete a key from hi.json to have it re-translated.
 *
 * ICU placeholders ({name}, {count, plural, ...}) are protected from
 * translation. Plural/select messages are skipped with a warning, because the
 * branches must be translated by a person.
 *
 * The output is a draft: review the Hindi (and French/Spanish) before it goes
 * live, especially ritual terms.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const MESSAGES = join(dirname(fileURLToPath(import.meta.url)), '..', 'messages');
const ENDPOINT = 'https://translation.googleapis.com/language/translate/v2';
const BATCH = 100; // the API accepts up to 128 strings per request

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const locales = args.filter((a) => !a.startsWith('--'));
const targets = locales.length ? locales : ['hi', 'fr', 'es'];
const key = process.env.GOOGLE_TRANSLATE_API_KEY;
if (!key && !dryRun) {
  console.error('Set GOOGLE_TRANSLATE_API_KEY (a Google Cloud API key with the Cloud Translation API enabled).');
  process.exit(1);
}

const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

/** Every string leaf as [path, value]; array items get their index in the path. */
function leaves(node, path = []) {
  if (typeof node === 'string') return [[path, node]];
  if (Array.isArray(node)) return node.flatMap((v, i) => leaves(v, [...path, i]));
  if (isObject(node)) return Object.entries(node).flatMap(([k, v]) => leaves(v, [...path, k]));
  return [];
}

function getAt(node, path) {
  return path.reduce((n, k) => (n == null ? undefined : n[k]), node);
}

/** Set a leaf, creating objects/arrays shaped like the English on the way. */
function setAt(target, source, path, value) {
  let t = target;
  let s = source;
  path.forEach((k, i) => {
    if (i === path.length - 1) {
      t[k] = value;
      return;
    }
    s = s[k];
    if (t[k] == null) t[k] = Array.isArray(s) ? [] : {};
    t = t[k];
  });
}

/** Keep the locale file in English key order, with extra keys it has at the end. */
function orderLike(source, target) {
  if (Array.isArray(source)) return Array.isArray(target) ? source.map((v, i) => orderLike(v, target[i])) : target;
  if (!isObject(source) || !isObject(target)) return target;
  const out = {};
  for (const k of Object.keys(source)) if (k in target) out[k] = orderLike(source[k], target[k]);
  for (const k of Object.keys(target)) if (!(k in out)) out[k] = target[k];
  return out;
}

const PLACEHOLDER = /\{[^{}]*\}/g;

/** Wrap placeholders so Google leaves them alone (html mode honours translate="no"). */
function protect(text) {
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped.replace(PLACEHOLDER, (m) => `<span translate="no">${m}</span>`);
}

function unprotect(html) {
  return html
    .replace(/<span translate="no">\s*(\{[^{}]*\})\s*<\/span>/g, '$1')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

async function translate(texts, target) {
  const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: texts.map(protect), source: 'en', target, format: 'html' }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`Google Translate ${res.status}: ${body?.error?.message ?? res.statusText}`);
  return body.data.translations.map((t) => unprotect(t.translatedText));
}

const english = JSON.parse(await readFile(join(MESSAGES, 'en.json'), 'utf8'));

for (const locale of targets) {
  const file = join(MESSAGES, `${locale}.json`);
  const current = JSON.parse(await readFile(file, 'utf8'));
  const missing = leaves(english).filter(([path]) => getAt(current, path) === undefined);
  const plural = missing.filter(([, v]) => /\{[^{}]*,\s*(plural|select|selectordinal)\s*,/.test(v));
  const todo = missing.filter((m) => !plural.includes(m));

  for (const [path] of plural) console.warn(`${locale}: skipped ${path.join('.')} (plural/select — translate by hand)`);
  console.log(`${locale}: ${todo.length} missing string(s)`);
  if (dryRun || !todo.length) {
    for (const [path] of todo) console.log(`  ${path.join('.')}`);
    continue;
  }

  for (let i = 0; i < todo.length; i += BATCH) {
    const chunk = todo.slice(i, i + BATCH);
    const out = await translate(chunk.map(([, v]) => v), locale);
    chunk.forEach(([path], j) => setAt(current, english, path, out[j]));
  }
  await writeFile(file, JSON.stringify(orderLike(english, current), null, 2) + '\n', 'utf8');
  console.log(`${locale}: wrote ${file}`);
}
