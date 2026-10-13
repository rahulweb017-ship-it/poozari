'use client';

import { AdminShell } from '@/components/admin-shell';
import { ImagePicker } from '@/components/image-picker';
import { api } from '@/lib/client';
import { HOME_SLIDE_LOCALES, type HomeSlide, type HomeSlideLocale, type HomeSlideText } from '@poozari/shared';
import { useEffect, useState } from 'react';

type Lang = 'en' | HomeSlideLocale;

const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'English *' },
  { code: 'hi', label: 'हिन्दी' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
];

/** Common destinations, so the button link rarely needs typing. */
const LINK_PRESETS = [
  { href: '/puja', label: 'All pujas' },
  { href: '/puja?locationType=HOME', label: 'Pujas at home' },
  { href: '/teerth-puja', label: 'Teerth puja' },
  { href: '/digital-puja', label: 'Digital puja' },
  { href: '/live-darshan', label: 'Live puja' },
  { href: '/products', label: 'Puja products' },
  { href: '/temples', label: 'Temples' },
  { href: '/contact', label: 'Contact' },
];

const EMPTY_TEXT: HomeSlideText = { pill: '', title: '', subtitle: '', cta: '' };

const EMPTY = {
  imageUrl: '',
  mobileImageUrl: '',
  linkUrl: '/puja',
  isActive: true,
  text: {
    en: { ...EMPTY_TEXT },
    hi: { ...EMPTY_TEXT },
    fr: { ...EMPTY_TEXT },
    es: { ...EMPTY_TEXT },
  } as Record<Lang, HomeSlideText>,
};

type FormState = typeof EMPTY;

function hasText(t?: Partial<HomeSlideText>) {
  return Boolean(t && Object.values(t).some((v) => v?.trim()));
}

