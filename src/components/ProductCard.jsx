import { Link } from 'react-router-dom'
import { Heart, ShoppingCart } from 'lucide-react'
import ProductImage from './ProductImage'
import { useCart } from '../context/CartContext'
import { useWishlist } from '../context/WishlistContext'
import { formatPrice } from '../lib/format'

export default function ProductCard({ product }) {
  const { addItem } = useCart()
  const { ids, toggle } = useWishlist()
  const liked = ids.has(product.id)
  const discount =
    product.compare_at_price > product.price
      ? Math.round((1 - product.price / product.compare_at_price) * 100)
      : 0

  return (
    <div className="card group relative flex flex-col overflow-hidden transition hover:shadow-md">
      <Link to={`/product/${product.slug}`} className="relative block aspect-[4/3] overflow-hidden bg-stone-100">
        <ProductImage
          src={product.image_url}
          alt={product.name}
          className="h-full w-full transition duration-300 group-hover:scale-105"
        />
        {discount > 0 && (
          <span className="absolute left-3 top-3 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-bold text-white">
            {discount}% OFF
          </span>
        )}
        {product.stock === 0 && (
          <span className="absolute inset-0 flex items-center justify-center bg-white/70 text-sm font-semibold text-stone-700">
            Out of stock
          </span>
        )}
      </Link>

      <button
        onClick={() => toggle(product.id)}
        aria-label={liked ? 'Remove from favourites' : 'Add to favourites'}
        className="absolute right-3 top-3 rounded-full bg-white/90 p-2 shadow transition hover:bg-white"
      >
        <Heart size={18} className={liked ? 'fill-red-500 text-red-500' : 'text-stone-600'} />
      </button>

      <div className="flex flex-1 flex-col p-4">
        <Link to={`/product/${product.slug}`} className="font-medium text-stone-900 hover:text-brand-700">
          {product.name}
        </Link>
        {product.color && <p className="mt-0.5 text-xs text-stone-500">{product.color}</p>}
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-lg font-bold text-stone-900">{formatPrice(product.price)}</span>
          {discount > 0 && (
            <span className="text-sm text-stone-400 line-through">{formatPrice(product.compare_at_price)}</span>
          )}
        </div>
        <button
          onClick={() => addItem(product)}
          disabled={product.stock === 0}
          className="btn-primary mt-4"
        >
          <ShoppingCart size={16} /> Add to cart
        </button>
      </div>
    </div>
  )
}
