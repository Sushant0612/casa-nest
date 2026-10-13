import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useWishlist } from '../context/WishlistContext'
import ProductCard from '../components/ProductCard'
import Spinner from '../components/Spinner'

export default function Wishlist() {
  const { user } = useAuth()
  const { ids } = useWishlist()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('wishlist_items')
      .select('created_at, product:products(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setProducts((data || []).map((d) => d.product).filter((p) => p && p.is_active))
        setLoading(false)
      })
  }, [user.id])

  if (loading) return <Spinner full />

  // hide items the user un-favourites on this page
  const visible = products.filter((p) => ids.has(p.id))

  return (
    <div className="container-page py-10">
      <h1 className="text-3xl font-semibold">Favourites</h1>
      {visible.length === 0 ? (
        <div className="card mt-8 p-12 text-center">
          <Heart className="mx-auto text-stone-300" size={48} />
          <p className="mt-3 font-medium">Nothing saved yet</p>
          <p className="text-sm text-stone-500">Tap the heart on any product to save it here.</p>
          <Link to="/shop" className="btn-primary mt-5">Browse products</Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {visible.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  )
}
