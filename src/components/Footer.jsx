import { Link } from 'react-router-dom'
import { Sofa } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-stone-200 bg-white">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 font-display text-xl font-bold text-brand-800">
            <Sofa className="text-brand-600" /> Casa Nest
          </div>
          <p className="mt-3 max-w-xs text-sm text-stone-500">
            Thoughtfully made furniture and home decor for every room in your home.
          </p>
        </div>
        <div className="text-sm">
          <h3 className="mb-3 font-sans font-semibold">Shop</h3>
          <ul className="space-y-2 text-stone-600">
            <li><Link to="/shop" className="hover:text-brand-700">All products</Link></li>
            <li><Link to="/shop?category=living-room" className="hover:text-brand-700">Living room</Link></li>
            <li><Link to="/shop?category=bedroom" className="hover:text-brand-700">Bedroom</Link></li>
            <li><Link to="/shop?category=office" className="hover:text-brand-700">Office</Link></li>
          </ul>
        </div>
        <div className="text-sm">
          <h3 className="mb-3 font-sans font-semibold">Account</h3>
          <ul className="space-y-2 text-stone-600">
            <li><Link to="/profile" className="hover:text-brand-700">My profile</Link></li>
            <li><Link to="/orders" className="hover:text-brand-700">My orders</Link></li>
            <li><Link to="/wishlist" className="hover:text-brand-700">Favourites</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-stone-100 py-4 text-center text-xs text-stone-400">
        © {new Date().getFullYear()} Casa Nest. All rights reserved.
      </div>
    </footer>
  )
}
