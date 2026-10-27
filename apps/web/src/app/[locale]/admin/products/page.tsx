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
  csvYesNo,
  type Column,
  type CsvExportDef,
  type FilterDef,
} from '@/components/admin-kit';
import { AdminShell } from '@/components/admin-shell';
import { MultiImagePicker } from '@/components/multi-image-picker';
import { VideoPicker } from '@/components/video-picker';
import { api } from '@/lib/client';
import { formatInr, type Product } from '@poozari/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';

const EMPTY_FORM = {
  name: '',
  slug: '',
  category: 'Puja Essentials',
  description: '',
  images: [] as string[],
  videoUrl: '',
  priceInr: '',
  stockQuantity: '0',
  isActive: true,
};

const PRODUCTS_CSV: CsvExportDef<Product> = {
  name: 'products',
  columns: [
    { header: 'ID', value: (p) => p.id },
    { header: 'Name', value: (p) => p.name },
    { header: 'Slug', value: (p) => p.slug },
    { header: 'Category', value: (p) => p.category },
    { header: 'Price (INR)', value: (p) => p.priceInr },
    { header: 'Stock', value: (p) => p.stockQuantity },
    { header: 'In stock', value: (p) => csvYesNo(p.stockQuantity > 0) },
    { header: 'Visible', value: (p) => csvYesNo(p.isActive) },
    { header: 'Image count', value: (p) => p.images?.length ?? 0 },
    { header: 'Cover image URL', value: (p) => p.imageUrl ?? p.images?.[0] },
    { header: 'Video URL', value: (p) => p.videoUrl },
    { header: 'Description', value: (p) => p.description },
    { header: 'Created', value: (p) => csvDate(p.createdAt) },
  ],
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setProducts(await api.adminListProducts());
  }

  useEffect(() => {
    load()
      .catch((e) => setError(e.message ?? 'Could not load products'))
      .finally(() => setLoading(false));
  }, []);

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }, []);
  const closeView = useCallback(() => setViewing(null), []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setFormOpen(true);
  }

  function startEdit(product: Product) {
    setViewing(null);
    setEditingId(product.id);
    setFormError('');
    setForm({
      name: product.name,
      slug: product.slug,
      category: product.category,
      description: product.description,
      images: product.images,
      videoUrl: product.videoUrl ?? '',
      priceInr: String(product.priceInr),
      stockQuantity: String(product.stockQuantity),
      isActive: product.isActive,
    });
    setFormOpen(true);
  }

  async function submit() {
    setBusy(true);
    setFormError('');
    setMessage('');
    try {
      const payload = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        category: form.category,
        description: form.description,
        images: form.images,
        videoUrl: form.videoUrl,
        priceInr: Number(form.priceInr),
        stockQuantity: Number(form.stockQuantity) || 0,
        isActive: form.isActive,
      };
      if (editingId) {
        await api.adminUpdateProduct(editingId, payload);
        setMessage('Product updated.');
      } else {
        await api.adminCreateProduct(payload);
        setMessage('Product added.');
      }
      closeForm();
      await load();
    } catch (e: any) {
      setFormError(e.message ?? 'Could not save product');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(product: Product) {
    setError('');
    setMessage('');
    try {
      await api.adminUpdateProduct(product.id, { isActive: !product.isActive });
      setViewing(null);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not update product');
    }
  }

  async function remove(product: Product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setError('');
    setMessage('');
    try {
      await api.adminDeleteProduct(product.id);
      setViewing(null);
      if (editingId === product.id) closeForm();
      setMessage(`Deleted "${product.name}".`);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not delete product');
    }
  }

  const categories = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter(Boolean))).sort(),
    [products],
  );

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product',
      render: (p) => (
        <div className="flex items-center gap-3">
          <Thumb src={p.imageUrl ?? p.images?.[0]} label={p.name ?? '?'} />
          <div className="min-w-0">
            <div className="font-bold text-foreground">{p.name}</div>
            <div className="text-3xs text-muted-foreground">/{p.slug}</div>
          </div>
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (p) => p.category || '—' },
    {
      key: 'price',
      header: 'Price',
      render: (p) => <span className="font-black text-accent">{formatInr(p.priceInr)}</span>,
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (p) =>
        p.stockQuantity > 0 ? (
          <span className="font-semibold text-foreground">{p.stockQuantity}</span>
        ) : (
          <span className="font-bold text-red-600">Out of stock</span>
        ),
    },
    {
      key: 'media',
      header: 'Media',
      render: (p) => `${p.images?.length ?? 0} img${p.videoUrl ? ' · video' : ''}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <StatusPill on={p.isActive} onLabel="Visible" offLabel="Hidden" />,
    },
  ];

  const filters: FilterDef<Product>[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'active', label: 'Visible' },
        { value: 'inactive', label: 'Hidden' },
      ],
      match: (p, v) => (v === 'active' ? p.isActive : !p.isActive),
    },
    {
      key: 'stock',
      label: 'Stock',
      options: [
        { value: 'in', label: 'In stock' },
        { value: 'out', label: 'Out of stock' },
      ],
      match: (p, v) => (v === 'in') === p.stockQuantity > 0,
    },
    {
      key: 'category',
      label: 'Category',
      options: categories.map((c) => ({ value: c, label: c })),
      match: (p, v) => p.category === v,
    },
  ];

  return (
    <AdminShell>
      <AdminPageHeader
        title="Products"
        subtitle="Add and manage rudraksha, havan samagri, puja kits, and other essentials."
        actions={
          <button className="btn-primary text-2xs uppercase tracking-wider" onClick={openCreate}>
            + Add product
          </button>
        }
      />

      <Notice error={error} message={message} />

      <DataTable
        rows={products}
        columns={columns}
        getRowId={(p) => p.id}
        loading={loading}
        searchText={(p) => [p.name, p.slug, p.category, p.description].join(' ')}
        searchPlaceholder="Search name, slug, category…"
        filters={filters}
        onRowClick={setViewing}
        emptyText="No products added yet."
        csvExport={PRODUCTS_CSV}
        actions={(p) => (
          <>
            <ActionButton onClick={() => setViewing(p)}>View</ActionButton>
            <ActionButton tone="accent" onClick={() => startEdit(p)}>Edit</ActionButton>
            <ActionButton tone={p.isActive ? 'default' : 'success'} onClick={() => toggleActive(p)}>
              {p.isActive ? 'Hide' : 'Show'}
            </ActionButton>
            <ActionButton tone="danger" onClick={() => remove(p)}>Delete</ActionButton>
          </>
        )}
      />

      {/* Details popup */}
      <Modal
        open={Boolean(viewing)}
        title={viewing?.name ?? ''}
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
              <button className="btn-outline text-2xs uppercase tracking-wider" onClick={() => toggleActive(viewing)}>
                {viewing.isActive ? 'Hide from website' : 'Show on website'}
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
            {viewing.images?.length ? (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {viewing.images.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={`${src}-${i}`}
                    src={src}
                    alt=""
                    className="h-32 w-32 shrink-0 rounded-2xl bg-accent-soft object-cover"
                  />
                ))}
              </div>
            ) : viewing.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={viewing.imageUrl} alt="" className="h-32 w-32 rounded-2xl bg-accent-soft object-cover" />
            ) : null}
            <DetailList
              items={[
                { label: 'Slug', value: `/${viewing.slug}` },
                { label: 'Category', value: viewing.category },
                { label: 'Price', value: formatInr(viewing.priceInr) },
                { label: 'Stock', value: viewing.stockQuantity > 0 ? `${viewing.stockQuantity} in stock` : 'Out of stock' },
                { label: 'Status', value: viewing.isActive ? 'Visible on website' : 'Hidden' },
                { label: 'Images', value: String(viewing.images?.length ?? 0) },
                {
                  label: 'Video',
                  value: viewing.videoUrl ? (
                    <a href={viewing.videoUrl} target="_blank" rel="noreferrer" className="text-accent underline">
                      Open video
                    </a>
                  ) : null,
                },
                { label: 'Description', value: viewing.description },
              ]}
            />
          </div>
        ) : null}
      </Modal>

      {/* Create / edit popup */}
      <Modal
        open={formOpen}
        title={editingId ? 'Edit product' : 'Add product'}
        onClose={closeForm}
        size="lg"
        footer={
          <>
            <button className="btn-outline text-2xs uppercase tracking-wider" onClick={closeForm}>
              Cancel
            </button>
            <button
              className="btn-primary text-2xs uppercase tracking-wider"
              onClick={submit}
              disabled={busy || !form.name || !form.slug || !form.category || Number(form.priceInr) <= 0}
            >
              {busy ? 'Saving…' : editingId ? 'Update product' : 'Add product'}
            </button>
          </>
        }
      >
        <Notice error={formError} />
        <div className="space-y-4">
          <div>
            <label className="label">Product name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: editingId ? form.slug : slugify(e.target.value) })} placeholder="e.g. Panchmukhi Rudraksha" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Slug *</label>
              <input className="input" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
            </div>
            <div>
              <label className="label">Category *</label>
              <input className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Rudraksha" />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <MultiImagePicker
            label="Product images"
            hint="The first image is the cover in the store listing · up to 10"
            value={form.images}
            onChange={(images) => setForm({ ...form, images })}
          />
          <VideoPicker
            label="Product video (optional)"
            hint="MP4, WebM or MOV up to 50 MB, or a YouTube link"
            value={form.videoUrl}
            onChange={(videoUrl) => setForm({ ...form, videoUrl })}
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Price (₹) *</label>
              <input className="input" type="number" min="1" value={form.priceInr} onChange={(e) => setForm({ ...form, priceInr: e.target.value })} />
            </div>
            <div>
              <label className="label">Stock quantity</label>
              <input className="input" type="number" min="0" value={form.stockQuantity} onChange={(e) => setForm({ ...form, stockQuantity: e.target.value })} />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2.5">
            <input type="checkbox" className="h-4 w-4 accent-accent" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Visible on website</span>
          </label>
        </div>
      </Modal>
    </AdminShell>
  );
}
