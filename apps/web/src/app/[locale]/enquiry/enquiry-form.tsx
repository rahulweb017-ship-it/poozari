'use client';

import { Field, FormError, SubmittedPanel } from '@/components/form-kit';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/client';
import type { Puja } from '@poozari/shared';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

const EMPTY = {
  name: '',
  email: '',
  phone: '',
  pujaSlug: '',
  preferredDate: '',
  city: '',
  message: '',
};

/**
 * Split out from the page so `useSearchParams` sits inside a Suspense
 * boundary — without one, Next cannot prerender the page shell.
 */
export function EnquiryForm() {
  const t = useTranslations('enquiry');
  const c = useTranslations('common');
  const { user } = useAuth();
  const params = useSearchParams();
  const [pujas, setPujas] = useState<Puja[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    api
      .listPujas()
      .then(setPujas)
      .catch(() => undefined);
  }, []);

  // Arriving from a puja page pre-selects that ritual (?puja=slug).
  useEffect(() => {
    const slug = params.get('puja');
    if (slug) setForm((current) => ({ ...current, pujaSlug: slug }));
  }, [params]);

  // Save a signed-in devotee from retyping what we already hold.
  useEffect(() => {
    if (!user) return;
    setForm((current) => ({
      ...current,
      name: current.name || user.name || '',
      email: current.email || user.email || '',
      phone: current.phone || user.phone || '',
    }));
  }, [user]);

  async function submit() {
    setBusy(true);
    setError('');
    try {
      const puja = pujas.find((p) => p.slug === form.pujaSlug);
      await api.submitEnquiry({
        name: form.name,
        email: form.email || undefined,
        phone: form.phone,
        subject: puja ? `Enquiry: ${puja.title}` : 'Puja enquiry',
        message: form.message,
        pujaSlug: form.pujaSlug,
        pujaTitle: puja?.title ?? '',
        preferredDate: form.preferredDate || undefined,
        city: form.city,
      });
      setDone(true);
      setForm(EMPTY);
    } catch (e: any) {
      setError(e.message ?? c('somethingWrong'));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = form.name.trim() && form.phone.trim() && form.message.trim().length >= 10;
  const today = new Date().toISOString().slice(0, 10);

  if (done) {
    return (
      <SubmittedPanel
        heading={t('successHeading')}
        body={t('successBody')}
        actionLabel={t('sendAnother')}
        onAction={() => setDone(false)}
      />
    );
  }

  return (
    <div className="card bg-white p-6 sm:p-8">
      <h2 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
        {t('formHeading')}
      </h2>
      <div className="mt-5 space-y-4">
        <FormError message={error} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={c('yourName')} required>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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

        <Field label={c('email')}>
          <input
            className="input"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>

        <Field label={t('pujaLabel')}>
          <select
            className="input"
            value={form.pujaSlug}
            onChange={(e) => setForm({ ...form, pujaSlug: e.target.value })}
          >
            <option value="">{t('pujaAny')}</option>
            {pujas.map((puja) => (
              <option key={puja.slug} value={puja.slug}>
                {puja.title}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t('preferredDateLabel')}>
            <input
              className="input"
              type="date"
              min={today}
              value={form.preferredDate}
              onChange={(e) => setForm({ ...form, preferredDate: e.target.value })}
            />
          </Field>
          <Field label={t('cityLabel')}>
            <input
              className="input"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
            />
          </Field>
        </div>

        <Field label={t('detailsLabel')} required>
          <textarea
            className="input"
            rows={6}
            placeholder={t('detailsPlaceholder')}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
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
  );
}
