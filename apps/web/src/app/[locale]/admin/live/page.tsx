'use client';

import {
  ActionButton,
  AdminPageHeader,
  DataTable,
  DetailList,
  Modal,
  Notice,
  Thumb,
  csvDate,
  type Column,
  type CsvExportDef,
  type FilterDef,
} from '@/components/admin-kit';
import { AdminShell } from '@/components/admin-shell';
import { ImagePicker } from '@/components/image-picker';
import { LiveCaptionControls } from '@/components/live-caption-controls';
import { api } from '@/lib/client';
import { formatInr, LiveSessionStatus, type LiveSession, type Puja } from '@poozari/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';

const EMPTY_FORM = {
  title: '',
  description: '',
  joinPriceInr: '251',
  scheduledAt: '',
  pujaId: '',
  panditId: '',
  playbackUrl: '',
  thumbnailUrl: '',
};

const STATUS_STYLE: Record<string, string> = {
  [LiveSessionStatus.LIVE]: 'bg-red-50 text-red-700',
  [LiveSessionStatus.SCHEDULED]: 'bg-blue-50 text-blue-700',
  [LiveSessionStatus.ENDED]: 'bg-gray-100 text-gray-600',
};

const STATUS_LABEL: Record<string, string> = {
  [LiveSessionStatus.LIVE]: 'Live',
  [LiveSessionStatus.SCHEDULED]: 'Scheduled',
  [LiveSessionStatus.ENDED]: 'Ended',
};

// Playback and recording URLs are left out: they are the paid-access stream links.
const LIVE_CSV: CsvExportDef<LiveSession> = {
  name: 'live-darshan',
  columns: [
    { header: 'ID', value: (s) => s.id },
    { header: 'Title', value: (s) => s.title },
    { header: 'Status', value: (s) => STATUS_LABEL[s.status] ?? s.status },
    { header: 'Scheduled at', value: (s) => csvDate(s.scheduledAt, true) },
    { header: 'Started at', value: (s) => csvDate(s.startedAt, true) },
    { header: 'Ended at', value: (s) => csvDate(s.endedAt, true) },
    { header: 'Join fee (INR)', value: (s) => s.joinPriceInr },
    { header: 'Linked puja', value: (s) => s.puja?.title ?? '' },
    { header: 'Pandit', value: (s) => s.pandit?.displayName ?? '' },
    { header: 'Viewers', value: (s) => (typeof s.viewerCount === 'number' ? s.viewerCount : '') },
    { header: 'Description', value: (s) => s.description },
    { header: 'Page URL', value: (s) => `/live-darshan/${s.id}` },
    { header: 'Thumbnail URL', value: (s) => s.thumbnailUrl ?? '' },
    { header: 'Created', value: (s) => csvDate(s.createdAt, true) },
  ],
};

// Convert a datetime-local value to an ISO string for the API.
function toIso(local: string) {
  return local ? new Date(local).toISOString() : '';
}

