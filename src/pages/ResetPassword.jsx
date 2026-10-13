import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import AuthCard from '../components/AuthCard'
import Spinner from '../components/Spinner'

// Supabase signs the user in via the emailed link, then this page sets the new password.
export default function ResetPassword() {
  const { user, loading, updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading) return <Spinner full />

  if (!user)
    return (
      <AuthCard title="Link expired" footer={<Link to="/forgot-password" className="font-semibold text-brand-700 hover:underline">Request a new link</Link>}>
        <p className="text-sm text-stone-600">This password reset link is invalid or has expired.</p>
      </AuthCard>
    )

  const submit = async (e) => {
    e.preventDefault()
    if (password.length < 8) return toast.error('Password must be at least 8 characters')
    if (password !== confirm) return toast.error('Passwords do not match')
    setBusy(true)
    const { error } = await updatePassword(password)
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success('Password updated')
    navigate('/', { replace: true })
  }

  return (
    <AuthCard title="Choose a new password">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="pw">New password</label>
          <input id="pw" type="password" required minLength={8} className="input" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="pw2">Confirm password</label>
          <input id="pw2" type="password" required className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Update password'}</button>
      </form>
    </AuthCard>
  )
}
