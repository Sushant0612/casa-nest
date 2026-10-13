import { createContext, useContext, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

const WishlistContext = createContext(null)
export const useWishlist = () => useContext(WishlistContext)

export function WishlistProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id
  const [ids, setIds] = useState(new Set())

  useEffect(() => {
    if (!userId) {
      setIds(new Set())
      return
    }
    supabase
      .from('wishlist_items')
      .select('product_id')
      .eq('user_id', userId)
      .then(({ data }) => setIds(new Set((data || []).map((d) => d.product_id))))
  }, [userId])

  const toggle = async (productId) => {
    if (!userId) {
      toast('Sign in to save favourites')
      return
    }
    const has = ids.has(productId)
    setIds((prev) => {
      const next = new Set(prev)
      if (has) next.delete(productId)
      else next.add(productId)
      return next
    })
    const { error } = has
      ? await supabase.from('wishlist_items').delete().eq('user_id', userId).eq('product_id', productId)
      : await supabase.from('wishlist_items').insert({ user_id: userId, product_id: productId })
    if (error) toast.error(error.message)
  }

  return <WishlistContext.Provider value={{ ids, toggle }}>{children}</WishlistContext.Provider>
}
