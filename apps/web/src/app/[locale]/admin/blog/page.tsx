'use client';

import {
  ActionButton,
  AdminPageHeader,
  DataTable,
  DetailList,
  Modal,
  Notice,
  StatusPill,
  Thumb,
  csvDate,
  type Column,
  type CsvExportDef,
  type FilterDef,
} from '@/components/admin-kit';
import { AdminShell } from '@/components/admin-shell';
import { ImagePicker } from '@/components/image-picker';
import { api } from '@/lib/client';
import { PostStatus, readingMinutes, slugify, type BlogPost } from '@poozari/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';

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

const BLOG_CSV: CsvExportDef<BlogPost> = {
  name: 'blog',
  columns: [
    { header: 'ID', value: (post) => post.id },
    { header: 'Title', value: (post) => post.title },
    { header: 'Slug', value: (post) => post.slug },
    { header: 'URL', value: (post) => `/blog/${post.slug}` },
    { header: 'Status', value: (post) => (post.status === PostStatus.PUBLISHED ? 'Published' : 'Draft') },
    { header: 'Category', value: (post) => post.category },
    { header: 'Author', value: (post) => post.authorName },
    { header: 'Tags', value: (post) => post.tags.join('; ') },
    { header: 'Excerpt', value: (post) => post.excerpt },
    { header: 'Reading time (min)', value: (post) => readingMinutes(post.body) },
    { header: 'Cover image URL', value: (post) => post.coverImageUrl ?? '' },
    { header: 'Published', value: (post) => csvDate(post.publishedAt, true) },
    { header: 'Created', value: (post) => csvDate(post.createdAt, true) },
    { header: 'Last updated', value: (post) => csvDate(post.updatedAt, true) },
  ],
};

