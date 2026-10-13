import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import {Heart,Minus,Plus,ShoppingCart,Star,Truck,} from 'lucide-react'

import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import ProductImage from '../components/ProductImage'
import Rating from '../components/Rating'
import Spinner from '../components/Spinner'

import { FREE_SHIPPING_THRESHOLD, formatDate, formatPrice, } from '../lib/format'

export default function ProductDetail() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { addItem } = useCart()
  const { ids, toggle } = useWishlist()

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [productError, setProductError] = useState('')
  const [active, setActive] = useState(0)
  const [qty, setQty] = useState(1)
  const [reviews, setReviews] = useState([])
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [posting, setPosting] = useState(false)

  const loadReviews = useCallback(async (productId) => {
    if (!productId) return

    try {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false })

      if (error) throw error
      setReviews(data ?? [])
    } catch (err) {
      console.error('Error loading product reviews:', err)
      toast.error('Unable to load reviews right now.')
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const fetchProduct = async () => {
      setLoading(true)
      setProductError('')
      setProduct(null)
      setReviews([])
      setActive(0)
      setQty(1)

      try {
        const { data, error } = await supabase
          .from('products')
          .select('*, category:categories(name,slug)')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle()

        if (error) throw error
        if (cancelled) return

        setProduct(data)

        if (data) {
          const { data: reviewData, error: reviewError } = await supabase
            .from('reviews')
            .select('*')
            .eq('product_id', data.id)
            .order('created_at', { ascending: false })

          if (reviewError) throw reviewError
          if (!cancelled) setReviews(reviewData ?? [])
        }
      } catch (err) {
        console.error('Error loading product:', err)
        if (!cancelled) {
          setProductError('Unable to load this product. Please try again later.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchProduct()

    return () => {
      cancelled = true
    }
  }, [slug])

  const images = product
    ? [...new Set([product.image_url, ...(Array.isArray(product.images) ? product.images : [])].filter(Boolean))]
    : []
  const availableStock = Math.max(0, Number(product?.stock ?? 0))
  const discount =
    Number(product?.compare_at_price) > Number(product?.price) && Number(product?.compare_at_price) > 0
      ? Math.round(
          (1 - Number(product.price) / Number(product.compare_at_price)) * 100
        )
      : 0
  const averageRating = reviews.length
    ? reviews.reduce((total, review) => total + Number(review.rating || 0), 0) / reviews.length
    : 0
  const liked = product ? ids.has(product.id) : false
  const myReview = user
    ? reviews.find((review) => review.user_id === user.id)
    : null

  const addProductToCart = async () => {
    if (!product || availableStock <= 0) {
      toast.error('This product is out of stock.')
      return false
    }

    if (qty > availableStock) {
      toast.error(`Only ${availableStock} item(s) are available.`)
      setQty(availableStock)
      return false
    }

    try {
      await addItem(product, qty)
      return true
    } catch (err) {
      console.error('Error adding product to cart:', err)
      toast.error(err?.message || 'Unable to add this product to your cart.')
      return false
    }
  }

  const buyNow = async () => {
    const added = await addProductToCart()
    if (added) navigate('/cart')
  }

  const submitReview = async (event) => {
    event.preventDefault()

    if (!user) {
      toast.error('Please sign in to write a review.')
      return
    }

    if (posting) return

    setPosting(true)

    try {
      const { error } = await supabase.from('reviews').insert({
        product_id: product.id,
        user_id: user.id,
        author_name: profile?.full_name || 'Customer',
        rating,
        comment: comment.trim() || null,
      })

      if (error) {
        if (error.code === '23505') {
          toast.error('You have already reviewed this product.')
        } else {
          console.error('Error submitting review:', error)
          toast.error(error.message || 'Unable to submit your review.')
        }
        return
      }

      setComment('')
      setRating(5)
      toast.success('Thanks for your review!')
      await loadReviews(product.id)
    } catch (err) {
      console.error('Unexpected error submitting review:', err)
      toast.error('Unable to submit your review. Please try again.')
    } finally {
      setPosting(false)
    }
  }

  const deleteReview = async (reviewId) => {
    if (!user) {
      toast.error('Please sign in to delete your review.')
      return
    }

    // The user ID filter adds a client-side guard; enforce ownership with RLS too.
    const { error } = await supabase
      .from('reviews')
      .delete()
      .eq('id', reviewId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting review:', error)
      toast.error(error.message || 'Unable to delete your review.')
      return
    }

    toast.success('Review deleted.')
    await loadReviews(product.id)
  }

  if (loading) return <Spinner full />

  if (productError) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-3 text-stone-600">{productError}</p>
        <Link to="/shop" className="btn-primary mt-6 inline-flex">
          Back to shop
        </Link>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="container-page py-20 text-center">
        <h1 className="text-2xl font-semibold">Product not found</h1>
        <p className="mt-3 text-stone-600">
          This product may have been removed or is no longer available.
        </p>
        <Link to="/shop" className="btn-primary mt-6 inline-flex">
          Back to shop
        </Link>
      </div>
    )
  }

  const specs = [
    ['Material', product.material],
    ['Dimensions', product.dimensions],
    ['Colour', product.color],
  ].filter(([, value]) => value)

  return (
    <div className="container-page py-10">
      <nav className="mb-6 text-sm text-stone-500" aria-label="Breadcrumb">
        <Link to="/shop" className="hover:text-brand-700">
          Shop
        </Link>
        {product.category && (
          <>
            {' / '}
            <Link
              to={`/shop?category=${encodeURIComponent(product.category.slug)}`}
              className="hover:text-brand-700"
            >
              {product.category.name}
            </Link>
          </>
        )}
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div>
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-stone-100">
            <ProductImage
              src={images[active] || product.image_url}
              alt={product.name}
              className="h-full w-full"
            />
          </div>

          {images.length > 1 && (
            <div className="mt-3 flex gap-3 overflow-x-auto">
              {images.map((src, index) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`View image ${index + 1} of ${images.length}`}
                  aria-pressed={index === active}
                  className={`h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 ${
                    index === active ? 'border-brand-600' : 'border-transparent'
                  }`}
                >
                  <ProductImage src={src} alt={`${product.name} view ${index + 1}`} className="h-full w-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product information */}
        <div>
          <h1 className="text-3xl font-semibold">{product.name}</h1>

          <div className="mt-2 flex items-center gap-2 text-sm text-stone-500">
            <Rating value={averageRating} />
            <span>
              {reviews.length
                ? `${averageRating.toFixed(1)} (${reviews.length} ${reviews.length === 1 ? 'review' : 'reviews'})`
                : 'No reviews yet'}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-baseline gap-3">
            <span className="text-3xl font-bold">
              {formatPrice(product.price)}
            </span>
            {discount > 0 && (
              <>
                <span className="text-lg text-stone-400 line-through">
                  {formatPrice(product.compare_at_price)}
                </span>
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-sm font-semibold text-brand-700">
                  Save {discount}%
                </span>
              </>
            )}
          </div>

          {product.description && (
            <p className="mt-5 leading-relaxed text-stone-600">
              {product.description}
            </p>
          )}

          {specs.length > 0 && (
            <dl className="mt-6 divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white text-sm">
              {specs.map(([label, value]) => (
                <div key={label} className="flex gap-4 px-4 py-2.5">
                  <dt className="w-28 shrink-0 text-stone-500">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>
          )}

          <p className="mt-5 text-sm font-medium">
            {availableStock === 0 ? (
              <span className="text-red-600">Out of stock</span>
            ) : availableStock <= 5 ? (
              <span className="text-amber-700">Only {availableStock} left</span>
            ) : (
              <span className="text-green-700">In stock</span>
            )}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-lg border border-stone-300 bg-white">
              <button
                type="button"
                className="p-3 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setQty((current) => Math.max(1, current - 1))}
                disabled={qty <= 1 || availableStock === 0}
                aria-label="Decrease quantity"
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center font-medium" aria-live="polite">
                {qty}
              </span>
              <button
                type="button"
                className="p-3 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => setQty((current) => Math.min(availableStock, current + 1))}
                disabled={qty >= availableStock || availableStock === 0}
                aria-label="Increase quantity"
              >
                <Plus size={16} />
              </button>
            </div>

            <button
              type="button"
              className="btn-primary inline-flex items-center gap-2"
              disabled={availableStock === 0}
              onClick={addProductToCart}
            >
              <ShoppingCart size={16} /> Add to cart
            </button>

            <button
              type="button"
              className="btn-outline"
              disabled={availableStock === 0}
              onClick={buyNow}
            >
              Buy now
            </button>

            <button
              type="button"
              className="btn-outline !px-3"
              onClick={() => toggle(product.id)}
              aria-label={liked ? 'Remove from wishlist' : 'Add to wishlist'}
              aria-pressed={liked}
            >
              <Heart
                size={18}
                className={liked ? 'fill-red-500 text-red-500' : ''}
              />
            </button>
          </div>

          <p className="mt-5 flex items-center gap-2 text-sm text-stone-500">
            <Truck size={16} /> Free delivery on orders above{' '}
            {formatPrice(FREE_SHIPPING_THRESHOLD)}
          </p>
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-16 max-w-3xl">
        <h2 className="text-2xl font-semibold">Customer reviews</h2>

        {user && !myReview && (
          <form onSubmit={submitReview} className="card mt-5 space-y-3 p-5">
            <p className="font-medium">Write a review</p>

            <div className="flex gap-1" role="group" aria-label="Choose a rating">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  aria-label={`${value} star${value === 1 ? '' : 's'}`}
                  aria-pressed={rating === value}
                >
                  <Star
                    size={24}
                    className={
                      value <= rating
                        ? 'fill-amber-400 text-amber-400'
                        : 'text-stone-300'
                    }
                  />
                </button>
              ))}
            </div>

            <textarea
              className="input"
              rows={3}
              maxLength={2000}
              placeholder="Share your experience (optional)"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />

            <button type="submit" className="btn-primary" disabled={posting}>
              {posting ? 'Posting…' : 'Post review'}
            </button>
          </form>
        )}

        {!user && (
          <p className="mt-4 text-sm text-stone-500">
            <Link
              to="/login"
              state={{ from: `/product/${slug}` }}
              className="font-medium text-brand-700 hover:underline"
            >
              Sign in
            </Link>{' '}
            to write a review.
          </p>
        )}

        {reviews.length === 0 ? (
          <p className="mt-6 text-sm text-stone-500">
            Be the first to review this product.
          </p>
        ) : (
          <ul className="mt-6 space-y-4">
            {reviews.map((review) => (
              <li key={review.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {review.author_name || 'Customer'}
                    </p>
                    <Rating value={Number(review.rating) || 0} size={14} />
                  </div>

                  <div className="flex items-center gap-3 text-xs text-stone-400">
                    {review.created_at ? formatDate(review.created_at) : ''}
                    {user?.id === review.user_id && (
                      <button
                        type="button"
                        onClick={() => deleteReview(review.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>

                {review.comment && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-stone-600">
                    {review.comment}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
