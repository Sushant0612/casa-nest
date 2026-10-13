import { NavLink, Outlet } from 'react-router-dom'
import { LayoutDashboard, Package, ShoppingBag, Tags, Users } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function AdminLayout() {
  const { isAdmin, profile } = useAuth()

  const links = [
    ['/admin', 'Dashboard', LayoutDashboard, true],
    ['/admin/orders', 'Orders', ShoppingBag],
    ['/admin/products', 'Products', Package],
    ['/admin/categories', 'Categories', Tags],
    ...(isAdmin ? [['/admin/users', 'Users & roles', Users]] : []),
  ]

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-3xl font-semibold">Admin panel</h1>
        <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold capitalize text-brand-800">{profile?.role}</span>
      </div>

      <div className="grid gap-8 md:grid-cols-[210px_1fr]">
        <nav className="flex gap-2 overflow-x-auto md:flex-col">
          {links.map(([to, label, Icon, end]) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium ${isActive ? 'bg-brand-600 text-white' : 'text-stone-600 hover:bg-stone-100'}`
              }
            >
              <Icon size={16} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
