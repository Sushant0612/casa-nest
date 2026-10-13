import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { slugify } from '../../lib/format'

const blank = { name: '', slug: '', description: '', image_url: '' }

export default function AdminCategories() {
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('categories').select('*').order('name')
    setList(data || [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    const row = {
      name: form.name.trim(),
      slug: (form.slug || slugify(form.name)).trim(),
      description: form.description || null,
      image_url: form.image_url || null,
    }
    const { error } = form.id
      ? await supabase.from('categories').update(row).eq('id', form.id)
      : await supabase.from('categories').insert(row)
    setBusy(false)
    if (error) return toast.error(error.code === '23505' ? 'That slug is already in use' : error.message)
    toast.success('Category saved')
    setForm(blank)
    load()
  }

  const remove = async (c) => {
    if (!confirm(`Delete "${c.name}"? Its products will become uncategorised.`)) return
    const { error } = await supabase.from('categories').delete().eq('id', c.id)
    if (error) return toast.error(error.message)
    load()
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div>
        <h2 className="mb-4 text-xl font-semibold">Categories</h2>
        {loading ? (
          <Spinner />
        ) : (
          <ul className="card divide-y divide-stone-100">
            {list.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-stone-500">/{c.slug}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setForm(c)} className="text-stone-600 hover:text-brand-700" aria-label="Edit"><Pencil size={16} /></button>
                  <button onClick={() => remove(c)} className="text-red-600 hover:text-red-700" aria-label="Delete"><Trash2 size={16} /></button>
                </div>
              </li>
            ))}
            {list.length === 0 && <li className="p-6 text-center text-sm text-stone-500">No categories yet.</li>}
          </ul>
        )}
      </div>

      <form onSubmit={save} className="card h-fit space-y-3 p-5">
        <h3 className="font-semibold">{form.id ? 'Edit category' : 'Add category'}</h3>
        <div>
          <label className="label">Name</label>
          <input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, slug: form.id ? form.slug : slugify(e.target.value) })} />
        </div>
        <div>
          <label className="label">Slug</label>
          <input className="input" required value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
        </div>
        <div>
          <label className="label">Image URL</label>
          <input className="input" type="url" value={form.image_url || ''} onChange={(e) => setForm({ ...form, image_url: e.target.value })} />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={2} value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="flex gap-2">
          <button className="btn-primary flex-1" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          {form.id && <button type="button" className="btn-outline" onClick={() => setForm(blank)}>Cancel</button>}
        </div>
      </form>
    </div>
  )
}
