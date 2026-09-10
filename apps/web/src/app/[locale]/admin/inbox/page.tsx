'use client';

import { AdminShell } from '@/components/admin-shell';
import { api } from '@/lib/client';
import {
  INQUIRY_STATUS_LABELS,
  InquiryKind,
  InquiryStatus,
  type Inquiry,
} from '@poozari/shared';
import { useEffect, useState } from 'react';

const KIND_TABS = [
  { value: '', label: 'All' },
  { value: InquiryKind.CONTACT, label: '✉️ Contact Us' },
  { value: InquiryKind.ENQUIRY, label: '🪔 Puja enquiries' },
  { value: InquiryKind.WHATSAPP, label: '💬 WhatsApp' },
];

/** Badge for each kind, so the source of a message reads at a glance. */
const KIND_BADGES: Record<string, { label: string; className: string }> = {
  CONTACT: { label: '✉️ Contact', className: 'bg-gray-100 text-gray-700' },
  ENQUIRY: { label: '🪔 Enquiry', className: 'bg-gray-100 text-gray-700' },
  WHATSAPP: { label: '💬 WhatsApp', className: 'bg-[#25D366]/10 text-[#128C4A]' },
};

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: InquiryStatus.NEW, label: 'New' },
  { value: InquiryStatus.IN_PROGRESS, label: 'In progress' },
  { value: InquiryStatus.RESOLVED, label: 'Resolved' },
];

const STATUS_STYLES: Record<string, string> = {
  NEW: 'bg-amber-50 text-amber-700',
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
  RESOLVED: 'bg-emerald-50 text-emerald-700',
};

export default function AdminInboxPage() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [kind, setKind] = useState('');
  const [status, setStatus] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    const list = await api.adminListInquiries({ kind: kind || undefined, status: status || undefined });
    setItems(list);
    setNotes(Object.fromEntries(list.map((i) => [i.id, i.adminNotes])));
  }

  useEffect(() => {
    load().catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, status]);

  async function setInquiryStatus(item: Inquiry, next: string) {
    setError('');
    setMsg('');
    try {
      await api.adminUpdateInquiry(item.id, { status: next });
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not update this enquiry');
    }
  }

  async function saveNote(item: Inquiry) {
    setError('');
    setMsg('');
    try {
      await api.adminUpdateInquiry(item.id, { adminNotes: notes[item.id] ?? '' });
      setMsg('Note saved.');
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not save the note');
    }
  }

  const newCount = items.filter((i) => i.status === InquiryStatus.NEW).length;

  return (
    <AdminShell>
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">
          Inbox
        </h1>
        <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Contact Us messages, puja enquiries and WhatsApp booking intents.
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-3">
        <FilterRow label="Type" tabs={KIND_TABS} value={kind} onChange={setKind} />
        <FilterRow label="Status" tabs={STATUS_TABS} value={status} onChange={setStatus} />
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
        {items.length} message{items.length === 1 ? '' : 's'}
        {newCount ? <span className="ml-2 text-accent">· {newCount} new</span> : null}
      </h3>

      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item.id} className="card bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-sm text-foreground">{item.name}</span>
                  <span
                    className={`badge ${KIND_BADGES[item.kind]?.className ?? 'bg-gray-100 text-gray-700'}`}
                  >
                    {KIND_BADGES[item.kind]?.label ?? item.kind}
                  </span>
                  <span className={`badge ${STATUS_STYLES[item.status]}`}>
                    {INQUIRY_STATUS_LABELS[item.status]}
                  </span>
                </div>
                <div className="mt-1 text-2xs text-muted-foreground">
                  <a href={`tel:${item.phone}`} className="font-semibold hover:text-accent">
                    {item.phone}
                  </a>
                  {item.phone ? (
                    <>
                      {' · '}
                      <a
                        href={`https://wa.me/${item.phone.replace(/\D/g, '').slice(-10).padStart(12, '91')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#128C4A] hover:underline"
                      >
                        Reply on WhatsApp
                      </a>
                    </>
                  ) : null}
                  {item.email ? (
                    <>
                      {' · '}
                      <a href={`mailto:${item.email}`} className="font-semibold hover:text-accent">
                        {item.email}
                      </a>
                    </>
                  ) : null}
                </div>
              </div>
              <span className="shrink-0 text-3xs font-bold uppercase tracking-wider text-muted-foreground">
                {new Date(item.createdAt).toLocaleString('en-IN')}
              </span>
            </div>

            {item.subject ? (
              <p className="mt-3 text-xs font-bold text-foreground">{item.subject}</p>
            ) : null}
            <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
              {item.message}
            </p>

            {/* Enquiry-specific context */}
            {item.kind === InquiryKind.ENQUIRY &&
            (item.pujaTitle || item.city || item.preferredDate) ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.pujaTitle ? (
                  <span className="badge bg-accent-soft text-accent">{item.pujaTitle}</span>
                ) : null}
                {item.city ? (
                  <span className="badge bg-gray-100 text-gray-700">📍 {item.city}</span>
                ) : null}
                {item.preferredDate ? (
                  <span className="badge bg-gray-100 text-gray-700">
                    📅 {new Date(item.preferredDate).toLocaleDateString('en-IN')}
                  </span>
                ) : null}
              </div>
            ) : null}

            {/* Working notes + status */}
            <div
              className="mt-4 space-y-3 border-t pt-4"
              style={{ borderColor: 'hsl(var(--border) / 0.3)' }}
            >
              <div>
                <label className="label">Internal note</label>
                <textarea
                  className="input py-2 text-xs"
                  rows={2}
                  placeholder="What was done, who called, what was agreed…"
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
                {item.status !== InquiryStatus.IN_PROGRESS ? (
                  <button
                    className="btn-outline text-2xs uppercase tracking-wider"
                    onClick={() => setInquiryStatus(item, InquiryStatus.IN_PROGRESS)}
                  >
                    Mark in progress
                  </button>
                ) : null}
                {item.status !== InquiryStatus.RESOLVED ? (
                  <button
                    className="btn-outline text-2xs uppercase tracking-wider"
                    onClick={() => setInquiryStatus(item, InquiryStatus.RESOLVED)}
                  >
                    ✓ Resolve
                  </button>
                ) : (
                  <button
                    className="btn-outline text-2xs uppercase tracking-wider"
                    onClick={() => setInquiryStatus(item, InquiryStatus.NEW)}
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {items.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Nothing here.
            </p>
          </div>
        ) : null}
      </div>
    </AdminShell>
  );
}

function FilterRow({
  label,
  tabs,
  value,
  onChange,
}: {
  label: string;
  tabs: { value: string; label: string }[];
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-14 text-3xs font-extrabold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`rounded-full border px-3 py-1.5 text-2xs font-bold uppercase tracking-wider transition-colors ${
            value === tab.value
              ? 'border-transparent bg-accent text-white'
              : 'bg-white text-muted-foreground hover:text-foreground'
          }`}
          style={value === tab.value ? {} : { borderColor: 'hsl(var(--border) / 0.6)' }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
