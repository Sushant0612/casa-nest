import { Link, useNavigate } from 'react-router-dom'
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import ProductImage from '../components/ProductImage'
import Spinner from '../components/Spinner'
import { FREE_SHIPPING_THRESHOLD, formatPrice } from '../lib/format'

export default function Cart() {
  const { user } = useAuth()
  const { items, loading, subtotal, shipping, total, setQty, removeItem } = useCart()
  const navigate = useNavigate()

  if (loading) return <Spinner full />

  if (items.length === 0)
    return (
      <div className="container-page py-24 text-center">
        <ShoppingBag className="mx-auto text-stone-300" size={56} />
        <h1 className="mt-4 text-2xl font-semibold">Your cart is empty</h1>
        <p className="mt-1 text-stone-500">Find something you love and it will show up here.</p>
        <Link to="/shop" className="btn-primary mt-6">Continue shopping</Link>
      </div>
    )

  const goCheckout = () => navigate(user ? '/checkout' : '/login', { state: { from: '/checkout' } })
  const remaining = FREE_SHIPPING_THRESHOLD - subtotal

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-semibold">Shopping cart</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <ul className="space-y-4">
          {items.map(({ product, quantity }) => (
            <li key={product.id} className="card flex gap-4 p-4">
              <Link to={`/product/${product.slug}`} className="h-24 w-28 shrink-0 overflow-hidden rounded-lg bg-stone-100">
                <ProductImage src={product.image_url} alt={product.name} className="h-full w-full" />
              </Link>
              <div className="flex flex-1 flex-col justify-between">
                <div className="flex justify-between gap-4">
                  <div>
                    <Link to={`/product/${product.slug}`} className="font-medium hover:text-brand-700">{product.name}</Link>
                    <p className="text-sm text-stone-500">{formatPrice(product.price)} each</p>
                  </div>
                  <p className="font-semibold">{formatPrice(product.price * quantity)}</p>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center rounded-lg border border-stone-300">
                    <button className="p-2" onClick={() => setQty(product, quantity - 1)} aria-label="Decrease"><Minus size={14} /></button>
                    <span className="w-8 text-center text-sm font-medium">{quantity}</span>
                    <button className="p-2" disabled={quantity >= product.stock} onClick={() => setQty(product, quantity + 1)} aria-label="Increase"><Plus size={14} /></button>
                  </div>
                  <button onClick={() => removeItem(product.id)} className="flex items-center gap-1 text-sm text-red-600 hover:underline">
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="card h-fit space-y-3 p-6">
          <h2 className="text-xl font-semibold">Order summary</h2>
          <div className="flex justify-between text-sm"><span className="text-stone-500">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
          <div className="flex justify-between text-sm">
            <span className="text-stone-500">Shipping</span>
            <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
          </div>
          {remaining > 0 && (
            <p className="rounded-lg bg-brand-50 p-3 text-xs text-brand-800">
              Add {formatPrice(remaining)} more for free delivery.
            </p>
          )}
          <div className="flex justify-between border-t border-stone-200 pt-3 text-lg font-bold">
            <span>Total</span><span>{formatPrice(total)}</span>
          </div>
          <button onClick={goCheckout} className="btn-primary w-full">
            {user ? 'Proceed to checkout' : 'Sign in to checkout'}
          </button>
          <Link to="/shop" className="block text-center text-sm text-stone-500 hover:text-brand-700">Continue shopping</Link>
        </aside>
      </div>
    </div>
  )
}
