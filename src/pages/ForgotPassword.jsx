import { useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { useAuth } from '../context/AuthContext'
import AuthCard from '../components/AuthCard'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await resetPassword(email.trim())
    setBusy(false)
    if (error) toast.error(error.message)
    else setSent(true)
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={<Link to="/login" className="font-semibold text-brand-700 hover:underline">Back to sign in</Link>}
    >
      {sent ? (
        <p className="rounded-lg bg-green-50 p-4 text-sm text-green-800">
          If an account exists for <strong>{email}</strong>, a reset link is on its way.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" type="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <button className="btn-primary w-full" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </form>
      )}
    </AuthCard>
  )
}
