'use client';

import {
  ActionButton,
  AdminPageHeader,
  DataTable,
  DetailList,
  Modal,
  Notice,
  csvDate,
  type Column,
  type CsvExportDef,
  type FilterDef,
} from '@/components/admin-kit';
import { AdminShell } from '@/components/admin-shell';
import { api } from '@/lib/client';
import {
  INQUIRY_STATUS_LABELS,
  InquiryKind,
  InquiryStatus,
  type Inquiry,
} from '@poozari/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';

const KIND_OPTIONS = [
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

const STATUS_OPTIONS = [
  { value: InquiryStatus.NEW, label: 'New' },
  { value: InquiryStatus.IN_PROGRESS, label: 'In progress' },
  { value: InquiryStatus.RESOLVED, label: 'Resolved' },
];

const STATUS_STYLES: Record<string, string> = {
  NEW: 'bg-amber-50 text-amber-700',
  IN_PROGRESS: 'bg-blue-50 text-blue-700',
  RESOLVED: 'bg-emerald-50 text-emerald-700',
};

const KIND_CSV_LABELS: Record<string, string> = {
  CONTACT: 'Contact Us',
  ENQUIRY: 'Puja enquiry',
  WHATSAPP: 'WhatsApp',
};

const INBOX_CSV: CsvExportDef<Inquiry> = {
  name: 'inbox',
  columns: [
    { header: 'Received', value: (i) => csvDate(i.createdAt, true) },
    { header: 'Type', value: (i) => KIND_CSV_LABELS[i.kind] ?? i.kind },
    { header: 'Status', value: (i) => INQUIRY_STATUS_LABELS[i.status] },
    { header: 'Name', value: (i) => i.name },
    { header: 'Phone', value: (i) => i.phone },
    { header: 'Email', value: (i) => i.email },
    { header: 'Subject', value: (i) => i.subject },
    { header: 'Message', value: (i) => i.message },
    { header: 'Puja', value: (i) => i.pujaTitle },
    { header: 'City', value: (i) => i.city },
    { header: 'Preferred date', value: (i) => csvDate(i.preferredDate) },
    { header: 'Internal note', value: (i) => i.adminNotes },
  ],
};

function whatsappLink(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, '').slice(-10).padStart(12, '91')}`;
}

function KindBadge({ kind }: { kind: string }) {
  return (
    <span className={`badge ${KIND_BADGES[kind]?.className ?? 'bg-gray-100 text-gray-700'}`}>
      {KIND_BADGES[kind]?.label ?? kind}
    </span>
  );
}

function StatusBadge({ status }: { status: Inquiry['status'] }) {
  return <span className={`badge ${STATUS_STYLES[status]}`}>{INQUIRY_STATUS_LABELS[status]}</span>;
}

export default function AdminInboxPage() {
  const [items, setItems] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [viewingId, setViewingId] = useState<string | null>(null);

  // Kind and status are filtered client-side in the table, so the full list is loaded once.
  async function load() {
    const list = await api.adminListInquiries({ kind: undefined, status: undefined });
    setItems(list);
    setNotes(Object.fromEntries(list.map((i) => [i.id, i.adminNotes])));
  }

  useEffect(() => {
    load()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const viewing = useMemo(
    () => items.find((i) => i.id === viewingId) ?? null,
    [items, viewingId],
  );
  const closeView = useCallback(() => setViewingId(null), []);

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

  const columns: Column<Inquiry>[] = [
    {
      key: 'from',
      header: 'From',
      render: (i) => (
        <div className="min-w-0">
          <div className="font-bold text-foreground">{i.name}</div>
          <div className="text-3xs text-muted-foreground">
            {[i.phone, i.email].filter(Boolean).join(' · ') || '—'}
          </div>
        </div>
      ),
    },
    { key: 'kind', header: 'Type', render: (i) => <KindBadge kind={i.kind} /> },
    {
      key: 'message',
      header: 'Message',
      className: 'max-w-[280px]',
      render: (i) => (
        <div className="min-w-0">
          {i.subject ? <div className="truncate font-semibold text-foreground">{i.subject}</div> : null}
          <div className="truncate text-muted-foreground">{i.message}</div>
        </div>
      ),
    },
    {
      key: 'puja',
      header: 'Puja / City',
      render: (i) =>
        i.pujaTitle || i.city ? (
          <div className="min-w-0">
            {i.pujaTitle ? <div className="font-semibold text-foreground">{i.pujaTitle}</div> : null}
            {i.city ? <div className="text-3xs text-muted-foreground">📍 {i.city}</div> : null}
          </div>
        ) : (
          '—'
        ),
    },
    {
      key: 'received',
      header: 'Received',
      className: 'whitespace-nowrap',
      render: (i) => new Date(i.createdAt).toLocaleString('en-IN'),
    },
    { key: 'status', header: 'Status', render: (i) => <StatusBadge status={i.status} /> },
  ];

  const filters: FilterDef<Inquiry>[] = [
    { key: 'kind', label: 'Type', options: KIND_OPTIONS, match: (i, v) => i.kind === v },
    { key: 'status', label: 'Status', options: STATUS_OPTIONS, match: (i, v) => i.status === v },
  ];

  function statusButtons(item: Inquiry) {
    return (
      <>
        {item.status !== InquiryStatus.IN_PROGRESS ? (
          <ActionButton onClick={() => setInquiryStatus(item, InquiryStatus.IN_PROGRESS)}>
            In progress
          </ActionButton>
        ) : null}
        {item.status !== InquiryStatus.RESOLVED ? (
          <ActionButton tone="success" onClick={() => setInquiryStatus(item, InquiryStatus.RESOLVED)}>
            ✓ Resolve
          </ActionButton>
        ) : (
          <ActionButton onClick={() => setInquiryStatus(item, InquiryStatus.NEW)}>Reopen</ActionButton>
        )}
      </>
    );
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="Inbox"
        subtitle="Contact Us messages, puja enquiries and WhatsApp booking intents."
      />

      <Notice error={error} message={msg} />

      <DataTable
        rows={items}
        columns={columns}
        getRowId={(i) => i.id}
        loading={loading}
        searchText={(i) =>
          [i.name, i.phone, i.email, i.subject, i.message, i.pujaTitle, i.city].filter(Boolean).join(' ')
        }
        searchPlaceholder="Search name, phone, email, message, puja, city…"
        filters={filters}
        emptyText="Nothing here."
        toolbar={
          newCount ? (
            <span className="badge bg-amber-50 text-amber-700">{newCount} new</span>
          ) : null
        }
        onRowClick={(i) => setViewingId(i.id)}
        csvExport={INBOX_CSV}
        actions={(i) => (
          <>
            <ActionButton onClick={() => setViewingId(i.id)}>View</ActionButton>
            {statusButtons(i)}
          </>
        )}
      />

      <Modal
        open={Boolean(viewing)}
        title={viewing ? viewing.subject || `Message from ${viewing.name}` : ''}
        onClose={closeView}
        size="lg"
        footer={
          viewing ? (
            <>
              {viewing.phone ? (
                <a
                  href={whatsappLink(viewing.phone)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline text-2xs uppercase tracking-wider text-[#128C4A]"
                >
                  💬 Reply on WhatsApp
                </a>
              ) : null}
              {viewing.email ? (
                <a href={`mailto:${viewing.email}`} className="btn-outline text-2xs uppercase tracking-wider">
                  ✉️ Reply by email
                </a>
              ) : null}
              {viewing.status !== InquiryStatus.IN_PROGRESS ? (
                <button
                  className="btn-outline text-2xs uppercase tracking-wider"
                  onClick={() => setInquiryStatus(viewing, InquiryStatus.IN_PROGRESS)}
                >
                  Mark in progress
                </button>
              ) : null}
              {viewing.status !== InquiryStatus.RESOLVED ? (
                <button
                  className="btn-primary text-2xs uppercase tracking-wider"
                  onClick={() => setInquiryStatus(viewing, InquiryStatus.RESOLVED)}
                >
                  ✓ Resolve
                </button>
              ) : (
                <button
                  className="btn-outline text-2xs uppercase tracking-wider"
                  onClick={() => setInquiryStatus(viewing, InquiryStatus.NEW)}
                >
                  Reopen
                </button>
              )}
            </>
          ) : null
        }
      >
        {viewing ? (
          <div className="space-y-6">
            <Notice error={error} message={msg} />

            <div className="flex flex-wrap items-center gap-2">
              <KindBadge kind={viewing.kind} />
              <StatusBadge status={viewing.status} />
            </div>

            <DetailList
              items={[
                { label: 'Name', value: viewing.name },
                {
                  label: 'Phone',
                  value: viewing.phone ? (
                    <span>
                      <a href={`tel:${viewing.phone}`} className="font-semibold hover:text-accent">
                        {viewing.phone}
                      </a>
                      {' · '}
                      <a
                        href={whatsappLink(viewing.phone)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-[#128C4A] hover:underline"
                      >
                        Reply on WhatsApp
                      </a>
                    </span>
                  ) : null,
                },
                {
                  label: 'Email',
                  value: viewing.email ? (
                    <a href={`mailto:${viewing.email}`} className="font-semibold hover:text-accent">
                      {viewing.email}
                    </a>
                  ) : null,
                },
                { label: 'Received', value: new Date(viewing.createdAt).toLocaleString('en-IN') },
                ...(viewing.kind === InquiryKind.ENQUIRY || viewing.pujaTitle || viewing.city || viewing.preferredDate
                  ? [
                      { label: 'Puja', value: viewing.pujaTitle },
                      { label: 'City', value: viewing.city },
                      {
                        label: 'Preferred date',
                        value: viewing.preferredDate
                          ? new Date(viewing.preferredDate).toLocaleDateString('en-IN')
                          : null,
                      },
                    ]
                  : []),
                { label: 'Subject', value: viewing.subject },
              ]}
            />

            <div>
              <div className="text-3xs font-extrabold uppercase tracking-widest text-muted-foreground">
                Message
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                {viewing.message}
              </p>
            </div>

            <div>
              <label className="label">Internal note</label>
              <textarea
                className="input py-2 text-xs"
                rows={3}
                placeholder="What was done, who called, what was agreed…"
                value={notes[viewing.id] ?? ''}
                onChange={(e) => setNotes({ ...notes, [viewing.id]: e.target.value })}
              />
              <button
                className="btn-outline mt-2 text-2xs uppercase tracking-wider"
                onClick={() => saveNote(viewing)}
                disabled={(notes[viewing.id] ?? '') === viewing.adminNotes}
              >
                Save note
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </AdminShell>
  );
}