/** The inverse of toIso: an ISO timestamp as a datetime-local value in the browser's zone. */
function toLocalInput(iso?: string | null) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatWhen(iso?: string | null) {
  return iso ? new Date(iso).toLocaleString('en-IN') : null;
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${STATUS_STYLE[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export default function AdminLivePage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [pujas, setPujas] = useState<Puja[]>([]);
  const [pandits, setPandits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  async function load() {
    const [s, p, pd] = await Promise.all([
      api.adminListLive(),
      api.listPujas(),
      api.adminListPandits(),
    ]);
    setSessions(s);
    setPujas(p);
    setPandits(pd);
  }

  useEffect(() => {
    load()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  // Looked up by id so the popup reflects go-live / end without reopening.
  const viewing = viewingId ? sessions.find((s) => s.id === viewingId) ?? null : null;

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }, []);
  const closeView = useCallback(() => setViewingId(null), []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  }

  function startEdit(s: LiveSession) {
    setViewingId(null);
    setEditingId(s.id);
    setFormError('');
    setForm({
      title: s.title,
      description: s.description ?? '',
      joinPriceInr: String(s.joinPriceInr),
      scheduledAt: toLocalInput(s.scheduledAt),
      pujaId: s.puja?.id ?? '',
      panditId: s.pandit?.id ?? '',
      playbackUrl: s.playbackUrl ?? '',
      thumbnailUrl: s.thumbnailUrl ?? '',
    });
    setFormOpen(true);
  }

  async function submit() {
    setFormError('');
    setMsg('');
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        joinPriceInr: Number(form.joinPriceInr) || 0,
        scheduledAt: toIso(form.scheduledAt),
        pujaId: form.pujaId || undefined,
        panditId: form.panditId || undefined,
        playbackUrl: form.playbackUrl || undefined,
        thumbnailUrl: form.thumbnailUrl || undefined,
      };
      if (editingId) {
        await api.adminUpdateLive(editingId, payload);
        setMsg('Live darshan session updated.');
      } else {
        await api.adminCreateLive(payload);
        setMsg('Live darshan session created.');
      }
      closeForm();
      await load();
    } catch (e: any) {
      setFormError(e.message ?? (editingId ? 'Could not update live session' : 'Could not create live session'));
    } finally {
      setSaving(false);
    }
  }

  async function goLive(id: string) {
    setBusy(id);
    setError('');
    setMsg('');
    try {
      const s = sessions.find((x) => x.id === id);
      await api.adminGoLive(id, s?.playbackUrl ?? undefined);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not go live');
    } finally {
      setBusy(null);
    }
  }

  async function end(id: string) {
    setBusy(id);
    setError('');
    setMsg('');
    try {
      await api.adminEndLive(id);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not end session');
    } finally {
      setBusy(null);
    }
  }

  function openPublic(s: LiveSession) {
    window.open(`/live-darshan/${s.id}`, '_blank', 'noreferrer');
  }

  const canGoLive = (s: LiveSession) =>
    s.status !== LiveSessionStatus.LIVE && s.status !== LiveSessionStatus.ENDED;

  const panditOptions = useMemo(
    () => pandits.map((p) => ({ value: p.id as string, label: p.displayName as string })),
    [pandits],
  );

  const columns: Column<LiveSession>[] = [
    {
      key: 'title',
      header: 'Session',
      render: (s) => (
        <div className="flex items-center gap-3">
          <Thumb src={s.thumbnailUrl} label={s.title} />
          <div className="min-w-0">
            <div className="max-w-[260px] truncate font-bold text-foreground">{s.title}</div>
            <div className="max-w-[260px] truncate text-3xs text-muted-foreground">{s.puja?.title ?? 'No linked puja'}</div>
          </div>
        </div>
      ),
    },
    { key: 'when', header: 'Scheduled', render: (s) => formatWhen(s.scheduledAt) ?? '—' },
    { key: 'pandit', header: 'Pandit', render: (s) => s.pandit?.displayName ?? '—' },
    {
      key: 'fee',
      header: 'Join fee',
      render: (s) => <span className="font-bold text-accent">{formatInr(s.joinPriceInr)}</span>,
    },
    {
      key: 'viewers',
      header: 'Viewers',
      render: (s) => (typeof s.viewerCount === 'number' ? s.viewerCount : '—'),
    },
    { key: 'status', header: 'Status', render: (s) => <StatusBadge status={s.status} /> },
  ];

  const filters: FilterDef<LiveSession>[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: LiveSessionStatus.LIVE, label: 'Live' },
        { value: LiveSessionStatus.SCHEDULED, label: 'Scheduled' },
        { value: LiveSessionStatus.ENDED, label: 'Ended' },
      ],
      match: (s, v) => s.status === v,
    },
    {
      key: 'pandit',
      label: 'Pandit',
      options: panditOptions,
      match: (s, v) => s.pandit?.id === v,
    },
  ];

  return (
    <AdminShell>
      <AdminPageHeader
        title="Live Darshan"
        subtitle="Schedule live pooja broadcasts, set join fees, and control go-live."
        actions={
          <button className="btn-primary text-2xs uppercase tracking-wider" onClick={openCreate}>
            + Add live session
          </button>
        }
      />

      <Notice error={error} message={msg} />

      <DataTable
        rows={sessions}
        columns={columns}
        getRowId={(s) => s.id}
        loading={loading}
        searchText={(s) => [s.title, s.description, s.puja?.title, s.pandit?.displayName].join(' ')}
        searchPlaceholder="Search title, puja, pandit…"
        filters={filters}
        emptyText="No live sessions yet."
        csvExport={LIVE_CSV}
        onRowClick={(s) => setViewingId(s.id)}
        actions={(s) => (
          <>
            <ActionButton onClick={() => setViewingId(s.id)}>
              {s.status === LiveSessionStatus.LIVE ? 'Captions' : 'View'}
            </ActionButton>
            <ActionButton tone="accent" onClick={() => startEdit(s)}>Edit</ActionButton>
            {canGoLive(s) ? (
              <ActionButton tone="danger" disabled={busy === s.id} onClick={() => goLive(s.id)}>
                🔴 Go live
              </ActionButton>
            ) : null}
            {s.status === LiveSessionStatus.LIVE ? (
              <ActionButton disabled={busy === s.id} onClick={() => end(s.id)}>
                ■ End
              </ActionButton>
            ) : null}
            <ActionButton onClick={() => openPublic(s)}>Page ↗</ActionButton>
          </>
        )}
      />

      {/* Details popup */}
      <Modal
        open={Boolean(viewing)}
        title={viewing?.title ?? ''}
        onClose={closeView}
        size="lg"
        footer={
          viewing ? (
            <>
              <button className="btn-outline text-2xs uppercase tracking-wider" onClick={() => openPublic(viewing)}>
                View page ↗
              </button>
              {canGoLive(viewing) ? (
                <button
                  className="btn-outline text-2xs uppercase tracking-wider"
                  disabled={busy === viewing.id}
                  onClick={() => goLive(viewing.id)}
                >
                  🔴 Go live
                </button>
              ) : null}
              {viewing.status === LiveSessionStatus.LIVE ? (
                <button
                  className="btn-outline text-2xs uppercase tracking-wider"
                  disabled={busy === viewing.id}
                  onClick={() => end(viewing.id)}
                >
                  ■ End
                </button>
              ) : null}
              <button className="btn-primary text-2xs uppercase tracking-wider" onClick={() => startEdit(viewing)}>
                Edit
              </button>
            </>
          ) : null
        }
      >
        {viewing ? (
          <div className="space-y-5">
            {viewing.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewing.thumbnailUrl} alt="" className="aspect-video w-full rounded-2xl object-cover" />
            ) : null}
            <DetailList
              items={[
                { label: 'Status', value: <StatusBadge status={viewing.status} /> },
                { label: 'Join fee', value: formatInr(viewing.joinPriceInr) },
                { label: 'Scheduled at', value: formatWhen(viewing.scheduledAt) },
                { label: 'Started at', value: formatWhen(viewing.startedAt) },
                { label: 'Ended at', value: formatWhen(viewing.endedAt) },
                { label: 'Viewers', value: typeof viewing.viewerCount === 'number' ? String(viewing.viewerCount) : null },
                { label: 'Linked puja', value: viewing.puja?.title },
                { label: 'Pandit', value: viewing.pandit?.displayName },
                { label: 'Playback URL', value: viewing.playbackUrl },
                { label: 'Recording URL', value: viewing.recordingUrl },
                { label: 'Description', value: viewing.description },
              ]}
            />
            {viewing.status === LiveSessionStatus.LIVE ? (
              <div className="border-t pt-4" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
                <LiveCaptionControls sessionId={viewing.id} variant="admin" />
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>

      {/* Create / edit popup */}
      <Modal
        open={formOpen}
        title={editingId ? 'Edit live session' : 'Add live session'}
        onClose={closeForm}
        size="lg"
        footer={
          <>
            <button className="btn-outline text-2xs uppercase tracking-wider" onClick={closeForm} disabled={saving}>
              Cancel
            </button>
            <button
              className="btn-primary text-2xs uppercase tracking-widest"
              onClick={submit}
              disabled={saving || !form.title || !form.scheduledAt || !form.joinPriceInr}
            >
              {saving ? 'Saving…' : editingId ? 'Save changes' : 'Create live session'}
            </button>
          </>
        }
      >
        <Notice error={formError} />
        {editingId ? (
          <p className="mb-4 text-2xs text-muted-foreground">
            Clearing the linked puja, pandit, playback URL or thumbnail keeps the current value.
          </p>
        ) : null}
        <div className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input
              className="input"
              placeholder="e.g. Ganga Aarti Live from Varanasi"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea
              className="input"
              rows={2}
              placeholder="What devotees will witness…"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Join fee (INR) *</label>
              <input
                className="input"
                type="number"
                value={form.joinPriceInr}
                onChange={(e) => setForm({ ...form, joinPriceInr: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Scheduled at *</label>
              <input
                className="input"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Linked puja</label>
              <select
                className="input"
                value={form.pujaId}
                onChange={(e) => setForm({ ...form, pujaId: e.target.value })}
              >
                <option value="">— None —</option>
                {pujas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Pandit</label>
              <select
                className="input"
                value={form.panditId}
                onChange={(e) => setForm({ ...form, panditId: e.target.value })}
              >
                <option value="">— None —</option>
                {pandits.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.displayName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Playback URL (HLS .m3u8 or embed)</label>
            <input
              className="input"
              placeholder="https://…/stream.m3u8"
              value={form.playbackUrl}
              onChange={(e) => setForm({ ...form, playbackUrl: e.target.value })}
            />
          </div>
          <ImagePicker
            label="Thumbnail"
            hint="Shown on the Live Puja cards"
            value={form.thumbnailUrl}
            onChange={(thumbnailUrl) => setForm({ ...form, thumbnailUrl })}
            aspect="16/9"
          />
        </div>
      </Modal>
    </AdminShell>
  );
}
