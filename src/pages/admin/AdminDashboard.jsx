import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import StatusBadge from '../../components/StatusBadge'
import { formatDate, formatPrice } from '../../lib/format'

export default function AdminDashboard() {
  const [data, setData] = useState(null)

  useEffect(() => {
    ;(async () => {
      const [orders, products, users, low] = await Promise.all([
        supabase
          .from('orders')
          .select('id, order_number, total, status, created_at, shipping_address')
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase.from('products').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('products').select('id, name, stock').lte('stock', 5).order('stock').limit(8),
      ])
      setData({
        orders: orders.data || [],
        productCount: products.count || 0,
        userCount: users.count || 0,
        low: low.data || [],
      })
    })()
  }, [])

  if (!data) return <Spinner />

  const live = data.orders.filter((o) => o.status !== 'cancelled')
  const revenue = live.reduce((n, o) => n + Number(o.total), 0)
  const pending = data.orders.filter((o) => o.status === 'pending').length

  const stats = [
    ['Revenue', formatPrice(revenue)],
    ['Orders', data.orders.length],
    ['Pending orders', pending],
    ['Products', data.productCount],
    ['Customers & staff', data.userCount],
  ]

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {stats.map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-xs text-stone-500">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent orders</h2>
            <Link to="/admin/orders" className="text-sm text-brand-700 hover:underline">View all</Link>
          </div>
          {data.orders.length === 0 ? (
            <p className="text-sm text-stone-500">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-stone-100 text-sm">
              {data.orders.slice(0, 6).map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <Link to={`/orders/${o.id}`} className="font-medium hover:text-brand-700">{o.order_number}</Link>
                    <p className="text-xs text-stone-500">{o.shipping_address?.full_name} · {formatDate(o.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={o.status} />
                    <span className="w-20 text-right font-semibold">{formatPrice(o.total)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 text-lg font-semibold">Low stock</h2>
          {data.low.length === 0 ? (
            <p className="text-sm text-stone-500">All products are well stocked.</p>
          ) : (
            <ul className="divide-y divide-stone-100 text-sm">
              {data.low.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2">
                  <span className="truncate pr-2">{p.name}</span>
                  <span className={`font-semibold ${p.stock === 0 ? 'text-red-600' : 'text-amber-700'}`}>{p.stock}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}
