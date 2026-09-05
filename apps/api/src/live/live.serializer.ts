import type { LiveAccess, LiveCaption, LiveSession } from '@poozari/shared';

function iso(v: any): string {
  return v?.toISOString?.() ?? (v ? String(v) : v);
}

/**
 * Serialize a live session for API output.
 * playbackUrl is only included when `includePlayback` is true — i.e. the
 * requester has a PAID ticket (or is staff) and the session is live.
 */
export function serializeLiveSession(s: any, opts?: { includePlayback?: boolean }): LiveSession {
  const includePlayback = opts?.includePlayback ?? false;
  return {
    id: s.id,
    title: s.title,
    description: s.description ?? '',
    thumbnailUrl: s.thumbnailUrl ?? null,
    joinPriceInr: s.joinPriceInr,
    status: s.status,
    scheduledAt: iso(s.scheduledAt),
    startedAt: s.startedAt ? iso(s.startedAt) : null,
    endedAt: s.endedAt ? iso(s.endedAt) : null,
    playbackUrl: includePlayback ? (s.playbackUrl ?? null) : null,
    recordingUrl: s.recordingUrl ?? null,
    puja: s.puja ? { id: s.puja.id, title: s.puja.title, slug: s.puja.slug } : null,
    pandit: s.pandit
      ? {
          id: s.pandit.id,
          displayName: s.pandit.displayName,
          experienceYears: s.pandit.experienceYears,
        }
      : null,
    hasAccess: opts?.includePlayback ?? false,
    viewerCount: s._count?.accesses,
    createdAt: iso(s.createdAt),
  };
}

export function serializeLiveAccess(a: any): LiveAccess {
  return {
    id: a.id,
    liveSessionId: a.liveSessionId,
    customerId: a.customerId,
    amountInr: a.amountInr,
    status: a.status,
    createdAt: iso(a.createdAt),
  };
}

export function serializeLiveCaption(c: any): LiveCaption {
  return {
    id: c.id,
    liveSessionId: c.liveSessionId,
    seq: c.seq,
    translations: (c.translations ?? {}) as LiveCaption['translations'],
    createdAt: iso(c.createdAt),
  };
}

export const liveInclude = {
  puja: { select: { id: true, title: true, slug: true } },
  pandit: { select: { id: true, displayName: true, experienceYears: true } },
  _count: { select: { accesses: { where: { status: 'PAID' as const } } } },
} as const;
