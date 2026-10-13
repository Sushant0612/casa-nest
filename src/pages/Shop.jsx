import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import ProductCard from '../components/ProductCard'
import Spinner from '../components/Spinner'

const SORTS = {
  newest: ['created_at', false, 'Newest'],
  price_asc: ['price', true, 'Price: low to high'],
  price_desc: ['price', false, 'Price: high to low'],
  name: ['name', true, 'Name A–Z'],
}

export default function Shop() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const category = params.get('category') || ''
  const sort = params.get('sort') || 'newest'

  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(q)

  useEffect(() => {
    setSearch(q)
  }, [q])

  useEffect(() => {
    supabase.from('categories').select('*').order('name').then(({ data }) => setCategories(data || []))
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      let query = supabase
        .from('products')
        .select(category ? '*, categories!inner(slug)' : '*')
        .eq('is_active', true)
      if (category) query = query.eq('categories.slug', category)
      const term = q.replace(/[,()%*]/g, ' ').trim()
      if (term) query = query.or(`name.ilike.%${term}%,description.ilike.%${term}%`)
      const [col, asc] = SORTS[sort] || SORTS.newest
      const { data, error } = await query.order(col, { ascending: asc })
      if (cancelled) return
      if (error) console.error(error)
      setProducts(data || [])
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [q, category, sort])

  const update = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next)
  }

  const activeCategory = categories.find((c) => c.slug === category)

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-semibold">{activeCategory ? activeCategory.name : 'All products'}</h1>
      {activeCategory?.description && <p className="mt-1 text-stone-500">{activeCategory.description}</p>}

      <div className="mt-8 grid gap-8 lg:grid-cols-[220px_1fr]">
        <aside className="space-y-6">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              update('q', search.trim())
            }}
          >
            <label className="label">Search</label>
            <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Sofa, bed, lamp…" />
          </form>

          <div>
            <p className="label">Category</p>
            <ul className="space-y-1 text-sm">
              <li>
                <button onClick={() => update('category', '')} className={`w-full rounded-md px-3 py-1.5 text-left ${!category ? 'bg-brand-100 font-semibold text-brand-800' : 'hover:bg-stone-100'}`}>
                  All
                </button>
              </li>
              {categories.map((c) => (
                <li key={c.id}>
                  <button onClick={() => update('category', c.slug)} className={`w-full rounded-md px-3 py-1.5 text-left ${category === c.slug ? 'bg-brand-100 font-semibold text-brand-800' : 'hover:bg-stone-100'}`}>
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="label">Sort by</label>
            <select className="input" value={sort} onChange={(e) => update('sort', e.target.value === 'newest' ? '' : e.target.value)}>
              {Object.entries(SORTS).map(([k, v]) => (
                <option key={k} value={k}>{v[2]}</option>
              ))}
            </select>
          </div>
        </aside>

        <section>
          {loading ? (
            <Spinner />
          ) : products.length === 0 ? (
            <div className="card p-10 text-center text-stone-500">No products match your filters.</div>
          ) : (
            <>
              <p className="mb-4 text-sm text-stone-500">{products.length} product{products.length > 1 && 's'}{q && <> for “{q}”</>}</p>
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  )
}
