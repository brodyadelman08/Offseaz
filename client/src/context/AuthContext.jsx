import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../services/supabase'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(undefined)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  // Track the last token we fetched a profile for so we never kick off a
  // duplicate fetch when both getSession() AND onAuthStateChange fire for the
  // same session (they both call setSession, React creates two state updates
  // if the objects have different references, which triggers this effect twice).
  const lastFetchedToken = useRef(null)

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
      lastFetchedToken.current = null
      setProfile(null)
      setLoading(false)
      return
    }

    // Deduplicate: don't re-fetch if it's the exact same access token we
    // already fetched (handles the getSession + onAuthStateChange double-fire).
    if (session.access_token === lastFetchedToken.current) return
    lastFetchedToken.current = session.access_token

    setLoading(true)
    api.get('/api/auth/profile')
      .then(res => {
        const p = res.data.profile
        setProfile(p || null)
      })
      .catch(() => {
        setProfile(null)
        lastFetchedToken.current = null   // allow retry on next session change
      })
      .finally(() => setLoading(false))
  }, [session])

  async function signOut() {
    lastFetchedToken.current = null
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
