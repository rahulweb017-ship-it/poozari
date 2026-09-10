'use client';

import { AdminShell } from '@/components/admin-shell';
import { api } from '@/lib/client';
import { PostStatus, readingMinutes, slugify, type BlogPost } from '@poozari/shared';
import { useEffect, useState } from 'react';

const EMPTY = {
  title: '',
  slug: '',
  excerpt: '',
  body: '',
  coverImageUrl: '',
  authorName: 'Poozari',
  category: 'Guides',
  tags: '',
  status: PostStatus.DRAFT as string,
};

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setPosts(await api.adminListBlogPosts());
  }

  useEffect(() => {
    load().catch(() => undefined);
  }, []);

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY);
    setError('');
    setMsg('');
  }

  function startEdit(post: BlogPost) {
    setEditingId(post.id);
    setError('');
    setMsg('');
    setForm({
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      body: post.body,
      coverImageUrl: post.coverImageUrl ?? '',
      authorName: post.authorName,
      category: post.category,
      tags: post.tags.join(', '),
      status: post.status,
    });
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function save(status?: string) {
    setBusy(true);
    setError('');
    setMsg('');
    try {
      const payload = {
        title: form.title,
        slug: form.slug || slugify(form.title),
        excerpt: form.excerpt,
        body: form.body,
        coverImageUrl: form.coverImageUrl || undefined,
        authorName: form.authorName,
        category: form.category,
        tags: form.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean),
        status: status ?? form.status,
      };
      if (editingId) {
        await api.adminUpdateBlogPost(editingId, payload);
        setMsg(payload.status === PostStatus.PUBLISHED ? 'Post published.' : 'Post saved.');
      } else {
        await api.adminCreateBlogPost(payload);
        setMsg(payload.status === PostStatus.PUBLISHED ? 'Post published.' : 'Draft saved.');
      }
      resetForm();
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not save the post');
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(post: BlogPost) {
    setError('');
    try {
      await api.adminUpdateBlogPost(post.id, {
        status: post.status === PostStatus.PUBLISHED ? PostStatus.DRAFT : PostStatus.PUBLISHED,
      });
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not change the post status');
    }
  }

  async function remove(post: BlogPost) {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    setError('');
    try {
      await api.adminDeleteBlogPost(post.id);
      setMsg(`Deleted “${post.title}”.`);
      if (editingId === post.id) resetForm();
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not delete the post');
    }
  }

  return (
    <AdminShell>
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">
          Blog
        </h1>
        <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Write, save as draft, and publish — no deploy needed.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor */}
        <div className="card self-start p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
              {editingId ? '✏️ Edit post' : '📝 New post'}
            </h3>
            {editingId ? (
              <button
                className="text-2xs font-bold uppercase tracking-wider text-accent hover:underline"
                onClick={resetForm}
              >
                + New post
              </button>
            ) : null}
          </div>

          {error ? (
            <p className="mt-3 rounded-2xl bg-red-50 p-3 text-xs text-red-700">{error}</p>
          ) : null}
          {msg ? (
            <p className="mt-3 rounded-2xl bg-green-50 p-3 text-xs text-green-700">{msg}</p>
          ) : null}

          <div className="mt-5 space-y-4">
            <div>
              <label className="label">Title *</label>
              <input
                className="input"
                placeholder="Narayan Nag Bali, explained"
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title: e.target.value,
                    slug: editingId ? form.slug : slugify(e.target.value),
                  })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Slug</label>
                <input
                  className="input"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Category</label>
                <input
                  className="input"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label">Excerpt</label>
              <textarea
                className="input"
                rows={2}
                placeholder="One or two lines shown on the blog index and in search results."
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Cover image URL</label>
              <input
                className="input"
                placeholder="https://…/cover.jpg or /brand/cover.jpg"
                value={form.coverImageUrl}
                onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Body (Markdown)</label>
              <textarea
                className="input font-mono text-xs"
                rows={16}
                placeholder={'## A heading\n\nA paragraph with **bold** and a [link](/puja).\n\n- a point\n- another point\n\n> A line worth pulling out.'}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
              <p className="mt-1.5 text-3xs font-semibold uppercase tracking-wider text-muted-foreground">
                Supports ## headings, **bold**, *italic*, lists, &gt; quotes, `code`, [links](/puja)
                · {readingMinutes(form.body)} min read
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Author</label>
                <input
                  className="input"
                  value={form.authorName}
                  onChange={(e) => setForm({ ...form, authorName: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Tags (comma separated)</label>
                <input
                  className="input"
                  placeholder="nag-bali, teerth"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                className="btn-outline flex-1 text-2xs uppercase tracking-wider"
                onClick={() => save(PostStatus.DRAFT)}
                disabled={busy || !form.title}
              >
                {busy ? 'Saving…' : 'Save draft'}
              </button>
              <button
                className="btn-primary flex-1 text-2xs uppercase tracking-widest"
                onClick={() => save(PostStatus.PUBLISHED)}
                disabled={busy || !form.title}
              >
                {busy ? 'Saving…' : 'Publish'}
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        <div>
          <h3 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
            All posts ({posts.length})
          </h3>
          <div className="mt-5 space-y-3">
            {posts.map((post) => (
              <div key={post.id} className="card bg-white p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{post.title}</span>
                      <span
                        className={`badge ${
                          post.status === PostStatus.PUBLISHED
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-200 text-gray-600'
                        }`}
                      >
                        {post.status === PostStatus.PUBLISHED ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-2xs text-muted-foreground">
                      <span className="badge bg-accent-soft text-accent">{post.category}</span>
                      <span className="font-semibold">/blog/{post.slug}</span>
                      <span>{readingMinutes(post.body)} min</span>
                      {post.publishedAt ? (
                        <span>{new Date(post.publishedAt).toLocaleDateString('en-IN')}</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div
                  className="mt-3 flex flex-wrap gap-2 border-t pt-3"
                  style={{ borderColor: 'hsl(var(--border) / 0.3)' }}
                >
                  <button
                    className="btn-outline text-2xs uppercase tracking-wider"
                    onClick={() => startEdit(post)}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="btn-outline text-2xs uppercase tracking-wider"
                    onClick={() => togglePublish(post)}
                  >
                    {post.status === PostStatus.PUBLISHED ? '⊘ Unpublish' : '✓ Publish'}
                  </button>
                  {post.status === PostStatus.PUBLISHED ? (
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn-outline text-2xs uppercase tracking-wider"
                    >
                      ↗ View
                    </a>
                  ) : null}
                  <button
                    className="rounded-xl border border-red-200 px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50"
                    onClick={() => remove(post)}
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
            {posts.length === 0 ? (
              <div className="card p-10 text-center">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  No posts yet.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
