'use client';

import { PanditShell } from '@/components/pandit-shell';
import { StatusBadge } from '@/components/status-badge';
import { VideoRecorder } from '@/components/video-recorder';
import { api } from '@/lib/client';
import { BookingStatus, formatInr, type Booking } from '@poozari/shared';
import { useEffect, useState } from 'react';

const NEXT_ACTION: { from: string; to: BookingStatus; label: string; icon: string }[] = [
  { from: BookingStatus.ASSIGNED, to: BookingStatus.ACCEPTED, label: 'Accept booking', icon: '✅' },
  { from: BookingStatus.ACCEPTED, to: BookingStatus.SCHEDULED, label: 'Mark scheduled', icon: '📅' },
  { from: BookingStatus.SCHEDULED, to: BookingStatus.IN_PROGRESS, label: 'Start puja', icon: '🪔' },
];

export default function PanditBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [videoUrl, setVideoUrl] = useState<Record<string, string>>({});
  const [recorderOpen, setRecorderOpen] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    const b = await api.panditBookings();
    setBookings(b);
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  async function updateStatus(id: string, status: string) {
    setBusy(id);
    try {
      await api.panditUpdateStatus(id, status);
      await load();
    } finally {
      setBusy(null);
    }
  }

  async function upload(id: string) {
    const url = videoUrl[id];
    if (!url) return;
    setBusy(id);
    try {
      await api.panditUploadVideo(id, { videoUrl: url });
      await load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <PanditShell>
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">
          Assigned Bookings
        </h1>
        <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Accept bookings, manage scheduling, and coordinate video uploads.
        </p>
      </div>

      <div className="space-y-4">
        {bookings.map((b) => {
          const action = NEXT_ACTION.find((a) => a.from === b.status);
          return (
            <div key={b.id} className="card overflow-hidden bg-white">
              <div className="p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-display font-bold text-sm text-foreground">
                      {b.puja.title}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-muted-foreground">
                      <span>📋 {b.reference}</span>
                      <span>👤 {b.devoteeName} {b.gotra ? `(${b.gotra})` : ''}</span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-semibold text-muted-foreground">
                      <span>📅 {new Date(b.preferredDate).toLocaleDateString('en-IN')} {b.preferredTime}</span>
                      <span>📍 {[b.addressLine, b.city, b.pincode].filter(Boolean).join(', ') || 'Location N/A'}</span>
                    </div>
                    <div className="mt-2 text-sm font-black text-accent">
                      {formatInr(b.amountInr)}
                    </div>
                    {b.notes ? (
                      <div className="mt-3 rounded-2xl bg-amber-50/70 border border-amber-100/50 px-4 py-2.5 text-xs font-semibold text-amber-800">
                        📝 Notes: {b.notes}
                      </div>
                    ) : null}
                  </div>
                  <StatusBadge status={b.status} />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 border-t bg-gray-50/50 px-6 py-4"
                   style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
                {action ? (
                  <button
                    className="btn-primary text-2xs uppercase tracking-widest"
                    disabled={busy === b.id}
                    onClick={() => updateStatus(b.id, action.to)}
                  >
                    {action.icon} {action.label}
                  </button>
                ) : null}

                {b.status === BookingStatus.IN_PROGRESS || b.status === BookingStatus.SCHEDULED ? (
                  <div className="flex flex-1 flex-wrap items-center gap-3">
                    <button
                      className="btn-primary text-2xs uppercase tracking-widest"
                      onClick={() => setRecorderOpen((s) => ({ ...s, [b.id]: !s[b.id] }))}
                    >
                      🎥 {recorderOpen[b.id] ? 'Hide recorder' : 'Record in app'}
                    </button>
                    <input
                      className="input flex-1 text-xs py-2 bg-white"
                      placeholder="…or paste a recorded video URL (https://…)"
                      value={videoUrl[b.id] ?? ''}
                      onChange={(e) => setVideoUrl((s) => ({ ...s, [b.id]: e.target.value }))}
                    />
                    <button
                      className="btn-outline text-2xs uppercase tracking-widest"
                      disabled={busy === b.id || !videoUrl[b.id]}
                      onClick={() => upload(b.id)}
                    >
                      Complete via link
                    </button>
                  </div>
                ) : null}

                {b.videoUrl ? (
                  <a
                    href={b.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold uppercase tracking-wider text-accent hover:underline"
                  >
                    View uploaded video →
                  </a>
                ) : null}
              </div>

              {recorderOpen[b.id] &&
              (b.status === BookingStatus.IN_PROGRESS || b.status === BookingStatus.SCHEDULED) ? (
                <div className="border-t px-6 py-5" style={{ borderColor: 'hsl(var(--border) / 0.3)' }}>
                  <VideoRecorder
                    bookingId={b.id}
                    onUploaded={() => {
                      setRecorderOpen((s) => ({ ...s, [b.id]: false }));
                      load().catch(() => undefined);
                    }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
        {bookings.length === 0 ? (
          <div className="card p-12 text-center bg-white">
            <div className="text-4xl">📋</div>
            <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              No bookings assigned yet.
            </p>
          </div>
        ) : null}
      </div>
    </PanditShell>
  );
}
