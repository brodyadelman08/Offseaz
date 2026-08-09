import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext'

const CoachAccessContext = createContext(null)

export function CoachAccessProvider({ children }) {
  const { profile } = useAuth()
  const [teams, setTeams]               = useState([])
  const [accessByTeam, setAccessByTeam] = useState({})
  const [loading, setLoading]           = useState(true)
  const [notifications, setNotifications] = useState([])
  const [activeTeamId, _setActiveTeamId] = useState(
    () => localStorage.getItem('offseaz_active_coach_team') || null
  )

  const refresh = useCallback(async () => {
    if (!profile || profile.role !== 'coach') { setLoading(false); return }
    setLoading(true)
    try {
      const res = await api.get('/api/teams/my-coach-teams')
      const all = res.data.teams || []
      setTeams(all)
      const aMap = {}
      for (const t of all) aMap[t.id] = t.my_access_level
      setAccessByTeam(aMap)
      // Auto-select first team if saved one no longer valid
      const savedId = localStorage.getItem('offseaz_active_coach_team')
      const stillValid = savedId && all.find(t => t.id === savedId)
      if (all.length > 0 && !stillValid) {
        _setActiveTeamId(all[0].id)
        localStorage.setItem('offseaz_active_coach_team', all[0].id)
      }
    } catch { /* non-fatal */ }
    finally { setLoading(false) }
  }, [profile?.id, profile?.role])

  // Derived active team (used below by refreshNotifications and returned in
  // the provider value) — computed early so refreshNotifications can close
  // over its id and correctly refire when the coach switches teams.
  const activeTeam = teams.find(t => t.id === activeTeamId) || teams[0] || null

  // Fetched here once and shared via context so Sidebar's notification badge
  // and CoachDashboard's notification list don't each fire their own request.
  // Scoped to the active team, same as every other team-scoped fetch in the
  // app — coach_notifications has no team_id column of its own, so the
  // server derives it from team_members; see notificationService.js.
  const refreshNotifications = useCallback(async () => {
    if (!profile || profile.role !== 'coach') { setNotifications([]); return }
    try {
      const url = activeTeam?.id
        ? `/api/notifications?team_id=${encodeURIComponent(activeTeam.id)}`
        : '/api/notifications'
      const res = await api.get(url)
      setNotifications(res.data.notifications || [])
    } catch { /* non-fatal */ }
  }, [profile?.id, profile?.role, activeTeam?.id])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    // Wait for `teams` (and therefore activeTeam) to finish resolving before
    // ever fetching — otherwise the first, unscoped call (activeTeam still
    // null) can resolve after the correctly-scoped one and overwrite it with
    // every team's notifications. Same race class fixed on Leaderboard/
    // Accountability/Feed/Messages/Athletes.
    if (loading) return
    refreshNotifications()
  }, [loading, refreshNotifications])

  function setActiveTeamId(id) {
    _setActiveTeamId(id)
    if (id) localStorage.setItem('offseaz_active_coach_team', id)
    else     localStorage.removeItem('offseaz_active_coach_team')
  }

  const accessLevel = activeTeam ? (accessByTeam[activeTeam.id] || null) : null
  const isHeadCoach = accessLevel === 'head_coach'
  const canEdit     = isHeadCoach || accessLevel === 'admin_coach'

  return (
    <CoachAccessContext.Provider value={{
      team: activeTeam,          // backward compat — the active team
      teams,                     // all teams
      activeTeamId: activeTeam?.id || null,
      setActiveTeamId,
      accessLevel,
      isHeadCoach,
      canEdit,
      loading,
      refresh,
      notifications,
      refreshNotifications,
    }}>
      {children}
    </CoachAccessContext.Provider>
  )
}

export function useCoachAccess() {
  return useContext(CoachAccessContext)
}
