import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { KeyRound, MapPin, Plus, Trash2, User } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import AddressFields, { emptyAddress } from '../components/AddressFields'
import Spinner from '../components/Spinner'

const TABS = [
  ['details', 'Personal details', User],
  ['addresses', 'Addresses', MapPin],
  ['security', 'Password', KeyRound],
]

export default function Profile() {
  const [tab, setTab] = useState('details')
  const { profile } = useAuth()

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold">My profile</h1>
        {profile && (
          <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold capitalize text-brand-800">{profile.role}</span>
        )}
      </div>

      <div className="mt-8 grid gap-8 md:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 md:flex-col">
          {TABS.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-left text-sm font-medium ${tab === key ? 'bg-brand-100 text-brand-800' : 'text-stone-600 hover:bg-stone-100'}`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </nav>

        <div className="card max-w-2xl p-6">
          {tab === 'details' && <Details />}
          {tab === 'addresses' && <Addresses />}
          {tab === 'security' && <Security />}
        </div>
      </div>
    </div>
  )
}

function Details() {
  const { user, profile, refreshProfile } = useAuth()
  const [fullName, setFullName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setFullName(profile?.full_name || '')
    setPhone(profile?.phone || '')
  }, [profile])

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq('id', user.id)
    setBusy(false)
    if (error) return toast.error(error.message)
    await refreshProfile()
    toast.success('Profile updated')
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div>
        <label className="label">Email</label>
        <input className="input bg-stone-50" value={user.email} disabled />
      </div>
      <div>
        <label className="label" htmlFor="fn">Full name</label>
        <input id="fn" className="input" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="ph">Phone</label>
        <input id="ph" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98765 43210" />
      </div>
      <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save changes'}</button>
    </form>
  )
}

function Addresses() {
  const { user, profile } = useAuth()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null) // null | address object (id undefined = new)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const { data } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at')
    setList(data || [])
    setLoading(false)
  }
  useEffect(() => {
    load()
  }, [])

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    const { id, user_id, created_at, updated_at, ...fields } = editing
    const { error } = id
      ? await supabase.from('addresses').update(fields).eq('id', id)
      : await supabase.from('addresses').insert({ ...fields, user_id: user.id, is_default: list.length === 0 })
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success('Address saved')
    setEditing(null)
    load()
  }

  const makeDefault = async (id) => {
    const { error } = await supabase.from('addresses').update({ is_default: true }).eq('id', id)
    if (error) return toast.error(error.message)
    load()
  }

  const remove = async (id) => {
    if (!confirm('Delete this address?')) return
    const { error } = await supabase.from('addresses').delete().eq('id', id)
    if (error) return toast.error(error.message)
    load()
  }

  if (loading) return <Spinner />

  if (editing)
    return (
      <form onSubmit={save} className="space-y-4">
        <h2 className="text-xl font-semibold">{editing.id ? 'Edit address' : 'New address'}</h2>
        <AddressFields value={editing} onChange={setEditing} />
        <div className="flex gap-3">
          <button className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save address'}</button>
          <button type="button" className="btn-outline" onClick={() => setEditing(null)}>Cancel</button>
        </div>
      </form>
    )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Saved addresses</h2>
        <button className="btn-primary !py-2" onClick={() => setEditing({ ...emptyAddress, full_name: profile?.full_name || '', phone: profile?.phone || '' })}>
          <Plus size={16} /> Add address
        </button>
      </div>
      {list.length === 0 && <p className="text-sm text-stone-500">You haven't saved any addresses yet.</p>}
      {list.map((a) => (
        <div key={a.id} className="rounded-lg border border-stone-200 p-4 text-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold">
                {a.full_name}
                <span className="ml-2 rounded bg-stone-100 px-1.5 py-0.5 text-xs font-medium">{a.label}</span>
                {a.is_default && <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-800">Default</span>}
              </p>
              <p className="mt-1 text-stone-600">{a.line1}{a.line2 ? `, ${a.line2}` : ''}</p>
              <p className="text-stone-600">{a.city}, {a.state} {a.postal_code}, {a.country}</p>
              <p className="text-stone-500">{a.phone}</p>
            </div>
            <button onClick={() => remove(a.id)} className="text-red-600 hover:text-red-700" aria-label="Delete address"><Trash2 size={16} /></button>
          </div>
          <div className="mt-3 flex gap-4 text-xs font-medium">
            <button onClick={() => setEditing(a)} className="text-brand-700 hover:underline">Edit</button>
            {!a.is_default && <button onClick={() => makeDefault(a.id)} className="text-brand-700 hover:underline">Make default</button>}
          </div>
        </div>
      ))}
    </div>
  )
}

function Security() {
  const { updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (password.length < 8) return toast.error('Password must be at least 8 characters')
    if (password !== confirm) return toast.error('Passwords do not match')
    setBusy(true)
    const { error } = await updatePassword(password)
    setBusy(false)
    if (error) return toast.error(error.message)
    toast.success('Password updated')
    setPassword('')
    setConfirm('')
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-xl font-semibold">Change password</h2>
      <div>
        <label className="label" htmlFor="np">New password</label>
        <input id="np" type="password" className="input" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      <div>
        <label className="label" htmlFor="cp">Confirm new password</label>
        <input id="cp" type="password" className="input" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <button className="btn-primary" disabled={busy}>{busy ? 'Updating…' : 'Update password'}</button>
    </form>
  )
}