export default function AdminHomeSliderPage() {
  const [slides, setSlides] = useState<HomeSlide[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [lang, setLang] = useState<Lang>('en');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setSlides(await api.adminListHomeSlides());
  }

  useEffect(() => {
    load().catch((e) => setError(e.message ?? 'Could not load the slides'));
  }, []);

  function setText(field: keyof HomeSlideText, value: string) {
    setForm((f) => ({ ...f, text: { ...f.text, [lang]: { ...f.text[lang], [field]: value } } }));
  }

  function edit(slide: HomeSlide) {
    setEditingId(slide.id);
    setLang('en');
    setError('');
    setMsg('');
    const text = { en: { pill: slide.pill, title: slide.title, subtitle: slide.subtitle, cta: slide.cta } } as Record<Lang, HomeSlideText>;
    for (const code of HOME_SLIDE_LOCALES) text[code] = { ...EMPTY_TEXT, ...slide.translations?.[code] };
    setForm({
      imageUrl: slide.imageUrl,
      mobileImageUrl: slide.mobileImageUrl ?? '',
      linkUrl: slide.linkUrl,
      isActive: slide.isActive,
      text,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY);
    setLang('en');
  }

  async function save() {
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const translations: Partial<Record<HomeSlideLocale, HomeSlideText>> = {};
      for (const code of HOME_SLIDE_LOCALES) {
        if (hasText(form.text[code])) translations[code] = form.text[code];
      }
      const payload = {
        imageUrl: form.imageUrl.trim(),
        mobileImageUrl: form.mobileImageUrl.trim(),
        linkUrl: form.linkUrl.trim(),
        ...form.text.en,
        translations,
        isActive: form.isActive,
      };
      if (editingId) {
        await api.adminUpdateHomeSlide(editingId, payload);
        setMsg('Slide updated. The home page shows it within about 30 seconds.');
      } else {
        await api.adminCreateHomeSlide(payload);
        setMsg('Slide added at the end. The home page shows it within about 30 seconds.');
      }
      cancelEdit();
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not save the slide');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(slide: HomeSlide) {
    setError('');
    try {
      await api.adminUpdateHomeSlide(slide.id, { isActive: !slide.isActive });
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not update the slide');
    }
  }

  async function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= slides.length) return;
    const ids = slides.map((s) => s.id);
    [ids[index], ids[target]] = [ids[target]!, ids[index]!];
    setError('');
    try {
      setSlides(await api.adminReorderHomeSlides(ids));
    } catch (e: any) {
      setError(e.message ?? 'Could not reorder the slides');
      await load();
    }
  }

  async function remove(slide: HomeSlide) {
    if (!window.confirm(`Delete the slide "${slide.title}"? This cannot be undone. Use Hide to take it off the home page for now.`)) {
      return;
    }
    setError('');
    try {
      await api.adminDeleteHomeSlide(slide.id);
      setMsg('Slide deleted.');
      if (editingId === slide.id) cancelEdit();
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not delete the slide');
    }
  }

  const current = form.text[lang];
  const visibleCount = slides.filter((s) => s.isActive).length;

  return (
    <AdminShell>
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">Home Slider</h1>
        <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          The banners at the top of the home page, shown in this order.
        </p>
      </div>

      {error ? <p className="mb-4 rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p> : null}
      {msg ? <p className="mb-4 rounded-2xl bg-green-50 p-3 text-xs font-semibold text-green-700">{msg}</p> : null}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Listing */}
        <div className="lg:col-span-3">
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
            Slides ({visibleCount} shown of {slides.length})
          </h3>
          <div className="mt-5 space-y-3">
            {slides.length === 0 ? (
              <p className="card bg-white p-6 text-center text-xs text-muted-foreground">
                No slides yet, so the home page has no banner. Add one on the right.
              </p>
            ) : null}

            {slides.map((slide, index) => (
              <div key={slide.id} className={`card bg-white p-4 ${slide.isActive ? '' : 'opacity-60'}`}>
                <div className="flex gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={slide.imageUrl}
                    alt=""
                    className="h-16 w-40 shrink-0 rounded-xl object-cover object-right"
                    style={{ background: '#fdf6ea' }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-2xs font-bold text-muted-foreground">#{index + 1}</span>
                      {!slide.isActive ? <span className="badge bg-gray-200 text-gray-500">Hidden</span> : null}
                      {HOME_SLIDE_LOCALES.filter((code) => !hasText(slide.translations?.[code])).map((code) => (
                        <span key={code} className="badge bg-amber-100 text-amber-700">No {code.toUpperCase()}</span>
                      ))}
                    </div>
                    <div className="mt-1 truncate font-display text-sm font-black text-foreground">{slide.title}</div>
                    <div className="truncate text-2xs text-muted-foreground">
                      {slide.pill ? `${slide.pill} · ` : ''}
                      {slide.cta && slide.linkUrl ? `${slide.cta} → ${slide.linkUrl}` : 'No button'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
                  <button
                    className="btn-outline text-2xs uppercase tracking-wider"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="btn-outline text-2xs uppercase tracking-wider"
                    onClick={() => move(index, 1)}
                    disabled={index === slides.length - 1}
                    aria-label="Move down"
                  >
                    ↓
                  </button>
                  <button className="btn-outline text-2xs uppercase tracking-wider" onClick={() => edit(slide)}>
                    ✎ Edit
                  </button>
                  <button className="btn-outline text-2xs uppercase tracking-wider" onClick={() => toggleActive(slide)}>
                    {slide.isActive ? '⊘ Hide' : '✓ Show'}
                  </button>
                  <button
                    className="rounded-xl border border-red-200 px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50"
                    onClick={() => remove(slide)}
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Create / edit */}
        <div className="card self-start p-6 lg:col-span-2">
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
            {editingId ? 'Edit slide' : 'Add a slide'}
          </h3>

          <div className="mt-5 space-y-4">
            <ImagePicker
              label="Banner image *"
              aspect="3/1"
              hint="Wide image, about 1920 × 640. The text sits on the left, so keep the subject on the right."
              value={form.imageUrl}
              onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
            />
            <ImagePicker
              label="Phone image (optional)"
              aspect="3/2"
              hint="About 1200 × 800, shown on phones above the text. Leave empty to use the banner image."
              value={form.mobileImageUrl}
              onChange={(url) => setForm((f) => ({ ...f, mobileImageUrl: url }))}
            />

            <div>
              <label className="label">Button link</label>
              <input
                className="input"
                placeholder="/puja or https://…"
                value={form.linkUrl}
                onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {LINK_PRESETS.map((p) => (
                  <button
                    key={p.href}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, linkUrl: p.href }))}
                    className={`rounded-full border px-2.5 py-1 text-2xs font-semibold ${
                      form.linkUrl === p.href ? 'bg-accent text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap gap-1.5 border-b pb-2" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
                {LANGS.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => setLang(l.code)}
                    className={`rounded-xl px-3 py-1.5 text-2xs font-bold ${
                      lang === l.code ? 'bg-accent-soft text-accent' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {l.label}
                    {l.code !== 'en' && hasText(form.text[l.code]) ? ' ✓' : ''}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-2xs text-muted-foreground">
                {lang === 'en'
                  ? 'English is required. Other languages are optional; any blank field shows the English.'
                  : 'Optional. Any field left blank shows the English text.'}
              </p>
            </div>

            <div>
              <label className="label">Small label above the heading</label>
              <input
                className="input"
                placeholder={lang === 'en' ? 'Teerth Puja' : form.text.en.pill}
                value={current.pill}
                onChange={(e) => setText('pill', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Heading{lang === 'en' ? ' *' : ''}</label>
              <input
                className="input"
                placeholder={lang === 'en' ? 'Puja at India’s holiest temples, in your name' : form.text.en.title}
                value={current.title}
                onChange={(e) => setText('title', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Text below the heading</label>
              <textarea
                className="input"
                rows={3}
                placeholder={lang === 'en' ? '' : form.text.en.subtitle}
                value={current.subtitle}
                onChange={(e) => setText('subtitle', e.target.value)}
              />
            </div>
            <div>
              <label className="label">Button text</label>
              <input
                className="input"
                placeholder={lang === 'en' ? 'Explore Teerth Pujas' : form.text.en.cta}
                value={current.cta}
                onChange={(e) => setText('cta', e.target.value)}
              />
              {lang === 'en' ? (
                <p className="mt-1 text-2xs text-muted-foreground">Leave empty for a slide with no button.</p>
              ) : null}
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-foreground">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[hsl(var(--accent))]"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              Show this slide on the home page
            </label>

            <div className="flex gap-2">
              <button
                className="btn-primary flex-1 text-2xs uppercase tracking-widest"
                disabled={busy || !form.imageUrl.trim() || form.text.en.title.trim().length < 2}
                onClick={save}
              >
                {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add slide'}
              </button>
              {editingId ? (
                <button className="btn-outline text-2xs uppercase tracking-widest" onClick={cancelEdit} disabled={busy}>
                  Cancel
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
