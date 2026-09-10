import { PageHeader } from '@/components/page-header';
import { Link } from '@/i18n/navigation';
import { getBlogCategories, getBlogPosts } from '@/lib/server-api';
import { readingMinutes, type BlogPost } from '@poozari/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';

export const revalidate = 30;

type Props = {
  params: { locale: string };
  searchParams: { category?: string };
};

export async function generateMetadata({ params: { locale } }: Props): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'blog' });
  return { title: `${t('title')} — poozari.com`, description: t('lead') };
}

export default async function BlogIndexPage({ params: { locale }, searchParams }: Props) {
  setRequestLocale(locale);
  const t = await getTranslations('blog');
  const category = searchParams.category;

  // An unpublished blog should not take the page down with it.
  const [posts, categories] = await Promise.all([
    getBlogPosts(category).catch(() => [] as BlogPost[]),
    getBlogCategories().catch(() => [] as string[]),
  ]);

  return (
    <div>
      <PageHeader eyebrow={t('eyebrow')} title={t('title')} lead={t('lead')} />

      <section className="section--compact">
        <div className="app-container">
          {/* Category filter */}
          {categories.length > 1 ? (
            <div className="mb-8 flex flex-wrap gap-2">
              <CategoryChip label={t('allCategories')} href="/blog" active={!category} />
              {categories.map((name) => (
                <CategoryChip
                  key={name}
                  label={name}
                  href={`/blog?category=${encodeURIComponent(name)}`}
                  active={category === name}
                />
              ))}
            </div>
          ) : null}

          {posts.length === 0 ? (
            <div className="card p-12 text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t('empty')}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {posts.map((post) => (
                <PostCard key={post.id} post={post} locale={locale} readLabel={t('readingTime', { minutes: readingMinutes(post.body) })} />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function CategoryChip({
  label,
  href,
  active,
}: {
  label: string;
  href: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3.5 py-1.5 text-2xs font-bold uppercase tracking-wider transition-colors ${
        active ? 'border-transparent bg-accent text-white' : 'bg-white text-muted-foreground hover:text-foreground'
      }`}
      style={active ? {} : { borderColor: 'hsl(var(--border) / 0.6)' }}
    >
      {label}
    </Link>
  );
}

function PostCard({
  post,
  locale,
  readLabel,
}: {
  post: BlogPost;
  locale: string;
  readLabel: string;
}) {
  const published = post.publishedAt ?? post.createdAt;
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group elevated-card flex h-full flex-col overflow-hidden bg-white"
    >
      <div
        className="relative w-full overflow-hidden bg-gradient-to-br from-saffron-100 to-orange-200"
        style={{ aspectRatio: '16/10' }}
      >
        {post.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl" aria-hidden="true">
            🪔
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <span className="badge w-fit bg-accent-soft text-accent">{post.category}</span>
        <h2 className="mt-3 font-display text-lg font-bold leading-snug text-foreground">
          {post.title}
        </h2>
        {post.excerpt ? (
          <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-muted-foreground">
            {post.excerpt}
          </p>
        ) : null}
        <div className="mt-auto pt-4 text-3xs font-bold uppercase tracking-wider text-muted-foreground">
          {new Date(published).toLocaleDateString(locale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
          {' · '}
          {readLabel}
        </div>
      </div>
    </Link>
  );
}
