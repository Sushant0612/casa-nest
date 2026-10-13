import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import ProductImage from '../../components/ProductImage'
import Spinner from '../../components/Spinner'
import { formatPrice, slugify } from '../../lib/format'

const blank = {
  name: '',
  slug: '',
  category_id: '',
  description: '',
  price: '',
  compare_at_price: '',
  stock: 0,
  image_url: '',
  images: '',
  material: '',
  dimensions: '',
  color: '',
  is_featured: false,
  is_active: true,
}

export default function AdminProducts() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)

  const load = async () => {
    const [p, c] = await Promise.all([
      supabase.from('products').select('*, category:categories(name)').order('created_at', { ascending: false }),
      supabase.from('categories').select('id, name').order('name'),
    ])
    setProducts(p.data || [])
    setCategories(c.data || [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const remove = async (p) => {
    if (!confirm(`Delete "${p.name}"? Past orders keep their line items.`)) return
    const { error } = await supabase.from('products').delete().eq('id', p.id)
    if (error) return toast.error(error.message)
    toast.success('Product deleted')
    load()
  }

  const toggleActive = async (p) => {
    const { error } = await supabase.from('products').update({ is_active: !p.is_active }).eq('id', p.id)
    if (error) return toast.error(error.message)
    setProducts((list) => list.map((x) => (x.id === p.id ? { ...x, is_active: !p.is_active } : x)))
  }

  const shown = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Products ({products.length})</h2>
        <div className="flex gap-3">
          <input className="input !w-56" placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn-primary" onClick={() => setEditing({ ...blank })}><Plus size={16} /> New product</button>
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {shown.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-12 shrink-0 overflow-hidden rounded bg-stone-100">
                        <ProductImage src={p.image_url} className="h-full w-full" />
                      </div>
                      <div>
                        <p className="font-medium">{p.name}</p>
                        {p.is_featured && <span className="text-xs text-brand-700">Featured</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-stone-500">{p.category?.name || '—'}</td>
                  <td className="px-4 py-3">{formatPrice(p.price)}</td>
                  <td className={`px-4 py-3 font-medium ${p.stock <= 5 ? 'text-amber-700' : ''}`}>{p.stock}</td>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={p.is_active} onChange={() => toggleActive(p)} aria-label="Active" />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-3">
                      <button onClick={() => setEditing({ ...p, images: (p.images || []).join('\n'), compare_at_price: p.compare_at_price ?? '' })} className="text-stone-600 hover:text-brand-700" aria-label="Edit"><Pencil size={16} /></button>
                      <button onClick={() => remove(p)} className="text-red-600 hover:text-red-700" aria-label="Delete"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ProductForm
          product={editing}
          categories={categories}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </div>
  )
}

function ProductForm({ product, categories, onClose, onSaved }) {
  const [f, setF] = useState(product)
  const [busy, setBusy] = useState(false)
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }))

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    const row = {
      name: f.name.trim(),
      slug: (f.slug || slugify(f.name)).trim(),
      category_id: f.category_id || null,
      description: f.description || null,
      price: Number(f.price),
      compare_at_price: f.compare_at_price === '' ? null : Number(f.compare_at_price),
      stock: Number(f.stock) || 0,
      image_url: f.image_url.trim() || null,
      images: String(f.images || '').split('\n').map((s) => s.trim()).filter(Boolean),
      material: f.material || null,
      dimensions: f.dimensions || null,
      color: f.color || null,
      is_featured: f.is_featured,
      is_active: f.is_active,
    }
    const { error } = f.id
      ? await supabase.from('products').update(row).eq('id', f.id)
      : await supabase.from('products').insert(row)
    setBusy(false)
    if (error) return toast.error(error.code === '23505' ? 'That slug is already used by another product' : error.message)
    toast.success('Product saved')
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4">
      <form onSubmit={save} className="card my-8 w-full max-w-2xl space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">{f.id ? 'Edit product' : 'New product'}</h3>
          <button type="button" onClick={onClose} aria-label="Close"><X /></button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Name</label>
            <input className="input" required value={f.name} onChange={(e) => { set('name', e.target.value); if (!f.id) set('slug', slugify(e.target.value)) }} />
          </div>
          <div>
            <label className="label">Slug (URL)</label>
            <input className="input" required value={f.slug} onChange={(e) => set('slug', slugify(e.target.value))} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={f.category_id || ''} onChange={(e) => set('category_id', e.target.value)}>
              <option value="">— None —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Stock</label>
            <input className="input" type="number" min="0" required value={f.stock} onChange={(e) => set('stock', e.target.value)} />
          </div>
          <div>
            <label className="label">Price (₹)</label>
            <input className="input" type="number" min="0" step="0.01" required value={f.price} onChange={(e) => set('price', e.target.value)} />
          </div>
          <div>
            <label className="label">Original price (₹, optional)</label>
            <input className="input" type="number" min="0" step="0.01" value={f.compare_at_price} onChange={(e) => set('compare_at_price', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="label">Main image URL</label>
          <input className="input" type="url" value={f.image_url || ''} onChange={(e) => set('image_url', e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <label className="label">More image URLs (one per line)</label>
          <textarea className="input" rows={3} value={f.images} onChange={(e) => set('images', e.target.value)} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={4} value={f.description || ''} onChange={(e) => set('description', e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="label">Material</label><input className="input" value={f.material || ''} onChange={(e) => set('material', e.target.value)} /></div>
          <div><label className="label">Dimensions</label><input className="input" value={f.dimensions || ''} onChange={(e) => set('dimensions', e.target.value)} /></div>
          <div><label className="label">Colour</label><input className="input" value={f.color || ''} onChange={(e) => set('color', e.target.value)} /></div>
        </div>

        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_featured} onChange={(e) => set('is_featured', e.target.checked)} /> Featured on home page</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_active} onChange={(e) => set('is_active', e.target.checked)} /> Visible in store</label>
        </div>

        <div className="flex justify-end gap-3 border-t border-stone-100 pt-4">
          <button type="button" className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save product'}</button>
        </div>
      </form>
    </div>
  )
}
