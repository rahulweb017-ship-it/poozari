'use client';

import {
  ActionButton,
  AdminPageHeader,
  DataTable,
  DetailList,
  Modal,
  Notice,
  StatusPill,
  type Column,
  type FilterDef,
} from '@/components/admin-kit';
import { AdminShell } from '@/components/admin-shell';
import { ImagePicker } from '@/components/image-picker';
import { api } from '@/lib/client';
import { HOME_SLIDE_LOCALES, type HomeSlide, type HomeSlideLocale, type HomeSlideText } from '@poozari/shared';
import { useCallback, useEffect, useState } from 'react';

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

function missingLocales(slide: HomeSlide) {
  return HOME_SLIDE_LOCALES.filter((code) => !hasText(slide.translations?.[code]));
}

export default function AdminHomeSliderPage() {
  const [slides, setSlides] = useState<HomeSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [lang, setLang] = useState<Lang>('en');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setSlides(await api.adminListHomeSlides());
  }

  useEffect(() => {
    load()
      .catch((e) => setError(e.message ?? 'Could not load the slides'))
      .finally(() => setLoading(false));
  }, []);

  // Looked up by id so the popup reflects reorders and toggles without reopening.
  const viewing = viewingId ? slides.find((s) => s.id === viewingId) ?? null : null;
  const viewingIndex = viewing ? slides.findIndex((s) => s.id === viewing.id) : -1;

  function setText(field: keyof HomeSlideText, value: string) {
    setForm((f) => ({ ...f, text: { ...f.text, [lang]: { ...f.text[lang], [field]: value } } }));
  }

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY);
    setLang('en');
    setFormError('');
  }, []);
  const closeView = useCallback(() => setViewingId(null), []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setLang('en');
    setFormError('');
    setFormOpen(true);
  }

  function edit(slide: HomeSlide) {
    setViewingId(null);
    setEditingId(slide.id);
    setLang('en');
    setFormError('');
    const text = { en: { pill: slide.pill, title: slide.title, subtitle: slide.subtitle, cta: slide.cta } } as Record<Lang, HomeSlideText>;
    for (const code of HOME_SLIDE_LOCALES) text[code] = { ...EMPTY_TEXT, ...slide.translations?.[code] };
    setForm({
      imageUrl: slide.imageUrl,
      mobileImageUrl: slide.mobileImageUrl ?? '',
      linkUrl: slide.linkUrl,
      isActive: slide.isActive,
      text,
    });
    setFormOpen(true);
  }

  async function save() {
    setBusy(true);
    setFormError('');
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
      closeForm();
      await load();
    } catch (e: any) {
      setFormError(e.message ?? 'Could not save the slide');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(slide: HomeSlide) {
    setError('');
    setMsg('');
    try {
      await api.adminUpdateHomeSlide(slide.id, { isActive: !slide.isActive });
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not update the slide');
    }
  }

  async function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (index < 0 || target < 0 || target >= slides.length) return;
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
    setMsg('');
    try {
      await api.adminDeleteHomeSlide(slide.id);
      setMsg('Slide deleted.');
      setViewingId(null);
      if (editingId === slide.id) closeForm();
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not delete the slide');
    }
  }

  const current = form.text[lang];
  const visibleCount = slides.filter((s) => s.isActive).length;
  const positionOf = (slide: HomeSlide) => slides.findIndex((s) => s.id === slide.id);

  const columns: Column<HomeSlide>[] = [
    {
      key: 'order',
      header: '#',
      render: (slide) => <span className="font-bold text-muted-foreground">{positionOf(slide) + 1}</span>,
    },
    {
      key: 'image',
      header: 'Banner',
      render: (slide) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={slide.imageUrl}
          alt=""
          className={`h-10 w-28 shrink-0 rounded-lg object-cover object-right ${slide.isActive ? '' : 'opacity-60'}`}
          style={{ background: '#fdf6ea' }}
        />
      ),
    },
    {
      key: 'title',
      header: 'Heading',
      render: (slide) => (
        <div className="min-w-0">
          <div className="max-w-[260px] truncate font-bold text-foreground">{slide.title}</div>
          {slide.pill ? <div className="max-w-[260px] truncate text-3xs text-muted-foreground">{slide.pill}</div> : null}
        </div>
      ),
    },
    {
      key: 'button',
      header: 'Button',
      className: 'max-w-[200px] truncate',
      render: (slide) => (slide.cta && slide.linkUrl ? `${slide.cta} → ${slide.linkUrl}` : 'No button'),
    },
    {
      key: 'langs',
      header: 'Languages',
      render: (slide) => {
        const missing = missingLocales(slide);
        return missing.length === 0 ? (
          <span className="badge bg-emerald-50 text-emerald-700">All</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {missing.map((code) => (
              <span key={code} className="badge bg-amber-100 text-amber-700">No {code.toUpperCase()}</span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (slide) => <StatusPill on={slide.isActive} onLabel="Shown" offLabel="Hidden" />,
    },
  ];

  const filters: FilterDef<HomeSlide>[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'shown', label: 'Shown' },
        { value: 'hidden', label: 'Hidden' },
      ],
      match: (slide, v) => (v === 'shown' ? slide.isActive : !slide.isActive),
    },
    {
      key: 'translations',
      label: 'Translations',
      options: [
        { value: 'complete', label: 'All languages' },
        { value: 'missing', label: 'Missing a language' },
      ],
      match: (slide, v) => (v === 'complete') === (missingLocales(slide).length === 0),
    },
  ];

  return (
    <AdminShell>
      <AdminPageHeader
        title="Home Slider"
        subtitle={`The banners at the top of the home page, shown in this order. ${visibleCount} shown of ${slides.length}.`}
        actions={
          <button className="btn-primary text-2xs uppercase tracking-wider" onClick={openCreate}>
            + Add slide
          </button>
        }
      />

      <Notice error={error} message={msg} />

      <DataTable
        rows={slides}
        columns={columns}
        getRowId={(slide) => slide.id}
        loading={loading}
        searchText={(slide) =>
          [
            slide.title,
            slide.pill,
            slide.subtitle,
            slide.cta,
            slide.linkUrl,
            ...Object.values(slide.translations ?? {}).flatMap((t) => Object.values(t ?? {})),
          ].join(' ')
        }
        searchPlaceholder="Search heading, label, button, link…"
        filters={filters}
        emptyText="No slides yet, so the home page has no banner. Add one with + Add slide."
        onRowClick={(slide) => setViewingId(slide.id)}
        actions={(slide) => {
          const index = positionOf(slide);
          return (
            <>
              <ActionButton title="Move up" onClick={() => move(index, -1)} disabled={index === 0}>
                ↑
              </ActionButton>
              <ActionButton title="Move down" onClick={() => move(index, 1)} disabled={index === slides.length - 1}>
                ↓
              </ActionButton>
              <ActionButton onClick={() => setViewingId(slide.id)}>View</ActionButton>
              <ActionButton tone="accent" onClick={() => edit(slide)}>Edit</ActionButton>
              <ActionButton tone={slide.isActive ? 'default' : 'success'} onClick={() => toggleActive(slide)}>
                {slide.isActive ? 'Hide' : 'Show'}
              </ActionButton>
              <ActionButton tone="danger" onClick={() => remove(slide)}>Delete</ActionButton>
            </>
          );
        }}
      />

      {/* Details popup */}
      <Modal
        open={Boolean(viewing)}
        title={viewing ? `Slide #${viewingIndex + 1}` : ''}
        onClose={closeView}
        size="lg"
        footer={
          viewing ? (
            <>
              <button
                className="rounded-xl border border-red-200 px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50"
                onClick={() => remove(viewing)}
              >
                Delete
              </button>
              <button
                className="btn-outline text-2xs uppercase tracking-wider"
                onClick={() => move(viewingIndex, -1)}
                disabled={viewingIndex <= 0}
              >
                ↑ Move up
              </button>
              <button
                className="btn-outline text-2xs uppercase tracking-wider"
                onClick={() => move(viewingIndex, 1)}
                disabled={viewingIndex === slides.length - 1}
              >
                ↓ Move down
              </button>
              <button className="btn-outline text-2xs uppercase tracking-wider" onClick={() => toggleActive(viewing)}>
                {viewing.isActive ? 'Hide' : 'Show'}
              </button>
              <button className="btn-primary text-2xs uppercase tracking-wider" onClick={() => edit(viewing)}>
                Edit
              </button>
            </>
          ) : null
        }
      >
        {viewing ? (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={viewing.imageUrl}
                alt=""
                className="aspect-[3/1] w-full rounded-2xl object-cover object-right sm:col-span-2"
                style={{ background: '#fdf6ea' }}
              />
              {viewing.mobileImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={viewing.mobileImageUrl}
                  alt=""
                  className="aspect-[3/2] w-full rounded-2xl object-cover"
                  style={{ background: '#fdf6ea' }}
                />
              ) : null}
            </div>
            <DetailList
              items={[
                { label: 'Status', value: viewing.isActive ? 'Shown on the home page' : 'Hidden' },
                { label: 'Position', value: `${viewingIndex + 1} of ${slides.length}` },
                { label: 'Small label', value: viewing.pill },
                { label: 'Heading', value: viewing.title },
                { label: 'Text', value: viewing.subtitle },
                { label: 'Button', value: viewing.cta ? `${viewing.cta} → ${viewing.linkUrl}` : 'No button' },
                { label: 'Phone image', value: viewing.mobileImageUrl ? 'Custom' : 'Uses the banner image' },
                {
                  label: 'Translations',
                  value: HOME_SLIDE_LOCALES.map((code) =>
                    `${code.toUpperCase()} ${hasText(viewing.translations?.[code]) ? '✓' : '—'}`,
                  ).join('  '),
                },
              ]}
            />
          </div>
        ) : null}
      </Modal>

      {/* Create / edit popup */}
      <Modal
        open={formOpen}
        title={editingId ? 'Edit slide' : 'Add slide'}
        onClose={closeForm}
        size="lg"
        footer={
          <>
            <button className="btn-outline text-2xs uppercase tracking-wider" onClick={closeForm} disabled={busy}>
              Cancel
            </button>
            <button
              className="btn-primary text-2xs uppercase tracking-widest"
              disabled={busy || !form.imageUrl.trim() || form.text.en.title.trim().length < 2}
              onClick={save}
            >
              {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add slide'}
            </button>
          </>
        }
      >
        <Notice error={formError} />
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

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
        </div>
      </Modal>
    </AdminShell>
  );
}
