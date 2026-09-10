'use client';

import { LiveCaptionControls } from '@/components/live-caption-controls';
import { PanditShell } from '@/components/pandit-shell';
import { api } from '@/lib/client';
import { formatInr, LiveSessionStatus, type LiveSession } from '@poozari/shared';
import { useEffect, useState } from 'react';

export default function PanditLivePage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [urlDraft, setUrlDraft] = useState<Record<string, string>>({});

  async function load() {
    const s = await api.panditLiveSessions();
    setSessions(s);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function goLive(id: string) {
    setBusy(id);
    setError('');
    try {
      await api.panditGoLive(id, urlDraft[id] || undefined);
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
      await api.panditEndLive(id);
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
    <PanditShell>
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">
          My Live Darshan
        </h1>
        <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Start and manage your live pooja broadcasts.
        </p>
      </div>

      {error ? <p className="mb-4 rounded-2xl bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}

      <div className="space-y-4">
        {sessions.map((s) => (
          <div key={s.id} className="card overflow-hidden bg-white">
            <div className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="font-display font-bold text-sm text-foreground">{s.title}</div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-muted-foreground">
                    <span>📅 {new Date(s.scheduledAt).toLocaleString('en-IN')}</span>
                    {s.puja ? <span>🪔 {s.puja.title}</span> : null}
                    <span>💰 Join fee {formatInr(s.joinPriceInr)}</span>
                    {typeof s.viewerCount === 'number' ? <span>👁 {s.viewerCount} watching</span> : null}
                  </div>
                </div>
                <span className={`badge ${STATUS_STYLE[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {s.status}
                </span>
              </div>
            </div>

            <div
              className="flex flex-wrap items-center gap-3 border-t bg-gray-50/50 px-6 py-4"
              style={{ borderColor: 'hsl(var(--border) / 0.3)' }}
            >
              {s.status === LiveSessionStatus.SCHEDULED ? (
                <>
                  <input
                    className="input flex-1 bg-white py-2 text-xs"
                    placeholder="Playback URL (HLS .m3u8) — from your streaming app"
                    value={urlDraft[s.id] ?? s.playbackUrl ?? ''}
                    onChange={(e) => setUrlDraft((d) => ({ ...d, [s.id]: e.target.value }))}
                  />
                  <button
                    className="btn-primary text-2xs uppercase tracking-widest"
                    disabled={busy === s.id}
                    onClick={() => goLive(s.id)}
                  >
                    🔴 Go live
                  </button>
                </>
              ) : null}
              {s.status === LiveSessionStatus.LIVE ? (
                <>
                  <span className="badge bg-red-600 text-white">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
                    You are live
                  </span>
                  <button
                    className="btn-outline text-2xs uppercase tracking-widest"
                    disabled={busy === s.id}
                    onClick={() => end(s.id)}
                  >
                    ■ End broadcast
                  </button>
                </>
              ) : null}
              <a
                href={`/live-darshan/${s.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-2xs font-bold uppercase tracking-wider text-accent hover:underline"
              >
                View public page →
              </a>
            </div>

            {s.status === LiveSessionStatus.LIVE ? (
              <div className="border-t px-6 py-4" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
                <LiveCaptionControls sessionId={s.id} variant="pandit" />
              </div>
            ) : null}
          </div>
        ))}
        {sessions.length === 0 ? (
          <div className="card bg-white p-12 text-center">
            <div className="text-4xl">📡</div>
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              No live darshan sessions assigned to you yet.
            </p>
          </div>
        ) : null}
      </div>
    </PanditShell>
  );
}
