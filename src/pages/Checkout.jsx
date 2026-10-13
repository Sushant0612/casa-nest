import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import AddressFields, { emptyAddress } from '../components/AddressFields'
import ProductImage from '../components/ProductImage'
import Spinner from '../components/Spinner'
import { formatPrice } from '../lib/format'

const pickAddress = (a) => ({
  label: a.label,
  full_name: a.full_name,
  phone: a.phone,
  line1: a.line1,
  line2: a.line2 || '',
  city: a.city,
  state: a.state,
  postal_code: a.postal_code,
  country: a.country || 'India',
})

export default function Checkout() {
  const { user, profile } = useAuth()
  const { items, loading, subtotal, shipping, total, refresh } = useCart()
  const navigate = useNavigate()

  const [addresses, setAddresses] = useState([])
  const [addrLoading, setAddrLoading] = useState(true)
  const [selected, setSelected] = useState('new')
  const [form, setForm] = useState(emptyAddress)
  const [saveAddress, setSaveAddress] = useState(true)
  const [notes, setNotes] = useState('')
  const [placing, setPlacing] = useState(false)

  useEffect(() => {
    if (!user) return
    supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at')
      .then(({ data }) => {
        const list = data || []
        setAddresses(list)
        setSelected(list[0]?.id || 'new')
        setAddrLoading(false)
      })
  }, [user])

  useEffect(() => {
    if (profile) {
      setForm((f) => ({ ...f, full_name: f.full_name || profile.full_name || '', phone: f.phone || profile.phone || '' }))
    }
  }, [profile])

  if (loading || addrLoading) return <Spinner full />
  if (items.length === 0) return <Navigate to="/cart" replace />

  const placeOrder = async (e) => {
    e.preventDefault()
    const address = selected === 'new' ? form : addresses.find((a) => a.id === selected)
    if (!address) return toast.error('Please choose a delivery address')

    setPlacing(true)
    try {
      if (selected === 'new' && saveAddress) {
        await supabase.from('addresses').insert({
          ...pickAddress(form),
          user_id: user.id,
          is_default: addresses.length === 0,
        })
      }
      const { data, error } = await supabase.rpc('place_order', {
        p_address: pickAddress(address),
        p_payment_method: 'cod',
        p_notes: notes,
      })
      if (error) throw error
      await refresh()
      toast.success('Order placed!')
      navigate(`/orders/${data}`, { state: { placed: true }, replace: true })
    } catch (err) {
      toast.error(err.message || 'Could not place your order')
      refresh() // stock may have changed
    } finally {
      setPlacing(false)
    }
  }

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-semibold">Checkout</h1>

      <form onSubmit={placeOrder} className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="text-xl font-semibold">Delivery address</h2>
            <div className="mt-4 space-y-3">
              {addresses.map((a) => (
                <label key={a.id} className={`flex cursor-pointer gap-3 rounded-lg border p-4 ${selected === a.id ? 'border-brand-500 bg-brand-50' : 'border-stone-200'}`}>
                  <input type="radio" name="address" checked={selected === a.id} onChange={() => setSelected(a.id)} className="mt-1" />
                  <div className="text-sm">
                    <p className="font-semibold">{a.full_name} <span className="ml-1 rounded bg-stone-100 px-1.5 py-0.5 text-xs font-medium">{a.label}</span></p>
                    <p className="text-stone-600">{a.line1}{a.line2 ? `, ${a.line2}` : ''}, {a.city}, {a.state} {a.postal_code}</p>
                    <p className="text-stone-500">{a.phone}</p>
                  </div>
                </label>
              ))}
              <label className={`flex cursor-pointer gap-3 rounded-lg border p-4 ${selected === 'new' ? 'border-brand-500 bg-brand-50' : 'border-stone-200'}`}>
                <input type="radio" name="address" checked={selected === 'new'} onChange={() => setSelected('new')} className="mt-1" />
                <span className="text-sm font-semibold">Use a new address</span>
              </label>
            </div>

            {selected === 'new' && (
              <div className="mt-5">
                <AddressFields value={form} onChange={setForm} />
                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} />
                  Save this address to my profile
                </label>
              </div>
            )}
          </section>

          <section className="card p-6">
            <h2 className="text-xl font-semibold">Payment</h2>
            <div className="mt-4 space-y-3">
              <label className="flex gap-3 rounded-lg border border-brand-500 bg-brand-50 p-4 text-sm">
                <input type="radio" checked readOnly className="mt-1" />
                <div>
                  <p className="font-semibold">Cash on delivery</p>
                  <p className="text-stone-500">Pay when your order arrives.</p>
                </div>
              </label>
              <label className="flex gap-3 rounded-lg border border-stone-200 p-4 text-sm opacity-60">
                <input type="radio" disabled className="mt-1" />
                <div>
                  <p className="font-semibold">UPI / Card / Netbanking</p>
                  <p className="text-stone-500">Online payments are coming soon.</p>
                </div>
              </label>
            </div>
          </section>

          <section className="card p-6">
            <label className="label" htmlFor="notes">Order notes (optional)</label>
            <textarea id="notes" className="input" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Delivery instructions, preferred time…" />
          </section>
        </div>

        <aside className="card h-fit space-y-4 p-6">
          <h2 className="text-xl font-semibold">Your order</h2>
          <ul className="divide-y divide-stone-100">
            {items.map(({ product, quantity }) => (
              <li key={product.id} className="flex items-center gap-3 py-3">
                <div className="h-14 w-16 shrink-0 overflow-hidden rounded-md bg-stone-100">
                  <ProductImage src={product.image_url} alt="" className="h-full w-full" />
                </div>
                <div className="flex-1 text-sm">
                  <p className="font-medium leading-tight">{product.name}</p>
                  <p className="text-stone-500">Qty {quantity}</p>
                </div>
                <p className="text-sm font-semibold">{formatPrice(product.price * quantity)}</p>
              </li>
            ))}
          </ul>
          <div className="space-y-2 border-t border-stone-200 pt-3 text-sm">
            <div className="flex justify-between"><span className="text-stone-500">Subtotal</span><span>{formatPrice(subtotal)}</span></div>
            <div className="flex justify-between"><span className="text-stone-500">Shipping</span><span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span></div>
            <div className="flex justify-between pt-1 text-lg font-bold"><span>Total</span><span>{formatPrice(total)}</span></div>
          </div>
          <button className="btn-primary w-full" disabled={placing}>{placing ? 'Placing order…' : 'Place order'}</button>
          <Link to="/cart" className="block text-center text-sm text-stone-500 hover:text-brand-700">Back to cart</Link>
        </aside>
      </form>
    </div>
  )
}
