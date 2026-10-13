import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Spinner from './Spinner'

// <ProtectedRoute>            → any signed-in user
// <ProtectedRoute role="staff"> → staff or admin
// <ProtectedRoute role="admin"> → admin only
export default function ProtectedRoute({ role, children }) {
  const { user, loading, profileReady, isStaff, isAdmin } = useAuth()
  const location = useLocation()

  if (loading || (user && role && !profileReady)) return <Spinner full />
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (role === 'admin' && !isAdmin) return <Navigate to="/" replace />
  if (role === 'staff' && !isStaff) return <Navigate to="/" replace />

  return children ?? <Outlet />
}
