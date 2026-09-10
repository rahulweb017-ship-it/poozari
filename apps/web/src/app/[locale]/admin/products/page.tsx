'use client';

import { AdminShell } from '@/components/admin-shell';
import { ImagePicker } from '@/components/image-picker';
import { api } from '@/lib/client';
import { formatInr, type Product } from '@poozari/shared';
import { useEffect, useState } from 'react';

const EMPTY_FORM = {
  name: '',
  slug: '',
  category: 'Puja Essentials',
  description: '',
  imageUrl: '',
  priceInr: '',
  stockQuantity: '0',
  isActive: true,
};

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    setProducts(await api.adminListProducts());
  }

  useEffect(() => {
    load().catch((e) => setError(e.message ?? 'Could not load products'));
  }, []);

  function resetForm(clearMessage = true) {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    if (clearMessage) setMessage('');
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setMessage('');
    setError('');
    setForm({
      name: product.name,
      slug: product.slug,
      category: product.category,
      description: product.description,
      imageUrl: product.imageUrl ?? '',
      priceInr: String(product.priceInr),
      stockQuantity: String(product.stockQuantity),
      isActive: product.isActive,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const payload = {
        name: form.name,
        slug: form.slug || slugify(form.name),
        category: form.category,
        description: form.description,
        imageUrl: form.imageUrl || undefined,
        priceInr: Number(form.priceInr),
        stockQuantity: Number(form.stockQuantity) || 0,
        isActive: form.isActive,
      };
      if (editingId) {
        await api.adminUpdateProduct(editingId, payload);
        resetForm(false);
        setMessage('Product updated.');
      } else {
        await api.adminCreateProduct(payload);
        resetForm(false);
        setMessage('Product added.');
      }
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not save product');
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(product: Product) {
    setError('');
    try {
      await api.adminUpdateProduct(product.id, { isActive: !product.isActive });
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not update product');
    }
  }

  async function remove(product: Product) {
    if (!window.confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setError('');
    try {
      await api.adminDeleteProduct(product.id);
      if (editingId === product.id) resetForm(false);
      setMessage(`Deleted "${product.name}".`);
      await load();
    } catch (e: any) {
      setError(e.message ?? 'Could not delete product');
    }
  }

  return (
    <AdminShell>
      <div className="mb-8 border-b pb-6" style={{ borderColor: 'hsl(var(--border) / 0.5)' }}>
        <h1 className="font-display text-2xl font-black uppercase tracking-wider text-accent">Products</h1>
        <p className="mt-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Add and manage rudraksha, havan samagri, puja kits, and other essentials.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card self-start bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
              {editingId ? '✏️ Edit Product' : '📦 Add Product'}
            </h2>
            {editingId ? <button className="text-2xs font-bold uppercase tracking-wider text-accent" onClick={() => resetForm()}>+ New</button> : null}
          </div>
          {error ? <p className="mt-4 rounded-2xl bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}
          {message ? <p className="mt-4 rounded-2xl bg-green-50 p-3 text-xs text-green-700">{message}</p> : null}

          <div className="mt-5 space-y-4">
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
            <ImagePicker
              label="Product image"
              hint="Shown in the store listing and on the product page"
              value={form.imageUrl}
              onChange={(imageUrl) => setForm({ ...form, imageUrl })}
              aspect="1/1"
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
            <button className="btn-primary w-full" onClick={submit} disabled={busy || !form.name || !form.slug || !form.category || Number(form.priceInr) <= 0}>
              {busy ? 'Saving…' : editingId ? 'Update product' : 'Add product'}
            </button>
          </div>
        </section>

        <section>
          <h2 className="font-display text-sm font-bold uppercase tracking-widest text-foreground">
            Product Catalog ({products.length})
          </h2>
          <div className="mt-5 space-y-3">
            {products.map((product) => (
              <article key={product.id} className="card bg-white p-4">
                <div className="flex gap-4">
                  <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-accent-soft">
                    {product.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.imageUrl} alt="" className="h-full w-full object-cover" />
                    ) : <div className="flex h-full items-center justify-center text-3xl">🪔</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-foreground">{product.name}</h3>
                        <p className="mt-0.5 text-2xs font-semibold text-muted-foreground">{product.category} · /{product.slug}</p>
                      </div>
                      <span className={`badge ${product.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                        {product.isActive ? 'Visible' : 'Hidden'}
                      </span>
                    </div>
                    <div className="mt-2 flex gap-4 text-xs">
                      <span className="font-black text-accent">{formatInr(product.priceInr)}</span>
                      <span className="font-semibold text-muted-foreground">{product.stockQuantity} in stock</span>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t pt-3" style={{ borderColor: 'hsl(var(--border) / 0.4)' }}>
                  <button className="btn-outline text-2xs" onClick={() => startEdit(product)}>✏️ Edit</button>
                  <button className="btn-outline text-2xs" onClick={() => toggleActive(product)}>{product.isActive ? 'Hide' : 'Show'}</button>
                  <button className="rounded-xl border border-red-200 px-3 py-1.5 text-2xs font-bold uppercase text-red-600 hover:bg-red-50" onClick={() => remove(product)}>🗑 Delete</button>
                </div>
              </article>
            ))}
            {!products.length ? <div className="card bg-white p-10 text-center text-xs font-bold uppercase tracking-wider text-muted-foreground">No products added yet.</div> : null}
          </div>
        </section>
      </div>
    </AdminShell>
  );
}
