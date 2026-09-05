'use client';

import { AdminShell } from '@/components/admin-shell';
import { api } from '@/lib/client';
import { formatInr } from '@poozari/shared';
import { useEffect, useState } from 'react';

const STAT_ICONS: Record<string, string> = {
  'Total bookings': '📋',
  'Awaiting assignment': '⏳',
  'Assigned': '✅',
  'Completed': '🎉',
  'Revenue': '💰',
  'Pandits': '👨‍🏫',
  'Customers': '👥',
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof api.adminDashboard>> | null>(null);

  useEffect(() => {
    api.adminDashboard().then(setStats).catch(() => setStats(null));
  }, []);

  const cards = stats
    ? [
        ['Total bookings', String(stats.totalBookings)],
        ['Awaiting assignment', String(stats.awaitingAssignment)],
        ['Assigned', String(stats.assigned)],
        ['Completed', String(stats.completed)],
        ['Revenue', formatInr(stats.revenueInr)],
        ['Pandits', String(stats.pandits)],
        ['Customers', String(stats.customers)],
      ]
    : [];

  return (
    <AdminShell>
      {/* Welcome banner header */}
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">
          Dashboard
        </h1>
        <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Platform Activity Overview • {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Grid container of stats */}
      {stats ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(([label, value]) => (
            <div key={label} className="card p-6 hover:shadow-md hover:border-primary/20">
              <div className="flex items-center justify-between">
                <span className="text-2xs font-extrabold uppercase tracking-widest text-muted-foreground">
                  {label}
                </span>
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-soft text-base shadow-sm">
                  {STAT_ICONS[label!] || '📊'}
                </span>
              </div>
              <div className="mt-4 text-2xl font-black text-accent">{value}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="card animate-pulse p-6">
              <div className="h-4 w-24 rounded-lg bg-gray-100" />
              <div className="mt-4 h-7 w-16 rounded-lg bg-gray-100" />
            </div>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
