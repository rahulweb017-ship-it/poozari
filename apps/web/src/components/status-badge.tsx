'use client';

import { BookingStatus } from '@poozari/shared';
import { useTranslations } from 'next-intl';

const STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  [BookingStatus.PENDING_PAYMENT]: { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' },
  [BookingStatus.PAID]: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  [BookingStatus.ASSIGNED]: { bg: 'bg-indigo-50', text: 'text-indigo-700', dot: 'bg-indigo-500' },
  [BookingStatus.ACCEPTED]: { bg: 'bg-purple-50', text: 'text-purple-700', dot: 'bg-purple-500' },
  [BookingStatus.SCHEDULED]: { bg: 'bg-amber-50', text: 'text-amber-700', dot: 'bg-amber-500' },
  [BookingStatus.IN_PROGRESS]: { bg: 'bg-orange-50', text: 'text-orange-700', dot: 'bg-orange-500' },
  [BookingStatus.COMPLETED]: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  [BookingStatus.CANCELLED]: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
  [BookingStatus.REFUNDED]: { bg: 'bg-red-50', text: 'text-red-700', dot: 'bg-red-500' },
};

const DEFAULT = { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400' };

export function StatusBadge({ status }: { status: string }) {
  const t = useTranslations('account.status');
  const s = STYLES[status] ?? DEFAULT;
  return (
    <span className={`badge ${s.bg} ${s.text}`}>
      <span className={`inline-block h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {t.has(status as never) ? t(status as never) : status}
    </span>
  );
}
