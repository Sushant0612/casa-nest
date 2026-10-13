import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'
import Navbar from './Navbar'
import Footer from './Footer'
import { isConfigured } from '../lib/supabase'

export default function Layout() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      {!isConfigured && (
        <div className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
          <AlertTriangle size={16} />
          Supabase is not configured. Copy <code className="font-mono">.env.example</code> to{' '}
          <code className="font-mono">.env</code> and add your project URL and anon key.
        </div>
      )}
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
