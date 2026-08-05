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
        // age_verified_at is monotonic FOR A GIVEN USER — once set, it should
        // never revert to unset. This fetch races with Register.jsx's own
        // explicit /register call right after signup (both fire off the
        // moment a new session appears); whichever response lands last would
        // otherwise win and could silently overwrite an already-correct
        // age_verified_at with a stale null snapshot taken before /register
        // recorded it. The `prev?.id === p?.id` check is required — without
        // it, switching accounts in the same tab (sign out from user A,
        // straight into user B) could incorrectly carry A's verified status
        // onto B's freshly-fetched profile.
        setProfile(prev => {
          if (p && prev?.id === p.id && prev?.age_verified_at && !p.age_verified_at) {
            return { ...p, age_verified_at: prev.age_verified_at }
          }
          return p || null
        })
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

  // Merges into the existing profile if one is already loaded, or seeds a
  // fresh profile object from `partial` alone if not (e.g. immediately after
  // registration, before the parallel GET /api/auth/profile fetch has
  // resolved — see Register.jsx, which always passes a complete profile row
  // in that case, not just a single field).
  function updateProfile(partial) {
    setProfile(prev => ({ ...(prev || {}), ...partial }))
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
