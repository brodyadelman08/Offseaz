const { getProfile } = require('../services/authService')
const { resolveCoachTeamAndAccess } = require('../services/teamsService')
const {
  getCoachRoster,
  getAthleteRoster,
  getTeammateProfile,
  removeAthlete,
} = require('../services/rosterService')

/**
 * GET /api/roster[?sort=name|position|joined]
 * Coach  → full team roster with survey status + max highlights
 * Athlete → privacy-filtered roster of teammates
 */
async function roster(req, res) {
  try {
    const profile = await getProfile(req.user.id)

    if (profile.role === 'coach') {
      const sort = ['name', 'position', 'joined'].includes(req.query.sort)
        ? req.query.sort
        : 'name'
      // Works for both head coaches and assistant coaches
      const { team } = await resolveCoachTeamAndAccess(req.user.id, req.query.team_id || null)
      if (!team) return res.json({ roster: [] })
      const data = await getCoachRoster(team.id, sort)
      return res.json({ roster: data })
    }

    if (profile.role === 'athlete') {
      const { team, roster: data } = await getAthleteRoster(req.user.id)
      return res.json({ team, roster: data })
    }

    res.status(403).json({ error: 'Forbidden' })
  } catch (err) {
    console.error('[rosterController] roster error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

/**
 * GET /api/roster/:athleteId
 * Athlete views a public teammate's full profile.
 */
async function teammateProfile(req, res) {
  const { athleteId } = req.params
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'athlete') {
      return res.status(403).json({ error: 'Only athletes can use this endpoint' })
    }

    const data = await getTeammateProfile(req.user.id, athleteId)
    res.json({ athlete: data })
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: err.message })
    if (err.status === 404) return res.status(404).json({ error: err.message })
    console.error('[rosterController] teammateProfle error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

/**
 * DELETE /api/roster/:athleteId
 * Coach removes an athlete from the team.
 */
async function removeAthleteFromTeam(req, res) {
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can remove athletes' })
    }
    // Only head coach or admin coach can remove athletes
    const { team, accessLevel } = await resolveCoachTeamAndAccess(req.user.id, req.query.team_id || null)
    if (!team || accessLevel === 'view_only') {
      return res.status(403).json({ error: 'View-only coaches cannot remove athletes' })
    }
    await removeAthlete(team.id, req.params.athleteId)
    res.json({ success: true })
  } catch (err) {
    if (err.status === 404) return res.status(404).json({ error: err.message })
    console.error('[rosterController] removeAthleteFromTeam error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

module.exports = { roster, teammateProfile, removeAthleteFromTeam }
