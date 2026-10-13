import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileReady, setProfileReady] = useState(false)

  const loadProfile = useCallback(async (uid) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle()
    setProfile(data)
    setProfileReady(true)
  }, [])

  useEffect(() => {
    let active = true

    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return
        setSession(data.session)
        if (data.session) await loadProfile(data.session.user.id)
        else setProfileReady(true)
        setLoading(false)
      })
      .catch(() => {
        setProfileReady(true)
        setLoading(false)
      })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      if (s) {
        // Never await supabase calls directly inside this callback (can deadlock)
        setTimeout(() => loadProfile(s.user.id), 0)
      } else {
        setProfile(null)
        setProfileReady(true)
      }
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [loadProfile])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      loading,
      profileReady,
      role: profile?.role ?? 'customer',
      isStaff: ['staff', 'admin'].includes(profile?.role),
      isAdmin: profile?.role === 'admin',
      refreshProfile: () => (session ? loadProfile(session.user.id) : null),
      signUp: (email, password, fullName) =>
        supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName }, emailRedirectTo: window.location.origin },
        }),
      signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
      signOut: () => supabase.auth.signOut(),
      resetPassword: (email) =>
        supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      updatePassword: (password) => supabase.auth.updateUser({ password }),
    }),
    [session, profile, loading, profileReady, loadProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
