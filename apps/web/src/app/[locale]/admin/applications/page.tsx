'use client';

import {
  ActionButton,
  AdminPageHeader,
  DataTable,
  DetailList,
  Modal,
  Notice,
  StatusPill,
  csvDate,
  csvYesNo,
  type Column,
  type CsvExportDef,
  type FilterDef,
} from '@/components/admin-kit';
import { AdminShell } from '@/components/admin-shell';
import { Link } from '@/i18n/navigation';
import { api } from '@/lib/client';
import {
  APPLICATION_STATUS_LABELS,
  ApplicationStatus,
  type ApproveApplicationResult,
  type PanditApplication,
} from '@poozari/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';

const STATUS_OPTIONS = [
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
/** Approve and Reject have their own buttons, since they do more than change status. */
const NEXT_STEPS: Record<string, string[]> = {
  NEW: [ApplicationStatus.REVIEWING],
  REVIEWING: [ApplicationStatus.SHORTLISTED],
  SHORTLISTED: [],
  APPROVED: [],
  REJECTED: [ApplicationStatus.REVIEWING],
};

function canDecide(item: PanditApplication) {
  return !item.panditUserId && item.status !== ApplicationStatus.REJECTED;
}

function statusLabel(status: string) {
  return APPLICATION_STATUS_LABELS[status as keyof typeof APPLICATION_STATUS_LABELS] ?? status;
}

const APPLICATIONS_CSV: CsvExportDef<PanditApplication> = {
  name: 'applications',
  columns: [
    { header: 'Applied', value: (a) => csvDate(a.createdAt, true) },
    { header: 'Status', value: (a) => statusLabel(a.status) },
    { header: 'Login created', value: (a) => csvYesNo(Boolean(a.panditUserId)) },
    { header: 'Name', value: (a) => a.fullName },
    { header: 'Email', value: (a) => a.email },
    { header: 'Phone', value: (a) => a.phone },
    { header: 'City', value: (a) => a.city },
    { header: 'State', value: (a) => a.state },
    { header: 'Pincode', value: (a) => a.pincode },
    { header: 'Experience (years)', value: (a) => a.experienceYears },
    { header: 'Specializations', value: (a) => a.specializations.join('; ') },
    { header: 'Languages', value: (a) => a.languages.join('; ') },
    { header: 'Trained', value: (a) => a.lineage },
    { header: 'About', value: (a) => a.about },
    { header: 'Document URL', value: (a) => (a.documentUrl && !a.documentUrl.startsWith('data:') ? a.documentUrl : '') },
    { header: 'Verification notes', value: (a) => a.adminNotes },
    { header: 'Application ID', value: (a) => a.id },
  ],
};

export default function AdminApplicationsPage() {
  const [items, setItems] = useState<PanditApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  /** Shown once, right after approval; the API never returns it again. */
  const [credentials, setCredentials] = useState<
    Record<string, ApproveApplicationResult>
  >({});

  // Status is filtered client-side in the table, so the full list is loaded once.
  async function load() {
    const list = await api.adminListPanditApplications(undefined);
    setItems(list);
    setNotes(Object.fromEntries(list.map((a) => [a.id, a.adminNotes])));
  }

  useEffect(() => {
    load()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const viewing = useMemo(
    () => items.find((a) => a.id === viewingId) ?? null,
    [items, viewingId],
  );
  const closeView = useCallback(() => setViewingId(null), []);

  async function move(item: PanditApplication, next: string) {
    setError('');
    setMsg('');
    try {
      await api.adminUpdatePanditApplication(item.id, { status: next });
      setMsg(`Moved ${item.fullName} to ${statusLabel(next)}.`);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not update this application');
    }
  }

  async function approve(item: PanditApplication) {
    if (!window.confirm(`Create a pujari login for ${item.fullName} (${item.email})?`)) return;
    setError('');
    setMsg('');
    setBusy(item.id);
    try {
      const result = await api.adminApprovePanditApplication(item.id);
      setCredentials((c) => ({ ...c, [item.id]: result }));
      setMsg(
        result.emailSent
          ? 'Pujari account created and login details emailed.'
          : 'Pujari account created. The email could not be sent — share the password below.',
      );
      // The temporary password is only visible in the details popup, so open it.
      setViewingId(item.id);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not approve this application');
    } finally {
      setBusy(null);
    }
  }

  async function reject(item: PanditApplication) {
    const reason = window.prompt(`Reason for rejecting ${item.fullName} (optional):`);
    if (reason === null) return;
    setError('');
    setMsg('');
    setBusy(item.id);
    try {
      await api.adminRejectPanditApplication(item.id, reason);
      setMsg('Application rejected.');
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not reject this application');
    } finally {
      setBusy(null);
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

  const newCount = items.filter((a) => a.status === ApplicationStatus.NEW).length;

  const columns: Column<PanditApplication>[] = [
    {
      key: 'applicant',
      header: 'Applicant',
      render: (a) => (
        <div className="min-w-0">
          <div className="font-bold text-foreground">{a.fullName}</div>
          <div className="text-3xs text-muted-foreground">{a.email}</div>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', className: 'whitespace-nowrap', render: (a) => a.phone || '—' },
    {
      key: 'location',
      header: 'Location',
      render: (a) => [a.city, a.state, a.pincode].filter(Boolean).join(', ') || '—',
    },
    { key: 'exp', header: 'Experience', className: 'whitespace-nowrap', render: (a) => `${a.experienceYears} yrs` },
    {
      key: 'specializations',
      header: 'Specializations',
      className: 'max-w-[180px] truncate',
      render: (a) => a.specializations.join(', ') || '—',
    },
    {
      key: 'applied',
      header: 'Applied',
      className: 'whitespace-nowrap',
      render: (a) => new Date(a.createdAt).toLocaleDateString('en-IN'),
    },
    {
      key: 'status',
      header: 'Status',
      render: (a) => (
        <div className="flex flex-col items-start gap-1">
          <span className={`badge ${STATUS_STYLES[a.status]}`}>{statusLabel(a.status)}</span>
          {a.panditUserId ? <StatusPill on onLabel="Login created" offLabel="" /> : null}
        </div>
      ),
    },
  ];

  const cityOptions = useMemo(
    () =>
      Array.from(new Set(items.map((a) => a.city).filter(Boolean)))
        .sort((x, y) => x.localeCompare(y))
        .map((c) => ({ value: c, label: c })),
    [items],
  );

  const filters: FilterDef<PanditApplication>[] = [
    {
      key: 'status',
      label: 'Status',
      options: STATUS_OPTIONS,
      match: (a, v) => a.status === v,
    },
    {
      key: 'account',
      label: 'Login',
      options: [
        { value: 'created', label: 'Login created' },
        { value: 'none', label: 'No login yet' },
      ],
      match: (a, v) => (v === 'created') === Boolean(a.panditUserId),
    },
    {
      key: 'city',
      label: 'City',
      options: cityOptions,
      match: (a, v) => a.city === v,
    },
  ];

  function stepButtons(item: PanditApplication) {
    return (NEXT_STEPS[item.status] ?? []).map((next) => (
      <ActionButton
        key={next}
        tone={next === ApplicationStatus.REJECTED ? 'danger' : 'default'}
        onClick={() => move(item, next)}
      >
        → {statusLabel(next)}
      </ActionButton>
    ));
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="Pujari Applications"
        subtitle={`Pandits who applied through “Become a Pujari”.${newCount ? ` ${newCount} new.` : ''}`}
        actions={
          <Link href="/admin/pandits" className="btn-outline text-2xs uppercase tracking-wider">
            Manage pandits
          </Link>
        }
      />

      <Notice error={error} message={msg} />

      <DataTable
        rows={items}
        columns={columns}
        getRowId={(a) => a.id}
        loading={loading}
        searchText={(a) =>
          [a.fullName, a.email, a.phone, a.city, a.state, a.pincode, ...a.specializations, ...a.languages].join(' ')
        }
        searchPlaceholder="Search name, email, phone, city, pincode…"
        filters={filters}
        emptyText="No applications yet."
        csvExport={APPLICATIONS_CSV}
        onRowClick={(a) => setViewingId(a.id)}
        actions={(a) => (
          <>
            <ActionButton onClick={() => setViewingId(a.id)}>View</ActionButton>
            {stepButtons(a)}
            {canDecide(a) ? (
              <>
                <ActionButton tone="success" disabled={busy === a.id} onClick={() => approve(a)}>
                  {busy === a.id ? 'Working…' : '✓ Approve'}
                </ActionButton>
                <ActionButton tone="danger" disabled={busy === a.id} onClick={() => reject(a)}>
                  ✕ Reject
                </ActionButton>
              </>
            ) : null}
          </>
        )}
      />

      <Modal
        open={Boolean(viewing)}
        title={viewing?.fullName ?? ''}
        onClose={closeView}
        size="lg"
        footer={
          viewing ? (
            <>
              {(NEXT_STEPS[viewing.status] ?? []).map((next) => (
                <button
                  key={next}
                  className={
                    next === ApplicationStatus.REJECTED
                      ? 'rounded-xl border border-red-200 px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50'
                      : 'btn-outline text-2xs uppercase tracking-wider'
                  }
                  onClick={() => move(viewing, next)}
                >
                  {statusLabel(next)}
                </button>
              ))}
              {canDecide(viewing) ? (
                <button
                  className="rounded-xl border border-red-200 px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50"
                  disabled={busy === viewing.id}
                  onClick={() => reject(viewing)}
                >
                  ✕ Reject
                </button>
              ) : null}
              {canDecide(viewing) ? (
                <button
                  className="btn-primary text-2xs uppercase tracking-wider"
                  disabled={busy === viewing.id}
                  onClick={() => approve(viewing)}
                >
                  {busy === viewing.id ? 'Working…' : '✓ Approve & create pujari account'}
                </button>
              ) : null}
            </>
          ) : null
        }
      >
        {viewing ? (
          <div className="space-y-6">
            <Notice error={error} message={msg} />

            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge ${STATUS_STYLES[viewing.status]}`}>{statusLabel(viewing.status)}</span>
              {viewing.panditUserId ? <StatusPill on onLabel="Login created" offLabel="" /> : null}
            </div>

            <DetailList
              items={[
                {
                  label: 'Phone',
                  value: viewing.phone ? (
                    <a href={`tel:${viewing.phone}`} className="font-semibold hover:text-accent">
                      {viewing.phone}
                    </a>
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
                { label: 'City', value: viewing.city },
                { label: 'State', value: viewing.state },
                { label: 'Pincode', value: viewing.pincode },
                { label: 'Experience', value: `${viewing.experienceYears} years` },
                { label: 'Trained', value: viewing.lineage },
                {
                  label: 'Specializations',
                  value: viewing.specializations.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {viewing.specializations.map((s) => (
                        <span key={s} className="badge bg-accent-soft text-accent">{s}</span>
                      ))}
                    </div>
                  ) : null,
                },
                {
                  label: 'Languages',
                  value: viewing.languages.length ? (
                    <div className="flex flex-wrap gap-1.5">
                      {viewing.languages.map((l) => (
                        <span key={l} className="badge bg-gray-100 text-gray-700">🗣 {l}</span>
                      ))}
                    </div>
                  ) : null,
                },
                {
                  label: 'Document',
                  value: viewing.documentUrl ? (
                    <a
                      href={viewing.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-2xs font-bold uppercase tracking-wider text-accent hover:underline"
                    >
                      📎 View document
                    </a>
                  ) : null,
                },
                { label: 'Applied', value: new Date(viewing.createdAt).toLocaleString('en-IN') },
                { label: 'About', value: viewing.about ? <span className="whitespace-pre-wrap">{viewing.about}</span> : null },
              ]}
            />

            <div>
              <label className="label">Verification notes</label>
              <textarea
                className="input py-2 text-xs"
                rows={3}
                placeholder="Who verified the lineage, what the reference said…"
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

            {credentials[viewing.id] ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
                <div className="font-bold uppercase tracking-wider">Pujari login created</div>
                <div className="mt-2">
                  Email: <span className="font-mono font-bold">{credentials[viewing.id].email}</span>
                </div>
                <div>
                  Temporary password:{' '}
                  <span className="select-all font-mono font-bold">
                    {credentials[viewing.id].tempPassword}
                  </span>
                </div>
                <p className="mt-2 text-2xs">
                  This password is shown only once. Copy it now if you need to share it.
                </p>
              </div>
            ) : viewing.panditUserId ? (
              <p className="rounded-2xl bg-emerald-50 p-3 text-2xs leading-relaxed text-emerald-800">
                A pujari login exists for this application. Manage it under{' '}
                <Link href="/admin/pandits" className="font-bold underline">
                  Pandits
                </Link>
                .
              </p>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </AdminShell>
  );
}
