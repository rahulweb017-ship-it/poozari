import { Link } from '@/i18n/navigation';
import type { NamedEntity } from '@poozari/shared';
import { getTranslations } from 'next-intl/server';

/** Renders a grid of named catalog entities (deities / festivals / benefits). */
export async function EntityGrid({
  items,
  queryKey,
  emoji,
}: {
  items: NamedEntity[];
  queryKey: 'deityId' | 'festivalId' | 'benefitId';
  emoji: string;
}) {
  const t = await getTranslations('catalogue');
  if (!items.length) {
    return (
      <div className="card mt-8 p-12 text-center">
        <div className="text-4xl">🕉️</div>
        <p className="mt-3 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {t('empty')}
        </p>
      </div>
    );
  }
  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((e) => (
        <Link
          key={e.id}
          href={`/puja?${queryKey}=${e.id}`}
          className="card group flex flex-col overflow-hidden transition-all duration-300 hover:translate-y-[-2px] hover:border-accent/40"
          style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
        >
          {/* Image or emoji fallback */}
          <div className="relative w-full overflow-hidden bg-gradient-to-br from-accent-soft to-saffron-100"
               style={{ aspectRatio: '16/10' }}>
            {e.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={e.imageUrl}
                alt={e.name}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-4xl">{emoji}</div>
            )}
          </div>
          <div className="flex flex-1 items-center justify-between p-5">
            <div className="min-w-0 flex-1">
              <div className="font-display font-bold text-sm text-foreground transition-colors duration-300 group-hover:text-accent">
                {e.name}
              </div>
              {e.description ? (
                <div className="mt-1 line-clamp-1 text-2xs" style={{ color: 'hsl(var(--muted-foreground))' }}>
                  {e.description}
                </div>
              ) : null}
            </div>
            <span className="ml-3 text-xs font-bold uppercase tracking-wider text-accent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              {t('view')} →
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
