import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import Spinner from '../../components/Spinner'
import { formatDate } from '../../lib/format'

const ROLES = ['customer', 'staff', 'admin']

export default function AdminUsers() {
  const { user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setUsers(data || [])
        setLoading(false)
      })
  }, [])

  const changeRole = async (u, role) => {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', u.id)
    if (error) return toast.error(error.message)
    toast.success(`${u.full_name || u.email} is now ${role}`)
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, role } : x)))
  }

  const shown = users.filter((u) =>
    `${u.full_name} ${u.email}`.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Users & roles ({users.length})</h2>
        <input className="input !w-64" placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <p className="mb-4 rounded-lg bg-brand-50 p-3 text-sm text-brand-900">
        <strong>customer</strong> shops · <strong>staff</strong> manages products, categories and orders · <strong>admin</strong> can also change roles.
      </p>

      {loading ? (
        <Spinner />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase text-stone-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {shown.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 font-medium">{u.full_name || '—'}</td>
                  <td className="px-4 py-3 text-stone-600">{u.email}</td>
                  <td className="px-4 py-3 text-stone-500">{formatDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <select
                      className="input !w-36 !py-1.5 capitalize"
                      value={u.role}
                      disabled={u.id === user.id}
                      title={u.id === user.id ? 'You cannot change your own role' : ''}
                      onChange={(e) => changeRole(u, e.target.value)}
                    >
                      {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
