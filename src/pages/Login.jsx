import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import AuthCard from '../components/AuthCard'

export default function Login() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (user) navigate(from, { replace: true })
  }, [user, from, navigate])

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await signIn(email.trim(), password)
    console.log('signIn error', error )
    setBusy(false)
    if (error) toast.error(error.message)
    else toast.success('Welcome back!')
  }

  return (
    <AuthCard
      title="Welcome back"
      subtitle="Sign in to see your cart, orders and saved addresses."
      footer={
        <>
          New to Casa Nest?{' '}
          <Link to="/signup" state={{ from }} className="font-semibold text-brand-700 hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <label className="label" htmlFor="password">Password</label>
            <Link to="/forgot-password" className="text-xs font-medium text-brand-700 hover:underline">Forgot password?</Link>
          </div>
          <input id="password" type="password" required autoComplete="current-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      </form>
    </AuthCard>
  )
}
