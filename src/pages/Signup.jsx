import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { MailCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import AuthCard from '../components/AuthCard'

export default function Signup() {
  const { user, signUp } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = location.state?.from || '/'

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [needsConfirm, setNeedsConfirm] = useState(false)

  useEffect(() => {
    if (user) navigate(from, { replace: true })
  }, [user, from, navigate])

  const submit = async (e) => {
    e.preventDefault()
    if (password.length < 8) return toast.error('Password must be at least 8 characters')
    if (password !== confirm) return toast.error('Passwords do not match')

    setBusy(true)
    const { data, error } = await signUp(email.trim(), password, fullName.trim())
    setBusy(false)

    if (error) return toast.error(error.message)
    // Supabase returns a user with no identities when the email is already registered
    if (data.user && data.user.identities?.length === 0) {
      return toast.error('An account with this email already exists. Try signing in.')
    }
    if (!data.session) {
      setNeedsConfirm(true) // email confirmation is enabled in Supabase
    } else {
      toast.success('Account created!')
    }
  }

  if (needsConfirm)
    return (
      <AuthCard title="Check your inbox">
        <div className="text-center">
          <MailCheck className="mx-auto text-brand-600" size={48} />
          <p className="mt-4 text-sm text-stone-600">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then sign in.
          </p>
          <Link to="/login" className="btn-primary mt-6">Go to sign in</Link>
        </div>
      </AuthCard>
    )

  return (
    <AuthCard
      title="Create your account"
      subtitle="Track orders, save addresses and check out faster."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={{ from }} className="font-semibold text-brand-700 hover:underline">Sign in</Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="name">Full name</label>
          <input id="name" required autoComplete="name" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" required autoComplete="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" required minLength={8} autoComplete="new-password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
          <p className="mt-1 text-xs text-stone-400">At least 8 characters.</p>
        </div>
        <div>
          <label className="label" htmlFor="confirm">Confirm password</label>
          <input id="confirm" type="password" required autoComplete="new-password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      </form>
    </AuthCard>
  )
}
