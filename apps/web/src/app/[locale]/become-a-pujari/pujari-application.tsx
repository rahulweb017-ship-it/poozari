'use client';

import { Field, FormError, splitCommaList, SubmittedPanel } from '@/components/form-kit';
import { api } from '@/lib/client';
import { useTranslations } from 'next-intl';
import { useState } from 'react';

const EMPTY = {
  fullName: '',
  email: '',
  phone: '',
  city: '',
  state: '',
  pincode: '',
  experienceYears: '',
  specializations: '',
  languages: '',
  lineage: '',
  about: '',
};

interface Benefit {
  title: string;
  body: string;
}

export function PujariApplication() {
  const t = useTranslations('becomePujari');
  const c = useTranslations('common');
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const why = t.raw('why') as Benefit[];
  const expect = t.raw('expect') as string[];

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await api.submitPanditApplication({
        fullName: form.fullName,
        email: form.email,
        phone: form.phone,
        city: form.city,
        state: form.state,
        pincode: form.pincode || undefined,
        experienceYears: Number(form.experienceYears) || 0,
        specializations: splitCommaList(form.specializations),
        languages: splitCommaList(form.languages),
        lineage: form.lineage,
        about: form.about,
      });
      setDone(true);
      setForm(EMPTY);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e: any) {
      setError(e.message ?? c('somethingWrong'));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit =
    form.fullName.trim() && form.email.trim() && form.phone.trim() && form.city.trim();

  return (
    <>
      {/* What you get */}
      <section className="section--compact">
        <div className="app-container">
          <h2 className="font-display text-2xl font-extrabold tracking-tight">{t('whyHeading')}</h2>
          <div className="section-bar" aria-hidden="true" />
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {why.map((item) => (
              <div key={item.title} className="card bg-white p-6">
                <h3 className="font-display text-base font-bold text-foreground">{item.title}</h3>
                <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What we expect */}
      <section
        className="section--compact border-t"
        style={{ borderColor: 'hsl(var(--border) / 0.3)' }}
      >
        <div className="app-container max-w-3xl">
          <h2 className="font-display text-2xl font-extrabold tracking-tight">
            {t('expectHeading')}
          </h2>
          <div className="section-bar" aria-hidden="true" />
          <ul className="mt-6 space-y-3">
            {expect.map((item) => (
              <li key={item} className="flex gap-3 text-sm leading-relaxed text-muted-foreground">
                <span className="mt-0.5 shrink-0 font-bold text-accent" aria-hidden="true">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Application form */}
      <section
        className="section--compact border-t"
        style={{ borderColor: 'hsl(var(--border) / 0.3)' }}
      >
        <div className="app-container max-w-3xl">
          {done ? (
            <SubmittedPanel
              heading={t('successHeading')}
              body={t('successBody')}
              actionLabel={t('applyAnother')}
              onAction={() => setDone(false)}
            />
          ) : (
            <div className="card bg-white p-6 sm:p-8">
              <h2 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
                {t('formHeading')}
              </h2>
              <div className="mt-5 space-y-4">
                <FormError message={error} />

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('fullName')} required>
                    <input
                      className="input"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                    />
                  </Field>
                  <Field label={c('phone')} required>
                    <input
                      className="input"
                      inputMode="tel"
                      placeholder="+91…"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    />
                  </Field>
                </div>

                <Field label={c('email')} required>
                  <input
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </Field>

                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label={c('city')} required>
                    <input
                      className="input"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                    />
                  </Field>
                  <Field label={c('state')}>
                    <input
                      className="input"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                    />
                  </Field>
                  <Field label={c('pincode')}>
                    <input
                      className="input"
                      inputMode="numeric"
                      value={form.pincode}
                      onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label={t('experienceLabel')}>
                    <input
                      className="input"
                      inputMode="numeric"
                      value={form.experienceYears}
                      onChange={(e) => setForm({ ...form, experienceYears: e.target.value })}
                    />
                  </Field>
                  <Field label={t('lineageLabel')}>
                    <input
                      className="input"
                      placeholder={t('lineagePlaceholder')}
                      value={form.lineage}
                      onChange={(e) => setForm({ ...form, lineage: e.target.value })}
                    />
                  </Field>
                </div>

                <Field label={t('specializationsLabel')} hint={t('specializationsHint')}>
                  <input
                    className="input"
                    placeholder={t('specializationsPlaceholder')}
                    value={form.specializations}
                    onChange={(e) => setForm({ ...form, specializations: e.target.value })}
                  />
                </Field>

                <Field label={t('languagesLabel')} hint={t('specializationsHint')}>
                  <input
                    className="input"
                    placeholder={t('languagesPlaceholder')}
                    value={form.languages}
                    onChange={(e) => setForm({ ...form, languages: e.target.value })}
                  />
                </Field>

                <Field label={t('aboutLabel')}>
                  <textarea
                    className="input"
                    rows={5}
                    placeholder={t('aboutPlaceholder')}
                    value={form.about}
                    onChange={(e) => setForm({ ...form, about: e.target.value })}
                  />
                </Field>

                <button
                  className="btn-primary w-full text-2xs uppercase tracking-widest"
                  onClick={submit}
                  disabled={busy || !canSubmit}
                >
                  {busy ? c('sending') : t('submit')}
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
