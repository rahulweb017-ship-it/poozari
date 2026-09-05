'use client';

import { AdminShell } from '@/components/admin-shell';
import { LiveCaptionControls } from '@/components/live-caption-controls';
import { api } from '@/lib/client';
import { formatInr, LiveSessionStatus, type LiveSession, type Puja } from '@poozari/shared';
import { useEffect, useState } from 'react';

export default function AdminLivePage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [pujas, setPujas] = useState<Puja[]>([]);
  const [pandits, setPandits] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: '',
    description: '',
    joinPriceInr: '251',
    scheduledAt: '',
    pujaId: '',
    panditId: '',
    playbackUrl: '',
    thumbnailUrl: '',
  });

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
    load().catch(() => undefined);
  }, []);

  // Convert a datetime-local value to an ISO string for the API.
  function toIso(local: string) {
    return local ? new Date(local).toISOString() : '';
  }

  async function create() {
    setError('');
    setMsg('');
    try {
      await api.adminCreateLive({
        title: form.title,
        description: form.description || undefined,
        joinPriceInr: Number(form.joinPriceInr) || 0,
        scheduledAt: toIso(form.scheduledAt),
        pujaId: form.pujaId || undefined,
        panditId: form.panditId || undefined,
        playbackUrl: form.playbackUrl || undefined,
        thumbnailUrl: form.thumbnailUrl || undefined,
      });
      setMsg('Live darshan session created.');
      setForm({
        title: '',
        description: '',
        joinPriceInr: '251',
        scheduledAt: '',
        pujaId: '',
        panditId: '',
        playbackUrl: '',
        thumbnailUrl: '',
      });
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not create live session');
    }
  }

  async function goLive(id: string) {
    setBusy(id);
    setError('');
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
    try {
      await api.adminEndLive(id);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not end session');
    } finally {
      setBusy(null);
    }
  }

  const STATUS_STYLE: Record<string, string> = {
    [LiveSessionStatus.LIVE]: 'bg-red-50 text-red-700',
    [LiveSessionStatus.SCHEDULED]: 'bg-blue-50 text-blue-700',
    [LiveSessionStatus.ENDED]: 'bg-gray-100 text-gray-600',
  };

  return (
    <AdminShell>
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">
          Live Darshan
        </h1>
        <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Schedule live pooja broadcasts, set join fees, and control go-live.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Create form */}
        <div className="card p-6">
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
            📡 Schedule Live Session
          </h3>
          {error ? <p className="mt-3 rounded-2xl bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}
          {msg ? <p className="mt-3 rounded-2xl bg-green-50 p-3 text-xs text-green-700">{msg}</p> : null}
          <div className="mt-5 space-y-4">
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
            <div className="grid grid-cols-2 gap-3">
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
            <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="label">Thumbnail URL</label>
              <input
                className="input"
                placeholder="https://…/cover.jpg"
                value={form.thumbnailUrl}
                onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
              />
            </div>
            <button
              className="btn-primary w-full text-2xs uppercase tracking-widest"
              onClick={create}
              disabled={!form.title || !form.scheduledAt || !form.joinPriceInr}
            >
              Create live session
            </button>
          </div>
        </div>

        {/* Sessions list */}
        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
            Sessions ({sessions.length})
          </h3>
          <div className="mt-5 space-y-3">
            {sessions.map((s) => (
              <div key={s.id} className="card bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-sm text-foreground">{s.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-2xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                      <span className={`badge ${STATUS_STYLE[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {s.status}
                      </span>
                      <span className="font-semibold">
                        {new Date(s.scheduledAt).toLocaleString('en-IN')}
                      </span>
                      {s.pandit ? <span>🙏 {s.pandit.displayName}</span> : null}
                      {typeof s.viewerCount === 'number' ? <span>👁 {s.viewerCount}</span> : null}
                    </div>
                  </div>
                  <span className="shrink-0 text-sm font-black text-accent">
                    {formatInr(s.joinPriceInr)}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2.5 border-t pt-3" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
                  {s.status !== LiveSessionStatus.LIVE && s.status !== LiveSessionStatus.ENDED ? (
                    <button
                      className="btn-primary text-2xs uppercase tracking-wider"
                      disabled={busy === s.id}
                      onClick={() => goLive(s.id)}
                    >
                      🔴 Go live
                    </button>
                  ) : null}
                  {s.status === LiveSessionStatus.LIVE ? (
                    <button
                      className="btn-outline text-2xs uppercase tracking-wider"
                      disabled={busy === s.id}
                      onClick={() => end(s.id)}
                    >
                      ■ End
                    </button>
                  ) : null}
                  <a
                    href={`/live-darshan/${s.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-2xs font-bold uppercase tracking-wider text-accent hover:underline"
                  >
                    View page →
                  </a>
                </div>
                {s.status === LiveSessionStatus.LIVE ? (
                  <div className="mt-3 border-t pt-3" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
                    <LiveCaptionControls sessionId={s.id} variant="admin" />
                  </div>
                ) : null}
              </div>
            ))}
            {sessions.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  No live sessions yet.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
