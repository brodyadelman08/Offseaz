import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../services/supabase'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (session === undefined) return

    if (!session) {
      setProfile(null)
      setLoading(false)
      return
    }

    api.get('/api/auth/profile')
      .then(res => setProfile(res.data.profile))
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }, [session])

  async function signOut() {
    await supabase.auth.signOut()
    setProfile(null)
  }

  function updateProfile(partial) {
    setProfile(prev => prev ? { ...prev, ...partial } : prev)
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