function formatDate(value?: string | null) {
  return value ? new Date(value).toLocaleDateString('en-IN') : null;
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState<BlogPost | null>(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setPosts(await api.adminListBlogPosts());
  }

  useEffect(() => {
    load()
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY);
    setFormError('');
  }, []);
  const closeView = useCallback(() => setViewing(null), []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY);
    setFormError('');
    setFormOpen(true);
  }

  function startEdit(post: BlogPost) {
    setViewing(null);
    setEditingId(post.id);
    setFormError('');
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
    setFormOpen(true);
  }

  async function save(status?: string) {
    setBusy(true);
    setFormError('');
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
      closeForm();
      await load();
    } catch (e: any) {
      setFormError(e.message ?? 'Could not save the post');
    } finally {
      setBusy(false);
    }
  }

  async function togglePublish(post: BlogPost) {
    setError('');
    setMsg('');
    try {
      await api.adminUpdateBlogPost(post.id, {
        status: post.status === PostStatus.PUBLISHED ? PostStatus.DRAFT : PostStatus.PUBLISHED,
      });
      setViewing(null);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not change the post status');
    }
  }

  async function remove(post: BlogPost) {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    setError('');
    setMsg('');
    try {
      await api.adminDeleteBlogPost(post.id);
      setMsg(`Deleted “${post.title}”.`);
      setViewing(null);
      if (editingId === post.id) closeForm();
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not delete the post');
    }
  }

  function openPublic(post: BlogPost) {
    window.open(`/blog/${post.slug}`, '_blank', 'noopener,noreferrer');
  }

  const categories = useMemo(
    () => Array.from(new Set(posts.map((p) => p.category).filter(Boolean))).sort(),
    [posts],
  );

  const columns: Column<BlogPost>[] = [
    {
      key: 'title',
      header: 'Post',
      render: (post) => (
        <div className="flex items-center gap-3">
          <Thumb src={post.coverImageUrl} label={post.title} />
          <div className="min-w-0">
            <div className="max-w-[280px] truncate font-bold text-foreground">{post.title}</div>
            <div className="max-w-[280px] truncate text-3xs text-muted-foreground">/blog/{post.slug}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (post) => <span className="badge bg-accent-soft text-accent">{post.category}</span>,
    },
    { key: 'author', header: 'Author', render: (post) => post.authorName || '—' },
    { key: 'read', header: 'Read', render: (post) => `${readingMinutes(post.body)} min` },
    {
      key: 'date',
      header: 'Published',
      render: (post) => formatDate(post.publishedAt) ?? '—',
    },
    {
      key: 'status',
      header: 'Status',
      render: (post) => (
        <StatusPill on={post.status === PostStatus.PUBLISHED} onLabel="Published" offLabel="Draft" />
      ),
    },
  ];

  const filters: FilterDef<BlogPost>[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: PostStatus.PUBLISHED, label: 'Published' },
        { value: PostStatus.DRAFT, label: 'Draft' },
      ],
      match: (post, v) => post.status === v,
    },
    {
      key: 'category',
      label: 'Category',
      options: categories.map((c) => ({ value: c, label: c })),
      match: (post, v) => post.category === v,
    },
  ];

  return (
    <AdminShell>
      <AdminPageHeader
        title="Blog"
        subtitle="Write, save as draft, and publish — no deploy needed."
        actions={
          <button className="btn-primary text-2xs uppercase tracking-wider" onClick={openCreate}>
            + Add post
          </button>
        }
      />

      <Notice error={error} message={msg} />

      <DataTable
        rows={posts}
        columns={columns}
        getRowId={(post) => post.id}
        loading={loading}
        searchText={(post) =>
          [post.title, post.slug, post.excerpt, post.category, post.authorName, ...post.tags].join(' ')
        }
        searchPlaceholder="Search title, slug, category, tag…"
        filters={filters}
        emptyText="No posts yet."
        csvExport={BLOG_CSV}
        onRowClick={setViewing}
        actions={(post) => (
          <>
            <ActionButton onClick={() => setViewing(post)}>View</ActionButton>
            <ActionButton tone="accent" onClick={() => startEdit(post)}>Edit</ActionButton>
            <ActionButton
              tone={post.status === PostStatus.PUBLISHED ? 'default' : 'success'}
              onClick={() => togglePublish(post)}
            >
              {post.status === PostStatus.PUBLISHED ? 'Unpublish' : 'Publish'}
            </ActionButton>
            <ActionButton tone="danger" onClick={() => remove(post)}>Delete</ActionButton>
          </>
        )}
      />

      {/* Details popup */}
      <Modal
        open={Boolean(viewing)}
        title={viewing?.title ?? ''}
        onClose={closeView}
        size="lg"
        footer={
          viewing ? (
            <>
              <button
                className="rounded-xl border border-red-200 px-3 py-1.5 text-2xs font-bold uppercase tracking-wider text-red-600 transition-colors hover:bg-red-50"
                onClick={() => remove(viewing)}
              >
                Delete
              </button>
              {viewing.status === PostStatus.PUBLISHED ? (
                <button className="btn-outline text-2xs uppercase tracking-wider" onClick={() => openPublic(viewing)}>
                  ↗ View on site
                </button>
              ) : null}
              <button className="btn-outline text-2xs uppercase tracking-wider" onClick={() => togglePublish(viewing)}>
                {viewing.status === PostStatus.PUBLISHED ? 'Unpublish' : 'Publish'}
              </button>
              <button className="btn-primary text-2xs uppercase tracking-wider" onClick={() => startEdit(viewing)}>
                Edit
              </button>
            </>
          ) : null
        }
      >
        {viewing ? (
          <div className="space-y-5">
            {viewing.coverImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={viewing.coverImageUrl}
                alt=""
                className="aspect-video w-full rounded-2xl object-cover"
              />
            ) : null}
            <DetailList
              items={[
                { label: 'Status', value: viewing.status === PostStatus.PUBLISHED ? 'Published' : 'Draft' },
                { label: 'URL', value: `/blog/${viewing.slug}` },
                { label: 'Category', value: viewing.category },
                { label: 'Author', value: viewing.authorName },
                { label: 'Tags', value: viewing.tags.join(', ') },
                { label: 'Reading time', value: `${readingMinutes(viewing.body)} min` },
                { label: 'Published', value: formatDate(viewing.publishedAt) },
                { label: 'Last updated', value: formatDate(viewing.updatedAt) },
                { label: 'Excerpt', value: viewing.excerpt },
              ]}
            />
            <div>
              <div className="text-3xs font-extrabold uppercase tracking-widest text-muted-foreground">
                Body (Markdown)
              </div>
              <pre className="mt-1 max-h-64 overflow-y-auto whitespace-pre-wrap rounded-2xl bg-gray-50 p-4 font-mono text-xs text-foreground">
                {viewing.body || '—'}
              </pre>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Create / edit popup */}
      <Modal
        open={formOpen}
        title={editingId ? 'Edit post' : 'Add post'}
        onClose={closeForm}
        size="lg"
        footer={
          <>
            <button className="btn-outline text-2xs uppercase tracking-wider" onClick={closeForm} disabled={busy}>
              Cancel
            </button>
            <button
              className="btn-outline text-2xs uppercase tracking-wider"
              onClick={() => save(PostStatus.DRAFT)}
              disabled={busy || !form.title}
            >
              {busy ? 'Saving…' : 'Save draft'}
            </button>
            <button
              className="btn-primary text-2xs uppercase tracking-widest"
              onClick={() => save(PostStatus.PUBLISHED)}
              disabled={busy || !form.title}
            >
              {busy ? 'Saving…' : 'Publish'}
            </button>
          </>
        }
      >
        <Notice error={formError} />
        <div className="space-y-4">
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
          <div className="grid gap-3 sm:grid-cols-2">
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
          <ImagePicker
            label="Cover image"
            hint="Shown on the blog listing and at the top of the post"
            value={form.coverImageUrl}
            onChange={(coverImageUrl) => setForm({ ...form, coverImageUrl })}
            aspect="16/9"
          />
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
          <div className="grid gap-3 sm:grid-cols-2">
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
        </div>
      </Modal>
    </AdminShell>
  );
}
