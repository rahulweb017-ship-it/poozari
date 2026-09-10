import { Markdown } from '@/components/markdown';
import { Link } from '@/i18n/navigation';
import { getBlogPost, getBlogPosts } from '@/lib/server-api';
import { readingMinutes, type BlogPost } from '@poozari/shared';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';

export const revalidate = 30;

type Props = { params: { locale: string; slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getBlogPost(params.slug).catch(() => null);
  if (!post) {
    const t = await getTranslations({ locale: params.locale, namespace: 'blog' });
    return { title: t('notFoundTitle') };
  }
  return {
    title: `${post.title} — poozari.com`,
    description: post.excerpt || undefined,
    openGraph: post.coverImageUrl ? { images: [post.coverImageUrl] } : undefined,
  };
}

export default async function BlogPostPage({ params }: Props) {
  setRequestLocale(params.locale);
  const t = await getTranslations('blog');

  const post = await getBlogPost(params.slug).catch(() => null);
  if (!post) notFound();

  // Same category first; fall back to anything else recent.
  const related = (await getBlogPosts().catch(() => [] as BlogPost[]))
    .filter((other) => other.slug !== post.slug)
    .sort((a, b) => Number(b.category === post.category) - Number(a.category === post.category))
    .slice(0, 3);

  const published = post.publishedAt ?? post.createdAt;
  const publishedLabel = new Date(published).toLocaleDateString(params.locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <article>
      {/* Header */}
      <header
        className="border-b bg-gradient-to-b from-accent-soft to-transparent"
        style={{ borderColor: 'hsl(var(--border) / 0.3)' }}
      >
        <div className="app-container max-w-3xl py-12 sm:py-16">
          <Link
            href="/blog"
            className="text-2xs font-bold uppercase tracking-wider text-accent hover:underline"
          >
            ← {t('backToBlog')}
          </Link>
          <span className="badge mt-5 block w-fit bg-white text-accent">{post.category}</span>
          <h1 className="section-heading mt-3">{post.title}</h1>
          {post.excerpt ? (
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
          ) : null}
          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-1 text-3xs font-bold uppercase tracking-wider text-muted-foreground">
            <span>{t('by', { author: post.authorName })}</span>
            <span aria-hidden="true">·</span>
            <span>{t('publishedOn', { date: publishedLabel })}</span>
            <span aria-hidden="true">·</span>
            <span>{t('readingTime', { minutes: readingMinutes(post.body) })}</span>
          </div>
        </div>
      </header>

      {/* Cover */}
      {post.coverImageUrl ? (
        <div className="app-container max-w-3xl pt-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={post.coverImageUrl}
            alt={post.title}
            className="w-full rounded-3xl object-cover shadow-card"
            style={{ aspectRatio: '16/9' }}
          />
        </div>
      ) : null}

      {/* Body */}
      <div className="app-container max-w-3xl py-12">
        <Markdown source={post.body} />

        {post.tags.length ? (
          <div
            className="mt-12 flex flex-wrap gap-2 border-t pt-6"
            style={{ borderColor: 'hsl(var(--border) / 0.5)' }}
          >
            {post.tags.map((tag) => (
              <span key={tag} className="badge bg-gray-100 text-gray-600">
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Related */}
      {related.length ? (
        <section
          className="section--compact border-t"
          style={{ borderColor: 'hsl(var(--border) / 0.3)' }}
        >
          <div className="app-container">
            <h2 className="font-display text-xl font-extrabold tracking-tight">{t('related')}</h2>
            <div className="section-bar" aria-hidden="true" />
            <div className="mt-8 grid gap-5 sm:grid-cols-3">
              {related.map((other) => (
                <Link
                  key={other.id}
                  href={`/blog/${other.slug}`}
                  className="card bg-white p-5 transition-shadow hover:shadow-card-hover"
                >
                  <span className="badge bg-accent-soft text-accent">{other.category}</span>
                  <h3 className="mt-3 font-display text-base font-bold leading-snug text-foreground">
                    {other.title}
                  </h3>
                  {other.excerpt ? (
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                      {other.excerpt}
                    </p>
                  ) : null}
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </article>
  );
}
