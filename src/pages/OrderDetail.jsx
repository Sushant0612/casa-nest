import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Check, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import ProductImage from '../components/ProductImage'
import Spinner from '../components/Spinner'
import StatusBadge from '../components/StatusBadge'
import { formatDate, formatPrice } from '../lib/format'

const STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered']

export default function OrderDetail() {
  const { id } = useParams()
  const location = useLocation()
  const [order, setOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('orders').select('*, order_items(*)').eq('id', id).maybeSingle()
    setOrder(data)
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [id])

  const cancel = async () => {
    if (!confirm('Cancel this order?')) return
    setBusy(true)
    const { error } = await supabase.rpc('cancel_order', { p_order_id: id })
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success('Order cancelled')
    load()
  }

  if (loading) return <Spinner full />
  if (!order)
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-semibold">Order not found</h1>
        <Link to="/orders" className="btn-primary mt-6">My orders</Link>
      </div>
    )

  const a = order.shipping_address
  const stepIndex = STEPS.indexOf(order.status)
  const canCancel = ['pending', 'confirmed'].includes(order.status)

  return (
    <div className="container-page max-w-4xl py-10">
      {location.state?.placed && (
        <div className="mb-6 flex items-center gap-3 rounded-xl bg-green-50 p-4 text-green-800">
          <CheckCircle2 />
          <div>
            <p className="font-semibold">Thank you! Your order has been placed.</p>
            <p className="text-sm">We'll confirm it shortly. You can track it right here.</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/orders" className="text-sm text-brand-700 hover:underline">← All orders</Link>
          <h1 className="mt-1 text-3xl font-semibold">{order.order_number}</h1>
          <p className="text-sm text-stone-500">Placed on {formatDate(order.created_at)}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {order.status !== 'cancelled' ? (
        <ol className="card mt-6 flex justify-between p-6">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 flex-col items-center text-center">
              <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i <= stepIndex ? 'bg-brand-600 text-white' : 'bg-stone-200 text-stone-500'}`}>
                {i <= stepIndex ? <Check size={16} /> : i + 1}
              </span>
              <span className={`mt-2 text-xs capitalize ${i <= stepIndex ? 'font-semibold text-stone-800' : 'text-stone-400'}`}>{s}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">This order was cancelled.</p>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_300px]">
        <section className="card divide-y divide-stone-100 p-2">
          {order.order_items.map((it) => (
            <div key={it.id} className="flex items-center gap-4 p-3">
              <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                <ProductImage src={it.image_url} className="h-full w-full" />
              </div>
              <div className="flex-1 text-sm">
                <p className="font-medium">{it.product_name}</p>
                <p className="text-stone-500">{formatPrice(it.unit_price)} × {it.quantity}</p>
              </div>
              <p className="font-semibold">{formatPrice(it.line_total)}</p>
            </div>
          ))}
        </section>

        <aside className="space-y-4">
          <div className="card space-y-2 p-5 text-sm">
            <div className="flex justify-between"><span className="text-stone-500">Subtotal</span><span>{formatPrice(order.subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Shipping</span><span>{Number(order.shipping_fee) === 0 ? 'Free' : formatPrice(order.shipping_fee)}</span></div>
            <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-bold"><span>Total</span><span>{formatPrice(order.total)}</span></div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-stone-500">Payment ({order.payment_method === 'cod' ? 'Cash on delivery' : 'Online'})</span>
              <StatusBadge status={order.payment_status} />
            </div>
          </div>

          <div className="card p-5 text-sm">
            <p className="mb-1 font-semibold">Delivering to</p>
            <p>{a.full_name}</p>
            <p className="text-stone-600">{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
            <p className="text-stone-600">{a.city}, {a.state} {a.postal_code}</p>
            <p className="text-stone-500">{a.phone}</p>
          </div>

          {order.notes && (
            <div className="card p-5 text-sm">
              <p className="mb-1 font-semibold">Notes</p>
              <p className="text-stone-600">{order.notes}</p>
            </div>
          )}

          {canCancel && (
            <button onClick={cancel} disabled={busy} className="btn-outline w-full !border-red-300 !text-red-700 hover:!bg-red-50">
              {busy ? 'Cancelling…' : 'Cancel order'}
            </button>
          )}
        </aside>
      </div>
    </div>
  )
}
