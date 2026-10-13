import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import Spinner from '../../components/Spinner'
import { formatDate, formatPrice } from '../../lib/format'

const STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled']
const PAYMENT = ['pending', 'paid', 'failed', 'refunded']

export default function AdminOrders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')

  const load = async () => {
    setLoading(true)
    let q = supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(200)
    if (filter) q = q.eq('status', filter)
    const { data } = await q
    setOrders(data || [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [filter])

  const update = async (order, patch) => {
    // Cash-on-delivery orders are paid once delivered
    if (patch.status === 'delivered' && order.payment_method === 'cod' && order.payment_status === 'pending') {
      patch = { ...patch, payment_status: 'paid' }
    }
    const { error } = await supabase.from('orders').update(patch).eq('id', order.id)
    if (error) return toast.error(error.message)
    toast.success('Order updated')
    setOrders((list) => list.map((o) => (o.id === order.id ? { ...o, ...patch } : o)))
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Orders</h2>
        <select className="input !w-auto" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <Spinner />
      ) : orders.length === 0 ? (
        <div className="card p-10 text-center text-stone-500">No orders found.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Payment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-3 font-medium">
                    <Link to={`/orders/${o.id}`} className="text-brand-700 hover:underline">{o.order_number}</Link>
                  </td>
                  <td className="px-4 py-3">
                    {o.shipping_address?.full_name}
                    <p className="text-xs text-stone-500">{o.shipping_address?.city}</p>
                  </td>
                  <td className="px-4 py-3 text-stone-500">{formatDate(o.created_at)}</td>
                  <td className="px-4 py-3 font-semibold">{formatPrice(o.total)}</td>
                  <td className="px-4 py-3">
                    <select className="input !py-1.5 capitalize" value={o.status} onChange={(e) => update(o, { status: e.target.value })}>
                      {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <select className="input !py-1.5 capitalize" value={o.payment_status} onChange={(e) => update(o, { payment_status: e.target.value })}>
                      {PAYMENT.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
