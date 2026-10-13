import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Package } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ProductImage from '../components/ProductImage'
import Spinner from '../components/Spinner'
import StatusBadge from '../components/StatusBadge'
import { formatDate, formatPrice } from '../lib/format'

export default function Orders() {
  const { user } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('orders')
      .select('*, order_items(id, product_name, image_url, quantity)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setOrders(data || [])
        setLoading(false)
      })
  }, [user.id])

  if (loading) return <Spinner full />

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-semibold">My orders</h1>

      {orders.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <Package className="mx-auto text-stone-300" size={48} />
          <p className="mt-3 font-medium">No orders yet</p>
          <Link to="/shop" className="btn-primary mt-5">Start shopping</Link>
        </div>
      ) : (
        <ul className="mt-8 space-y-4">
          {orders.map((o) => (
            <li key={o.id}>
              <Link to={`/orders/${o.id}`} className="card block p-5 transition hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{o.order_number}</p>
                    <p className="text-sm text-stone-500">Placed on {formatDate(o.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <StatusBadge status={o.status} />
                    <span className="font-bold">{formatPrice(o.total)}</span>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  {o.order_items.slice(0, 5).map((it) => (
                    <div key={it.id} className="h-14 w-16 overflow-hidden rounded-md bg-stone-100" title={`${it.product_name} × ${it.quantity}`}>
                      <ProductImage src={it.image_url} className="h-full w-full" />
                    </div>
                  ))}
                  {o.order_items.length > 5 && <span className="text-sm text-stone-500">+{o.order_items.length - 5} more</span>}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
