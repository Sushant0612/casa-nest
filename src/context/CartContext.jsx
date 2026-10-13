import { createContext,useCallback,useContext,useEffect,useMemo,useRef,useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '../lib/format'

const CartContext = createContext(null)
export const useCart = () => useContext(CartContext)

// Guests keep their cart in localStorage; it is merged into the database cart on sign-in.
const KEY = 'cn_guest_cart'

const readGuest = () => {
  try {
    if (typeof window === 'undefined') return []

    const parsed = JSON.parse(window.localStorage.getItem(KEY) || '[]')
    if (!Array.isArray(parsed)) return []

    return parsed
      .map((item) => ({
        product_id: item?.product_id,
        quantity: Math.floor(Number(item?.quantity)),
      }))
      .filter(
        (item) =>
          item.product_id != null &&
          Number.isFinite(item.quantity) &&
          item.quantity > 0,
      )
  } catch {
    return []
  }
}

const writeGuest = (list) => {
  try {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(KEY, JSON.stringify(list))
    }
  } catch {
    // Storage can be unavailable in private browsing or restricted environments.
  }
}

async function loadGuestItems() {
  const stored = readGuest()
  if (!stored.length) return []

  // Combine duplicate product IDs so each product appears only once in the cart.
  const quantities = new Map()
  for (const item of stored) {
    quantities.set(
      item.product_id,
      (quantities.get(item.product_id) || 0) + item.quantity,
    )
  }

  const ids = [...quantities.keys()]
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .in('id', ids)

  if (error) throw error

  const productsById = new Map((data || []).map((product) => [product.id, product]))

  return [...quantities.entries()]
    .map(([productId, quantity]) => ({
      product_id: productId,
      quantity,
      product: productsById.get(productId),
    }))
    .filter((item) => item.product)
}

async function getCartId(userId) {
  const { data: existing, error: selectError } = await supabase
    .from('carts')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle()

  if (selectError) throw selectError
  if (existing?.id) return existing.id

  const { data: created, error: insertError } = await supabase
    .from('carts')
    .insert({ user_id: userId })
    .select('id')
    .single()

  // If another request created the cart at the same time, read it again.
  if (insertError) {
    if (insertError.code === '23505') {
      const { data: retried, error: retryError } = await supabase
        .from('carts')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle()

      if (retryError) throw retryError
      if (retried?.id) return retried.id
    }

    throw insertError
  }

  return created.id
}

