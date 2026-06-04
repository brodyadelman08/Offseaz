import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext'

const CoachAccessContext = createContext(null)

/**
 * Wraps all coach-authenticated routes. Fetches GET /api/teams/mine once and exposes:
 *   team         — the coach's team object (or null)
 *   accessLevel  — 'head_coach' | 'admin_coach' | 'view_only' | null
 *   isHeadCoach  — accessLevel === 'head_coach'
 *   canEdit      — head_coach or admin_coach
 *   loading      — true while fetching
 *   refresh()    — re-fetch (call after team is created or access level changes)
 */
export function CoachAccessProvider({ children }) {
  const { profile } = useAuth()
  const [team, setTeam]               = useState(null)
  const [accessLevel, setAccessLevel] = useState(null)
  const [loading, setLoading]         = useState(true)

  const refresh = useCallback(async () => {
    if (!profile || profile.role !== 'coach') {
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await api.get('/api/teams/mine')
      setTeam(res.data.team || null)
      setAccessLevel(res.data.my_access_level || null)
    } catch {
      // Non-fatal — keep existing state
    } finally {
      setLoading(false)
    }
  }, [profile?.id, profile?.role])

  useEffect(() => { refresh() }, [refresh])

  const isHeadCoach = accessLevel === 'head_coach'
  const canEdit     = accessLevel === 'head_coach' || accessLevel === 'admin_coach'

  return (
    <CoachAccessContext.Provider value={{ team, accessLevel, isHeadCoach, canEdit, loading, refresh }}>
      {children}
    </CoachAccessContext.Provider>
  )
}

export function useCoachAccess() {
  return useContext(CoachAccessContext)
}
