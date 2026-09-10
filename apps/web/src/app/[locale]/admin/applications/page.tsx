'use client';

import { AdminShell } from '@/components/admin-shell';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/client';
import {
  APPLICATION_STATUS_LABELS,
  ApplicationStatus,
  type PanditApplication,
} from '@poozari/shared';
import { useEffect, useState } from 'react';

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: ApplicationStatus.NEW, label: 'New' },
  { value: ApplicationStatus.REVIEWING, label: 'Reviewing' },
  { value: ApplicationStatus.SHORTLISTED, label: 'Shortlisted' },
  { value: ApplicationStatus.APPROVED, label: 'Approved' },
  { value: ApplicationStatus.REJECTED, label: 'Rejected' },
];

const STATUS_STYLES: Record<string, string> = {
  NEW: 'bg-amber-50 text-amber-700',
  REVIEWING: 'bg-blue-50 text-blue-700',
  SHORTLISTED: 'bg-violet-50 text-violet-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-700',
};

/** The order an application normally moves through. */
const NEXT_STEPS: Record<string, string[]> = {
  NEW: [ApplicationStatus.REVIEWING, ApplicationStatus.REJECTED],
  REVIEWING: [ApplicationStatus.SHORTLISTED, ApplicationStatus.REJECTED],
  SHORTLISTED: [ApplicationStatus.APPROVED, ApplicationStatus.REJECTED],
  APPROVED: [ApplicationStatus.REVIEWING],
  REJECTED: [ApplicationStatus.REVIEWING],
};

export default function AdminApplicationsPage() {
  const [items, setItems] = useState<PanditApplication[]>([]);
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    const list = await api.adminListPanditApplications(status || undefined);
    setItems(list);
    setNotes(Object.fromEntries(list.map((a) => [a.id, a.adminNotes])));
  }

  useEffect(() => {
    load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function move(item: PanditApplication, next: string) {
    setError('');
    setMsg('');
    try {
      await api.adminUpdatePanditApplication(item.id, { status: next });
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not update this application');
    }
  }

  async function saveNote(item: PanditApplication) {
    setError('');
    setMsg('');
    try {
      await api.adminUpdatePanditApplication(item.id, { adminNotes: notes[item.id] ?? '' });
      setMsg('Note saved.');
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not save the note');
    }
  }

  return (
    <AdminShell>
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">
          Pujari Applications
        </h1>
        <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Pandits who applied through “Become a Pujari”.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`rounded-full border px-3.5 py-1.5 text-2xs font-bold uppercase tracking-wider transition-colors ${
              status === tab.value
                ? 'border-transparent bg-accent text-white'
                : 'bg-white text-muted-foreground hover:text-foreground'
            }`}
            style={status === tab.value ? {} : { borderColor: 'hsl(var(--border) / 0.6)' }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error ? (
        <p className="mb-4 rounded-2xl bg-red-50 p-3 text-xs font-semibold text-red-700">{error}</p>
      ) : null}
      {msg ? (
        <p className="mb-4 rounded-2xl bg-green-50 p-3 text-xs font-semibold text-green-700">
          {msg}
        </p>
      ) : null}

      <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
        {items.length} application{items.length === 1 ? '' : 's'}
      </h3>

      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="card bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-foreground">{item.fullName}</span>
                  <span className={`badge ${STATUS_STYLES[item.status]}`}>
                    {APPLICATION_STATUS_LABELS[item.status]}
                  </span>
                </div>
                <div className="mt-1 text-2xs text-muted-foreground">
                  <a href={`tel:${item.phone}`} className="font-semibold hover:text-accent">
                    {item.phone}
                  </a>
                  {' · '}
                  <a href={`mailto:${item.email}`} className="font-semibold hover:text-accent">
                    {item.email}
                  </a>
                </div>
                <div className="mt-1 text-2xs text-muted-foreground">
                  📍 {[item.city, item.state, item.pincode].filter(Boolean).join(', ')} ·{' '}
                  {item.experienceYears} yrs
                </div>
              </div>
              <span className="shrink-0 text-3xs font-bold uppercase tracking-wider text-muted-foreground">
                {new Date(item.createdAt).toLocaleDateString('en-IN')}
              </span>
            </div>

            {item.lineage ? (
              <p className="mt-3 text-xs text-foreground">
                <span className="font-bold">Trained: </span>
                {item.lineage}
              </p>
            ) : null}
            {item.about ? (
              <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                {item.about}
              </p>
            ) : null}

            {item.specializations.length || item.languages.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {item.specializations.map((s) => (
                  <span key={s} className="badge bg-accent-soft text-accent">
                    {s}
                  </span>
                ))}
                {item.languages.map((l) => (
                  <span key={l} className="badge bg-gray-100 text-gray-700">
                    🗣 {l}
                  </span>
                ))}
              </div>
            ) : null}

            {item.documentUrl ? (
              <a
                href={item.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-2xs font-bold uppercase tracking-wider text-accent hover:underline"
              >
                📎 View document
              </a>
            ) : null}

            <div
              className="mt-4 space-y-3 border-t pt-4"
              style={{ borderColor: 'hsl(var(--border) / 0.3)' }}
            >
              <div>
                <label className="label">Verification notes</label>
                <textarea
                  className="input py-2 text-xs"
                  rows={2}
                  placeholder="Who verified the lineage, what the reference said…"
                  value={notes[item.id] ?? ''}
                  onChange={(e) => setNotes({ ...notes, [item.id]: e.target.value })}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn-outline text-2xs uppercase tracking-wider"
                  onClick={() => saveNote(item)}
                  disabled={(notes[item.id] ?? '') === item.adminNotes}
                >
                  Save note
                </button>
                {(NEXT_STEPS[item.status] ?? []).map((next) => (
                  <button
                    key={next}
                    className={
                      next === ApplicationStatus.REJECTED
                        ? 'rounded-xl border border-red-200 px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50'
                        : 'btn-outline text-2xs uppercase tracking-wider'
                    }
                    onClick={() => move(item, next)}
                  >
                    {APPLICATION_STATUS_LABELS[next as keyof typeof APPLICATION_STATUS_LABELS]}
                  </button>
                ))}
              </div>

              {item.status === ApplicationStatus.APPROVED ? (
                <p className="rounded-2xl bg-emerald-50 p-3 text-2xs leading-relaxed text-emerald-800">
                  Approving does not create a login. Add them under{' '}
                  <Link href="/admin/pandits" className="font-bold underline">
                    Pandits
                  </Link>{' '}
                  — or include them in a{' '}
                  <Link href="/admin/import" className="font-bold underline">
                    bulk CSV import
                  </Link>{' '}
                  — using the details above.
                </p>
              ) : null}
            </div>
          </div>
        ))}

        {items.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              No applications yet.
            </p>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}
