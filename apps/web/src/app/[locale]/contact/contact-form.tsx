'use client';

import { Field, FormError, SubmittedPanel } from '@/components/form-kit';
import { WhatsappContactCard } from '@/components/whatsapp';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/client';
import { useAuth } from '@/lib/auth';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';

const EMPTY = { name: '', email: '', phone: '', subject: '', message: '' };

export function ContactForm() {
  const t = useTranslations('contact');
  const c = useTranslations('common');
  const { user } = useAuth();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

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
      await api.submitContact({
        name: form.name,
        email: form.email || undefined,
        phone: form.phone,
        subject: form.subject,
        message: form.message,
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

  return (
    <section className="section--compact">
        <div className="app-container grid gap-6 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-2">
            {done ? (
              <SubmittedPanel
                heading={t('successHeading')}
                body={t('successBody')}
                actionLabel={t('sendAnother')}
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
                  <Field label={c('subject')}>
                    <input
                      className="input"
                      placeholder={t('subjectPlaceholder')}
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    />
                  </Field>
                  <Field label={c('message')} required>
                    <textarea
                      className="input"
                      rows={6}
                      placeholder={t('messagePlaceholder')}
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
            )}
          </div>

          {/* Side panel */}
          <aside className="space-y-4 self-start">
            <WhatsappContactCard />
            <div className="card bg-white p-6">
              <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
                {t('reachUs')}
              </h3>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt className="text-3xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    {t('hours')}
                  </dt>
                  <dd className="mt-1 text-xs font-semibold text-foreground">{t('hoursValue')}</dd>
                </div>
                <div>
                  <dt className="text-3xs font-extrabold uppercase tracking-wider text-muted-foreground">
                    {t('responseTime')}
                  </dt>
                  <dd className="mt-1 text-xs font-semibold text-foreground">
                    {t('responseTimeValue')}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="card bg-accent-soft p-6">
              <p className="text-xs font-bold text-foreground">{t('enquiryPrompt')}</p>
              <Link
                href="/enquiry"
                className="mt-3 inline-block text-2xs font-bold uppercase tracking-wider text-accent hover:underline"
              >
                {t('enquiryLink')} →
              </Link>
            </div>
          </aside>
        </div>
    </section>
  );
}