export function CartProvider({ children }) {
  const { user } = useAuth()
  const userId = user?.id

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const cartIdRef = useRef(null)
  const refreshIdRef = useRef(0)

  const refresh = useCallback(async () => {
    const requestId = ++refreshIdRef.current
    setLoading(true)
    cartIdRef.current = null

    try {
      if (!userId) {
        const guestItems = await loadGuestItems()
        if (requestId === refreshIdRef.current) setItems(guestItems)
        return
      }

      const cartId = await getCartId(userId)
      if (!cartId) throw new Error('Could not find or create a cart.')
      if (requestId !== refreshIdRef.current) return
      cartIdRef.current = cartId

      // Merge the guest cart into the signed-in user's cart once.
      const guest = readGuest()
      if (guest.length) {
        const guestTotals = new Map()
        for (const item of guest) {
          guestTotals.set(
            item.product_id,
            (guestTotals.get(item.product_id) || 0) + item.quantity,
          )
        }

        const guestProductIds = [...guestTotals.keys()]
        const [existingResult, productsResult] = await Promise.all([
          supabase
            .from('cart_items')
            .select('product_id,quantity')
            .eq('cart_id', cartId),
          supabase
            .from('products')
            .select('id,stock')
            .in('id', guestProductIds),
        ])

        if (existingResult.error) throw existingResult.error
        if (productsResult.error) throw productsResult.error
        if (requestId !== refreshIdRef.current) return

        const existingQuantities = new Map(
          (existingResult.data || []).map((item) => [
            item.product_id,
            Number(item.quantity) || 0,
          ]),
        )
        const productsById = new Map(
          (productsResult.data || []).map((product) => [product.id, product]),
        )

        const rows = [...guestTotals.entries()]
          .map(([productId, guestQuantity]) => {
            const product = productsById.get(productId)
            const stock = Math.max(0, Math.floor(Number(product?.stock) || 0))
            if (!product || stock === 0) return null

            const quantity = Math.min(
              stock,
              (existingQuantities.get(productId) || 0) + guestQuantity,
            )

            return quantity > 0
              ? { cart_id: cartId, product_id: productId, quantity }
              : null
          })
          .filter(Boolean)

        if (rows.length) {
          const { error: mergeError } = await supabase
            .from('cart_items')
            .upsert(rows, { onConflict: 'cart_id,product_id' })

          if (mergeError) throw mergeError
        }

        if (requestId !== refreshIdRef.current) return
        writeGuest([])
      }

      const { data, error } = await supabase
        .from('cart_items')
        .select('product_id,quantity,product:products(*)')
        .eq('cart_id', cartId)
        .order('created_at')

      if (error) throw error
      if (requestId === refreshIdRef.current) {
        setItems((data || []).filter((item) => item.product))
      }
    } catch (error) {
      console.error('Unable to refresh cart:', error)
      if (requestId === refreshIdRef.current) {
        toast.error('Unable to load your cart. Please try again.')
      }
    } finally {
      if (requestId === refreshIdRef.current) setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    refresh()
    return () => {
      // Ignore results from a request started by the previous user/session.
      refreshIdRef.current += 1
    }
  }, [refresh])

  const removeItem = useCallback(
    async (productId) => {
      const previousItems = items
      setItems((current) => current.filter((item) => item.product_id !== productId))

      try {
        if (userId) {
          const cartId = cartIdRef.current || (await getCartId(userId))
          if (!cartId) throw new Error('Could not find or create a cart.')

          const { error } = await supabase
            .from('cart_items')
            .delete()
            .eq('cart_id', cartId)
            .eq('product_id', productId)

          if (error) throw error
        } else {
          writeGuest(readGuest().filter((item) => item.product_id !== productId))
        }
        return true
      } catch (error) {
        console.error('Unable to remove cart item:', error)
        toast.error('Could not remove this item. Please try again.')
        setItems(previousItems)
        await refresh()
        return false
      }
    },
    [items, refresh, userId],
  )

  const setQty = useCallback(
    async (product, requestedQty) => {
      const quantity = Math.floor(Number(requestedQty))
      if (!Number.isFinite(quantity)) {
        toast.error('Enter a valid quantity.')
        return false
      }
      if (quantity <= 0) return removeItem(product.id)

      const stock = Math.max(0, Math.floor(Number(product?.stock) || 0))
      if (stock <= 0) {
        toast.error('Sorry, this item is out of stock.')
        return false
      }

      const safeQty = Math.min(quantity, stock)
      const previousItems = items
      setItems((current) =>
        current.some((item) => item.product_id === product.id)
          ? current.map((item) =>
              item.product_id === product.id
                ? { ...item, quantity: safeQty, product }
                : item,
            )
          : [...current, { product_id: product.id, quantity: safeQty, product }],
      )

      try {
        if (userId) {
          const cartId = cartIdRef.current || (await getCartId(userId))
          if (!cartId) throw new Error('Could not find or create a cart.')
          cartIdRef.current = cartId

          const { error } = await supabase
            .from('cart_items')
            .upsert(
              { cart_id: cartId, product_id: product.id, quantity: safeQty },
              { onConflict: 'cart_id,product_id' },
            )

          if (error) throw error
        } else {
          const nextGuest = readGuest().filter(
            (item) => item.product_id !== product.id,
          )
          nextGuest.push({ product_id: product.id, quantity: safeQty })
          writeGuest(nextGuest)
        }

        return true
      } catch (error) {
        console.error('Unable to update cart quantity:', error)
        toast.error('Could not update the quantity. Please try again.')
        setItems(previousItems)
        await refresh()
        return false
      }
    },
    [items, refresh, removeItem, userId],
  )

  const addItem = useCallback(
    async (product, requestedQty = 1) => {
      const stock = Math.max(0, Math.floor(Number(product?.stock) || 0))
      const quantityToAdd = Math.floor(Number(requestedQty))

      if (stock <= 0) {
        toast.error('Sorry, this item is out of stock.')
        return false
      }
      if (!Number.isFinite(quantityToAdd) || quantityToAdd <= 0) {
        toast.error('Enter a valid quantity.')
        return false
      }

      const currentQty =
        Number(items.find((item) => item.product_id === product.id)?.quantity) || 0
      const remaining = stock - currentQty

      if (remaining <= 0) {
        toast.error(`Only ${stock} in stock.`)
        return false
      }

      const actualQty = Math.min(quantityToAdd, remaining)
      const succeeded = await setQty(product, currentQty + actualQty)

      if (!succeeded) return false

      if (actualQty < quantityToAdd) {
        toast.success(`Added ${actualQty}. Only ${stock} total in stock.`)
      } else {
        toast.success('Added to cart.')
      }

      return true
    },
    [items, setQty],
  )

  const value = useMemo(() => {
    const count = items.reduce(
      (total, item) => total + (Number(item.quantity) || 0),
      0,
    )
    const subtotal = items.reduce(
      (total, item) =>
        total + (Number(item.product?.price) || 0) * (Number(item.quantity) || 0),
      0,
    )
    const shipping =
      items.length === 0 || subtotal >= FREE_SHIPPING_THRESHOLD
        ? 0
        : SHIPPING_FEE

    return {items,loading,count,subtotal,shipping,total: subtotal + shipping,}
  }, [items, loading])

  return (
    <CartContext.Provider
      value={{ ...value, addItem, setQty, removeItem, refresh }}
    >
      {children}
    </CartContext.Provider>
  )
}
