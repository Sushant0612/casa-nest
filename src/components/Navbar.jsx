import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Heart, LayoutDashboard, LogOut, Menu, Package, Search, ShoppingCart, Sofa, User, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useCart } from '../context/CartContext'

export default function Navbar() {
  const { user, profile, isStaff, signOut } = useAuth()
  const { count } = useCart()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [menu, setMenu] = useState(false)
  const [q, setQ] = useState('')

  const submitSearch = (e) => {
    e.preventDefault()
    navigate(`/shop?q=${encodeURIComponent(q.trim())}`)
    setOpen(false)
  }

  const logout = async () => {
    await signOut()
    setMenu(false)
    navigate('/')
  }

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition hover:text-brand-700 ${isActive ? 'text-brand-700' : 'text-stone-600'}`

  const menuItem = 'flex items-center gap-2 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50'

  return (
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center gap-6">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-brand-800">
          <Sofa className="text-brand-600" /> Casa Nest
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          <NavLink to="/" end className={linkClass}>Home</NavLink>
          <NavLink to="/shop" className={linkClass}>Shop</NavLink>
        </nav>

        <form onSubmit={submitSearch} className="ml-auto hidden max-w-xs flex-1 md:block">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search furniture…"
              className="input !rounded-full !py-2 pl-9"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-0">
          <Link to="/wishlist" className="rounded-full p-2 text-stone-600 hover:bg-stone-100" aria-label="Favourites">
            <Heart size={20} />
          </Link>
          <Link to="/cart" className="relative rounded-full p-2 text-stone-600 hover:bg-stone-100" aria-label="Cart">
            <ShoppingCart size={20} />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-brand-600 px-1 text-xs font-bold text-white">
                {count}
              </span>
            )}
          </Link>

          {user ? (
            <div
              className="relative"
              onMouseEnter={() => setMenu(true)}
              onMouseLeave={() => setMenu(false)}
            >
              <button
                onClick={() => setMenu(true)}
                aria-haspopup="menu"
                aria-expanded={menu}
                className="flex items-center gap-2 rounded-full p-2 text-stone-700 hover:bg-stone-100"
              >
                <User size={20} />
                <span className="hidden max-w-[8rem] truncate text-sm font-medium sm:block">
                  {profile?.full_name || 'Account'}
                </span>
              </button>
              {menu && (
                // pt-2 (instead of mt-2) keeps the hover area continuous so the menu doesn't close in the gap
                <div className="absolute right-0 z-50 w-52 pt-2">
                  <div className="overflow-hidden rounded-xl border border-stone-200 bg-white py-1 shadow-lg">
                    <Link to="/profile" onClick={() => setMenu(false)} className={menuItem}><User size={16} /> My profile</Link>
                    <Link to="/orders" onClick={() => setMenu(false)} className={menuItem}><Package size={16} /> My orders</Link>
                    <Link to="/wishlist" onClick={() => setMenu(false)} className={menuItem}><Heart size={16} /> Favourites</Link>
                    {isStaff && (
                      <Link to="/admin" onClick={() => setMenu(false)} className={menuItem}>
                        <LayoutDashboard size={16} /> Admin panel
                      </Link>
                    )}
                    <button onClick={logout} className={`${menuItem} w-full border-t border-stone-100`}>
                      <LogOut size={16} /> Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="btn-primary ml-2 !py-2">Sign in</Link>
          )}

          <button onClick={() => setOpen((o) => !o)} className="rounded-full p-2 text-stone-600 hover:bg-stone-100 md:hidden">
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="space-y-3 border-t border-stone-200 bg-white px-4 py-4 md:hidden">
          <form onSubmit={submitSearch}>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search furniture…" className="input" />
          </form>
          <Link to="/" onClick={() => setOpen(false)} className="block text-sm font-medium">Home</Link>
          <Link to="/shop" onClick={() => setOpen(false)} className="block text-sm font-medium">Shop</Link>
        </div>
      )}
    </header>
  )
}