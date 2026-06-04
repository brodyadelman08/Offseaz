import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../services/api'
import { useAuth } from './AuthContext'

const TeamContext = createContext(null)

export function TeamProvider({ children }) {
  const { profile } = useAuth()
  const [teams, setTeams] = useState([])
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [activeTeamId, _setActiveTeamId] = useState(
    () => localStorage.getItem('offseaz_active_team') || null
  )

  const loadTeams = useCallback(() => {
    if (!profile) {
      setTeamsLoading(false)
      return
    }
    if (profile.role !== 'athlete') {
      setTeams([])
      setTeamsLoading(false)
      return
    }

    setTeamsLoading(true)
    const savedId = localStorage.getItem('offseaz_active_team')

    api.get('/api/teams/my-teams')
      .then(res => {
        const t = res.data.teams || []
        setTeams(t)
        // Keep saved team if still valid; otherwise auto-select first
        if (t.length > 0) {
          const stillValid = savedId && t.find(x => x.id === savedId)
          if (!stillValid) {
            const id = t[0].id
            _setActiveTeamId(id)
            localStorage.setItem('offseaz_active_team', id)
          }
        }
      })
      .catch(() => {})
      .finally(() => setTeamsLoading(false))
  }, [profile?.id, profile?.role])

  useEffect(() => {
    loadTeams()
  }, [loadTeams])

  function setActiveTeamId(id) {
    _setActiveTeamId(id)
    if (id) localStorage.setItem('offseaz_active_team', id)
    else localStorage.removeItem('offseaz_active_team')
  }

  const activeTeam = teams.find(t => t.id === activeTeamId) || teams[0] || null

  return (
    <TeamContext.Provider value={{
      teams,
      teamsLoading,
      activeTeam,
      activeTeamId: activeTeam?.id || null,
      setActiveTeamId,
      refreshTeams: loadTeams,
    }}>
      {children}
    </TeamContext.Provider>
  )
}

export function useTeam() {
  return useContext(TeamContext)
}
