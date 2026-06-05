import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext'

const CoachAccessContext = createContext(null)

export function CoachAccessProvider({ children }) {
  const { profile } = useAuth()
  const [teams, setTeams]               = useState([])
  const [accessByTeam, setAccessByTeam] = useState({})
  const [loading, setLoading]           = useState(true)
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

  useEffect(() => { refresh() }, [refresh])

  function setActiveTeamId(id) {
    _setActiveTeamId(id)
    if (id) localStorage.setItem('offseaz_active_coach_team', id)
    else     localStorage.removeItem('offseaz_active_coach_team')
  }

  const activeTeam  = teams.find(t => t.id === activeTeamId) || teams[0] || null
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
    }}>
      {children}
    </CoachAccessContext.Provider>
  )
}

export function useCoachAccess() {
  return useContext(CoachAccessContext)
}
