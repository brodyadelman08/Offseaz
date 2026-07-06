const { getProfile } = require('../services/authService')
const { getAthleteProfile } = require('../services/athleteService')
const { resolveCoachTeamAndAccess, isAthleteOnTeam } = require('../services/teamsService')
const supabaseAdmin = require('../config/supabase')

async function profile(req, res) {
  const { id } = req.params

  try {
    const requestingProfile = await getProfile(req.user.id)
    if (requestingProfile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can view athlete profiles' })
    }

    const athlete = await getAthleteProfile(id, req.user.id)
    res.json({ athlete })
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: err.message })
    if (err.code === 'PGRST116') return res.status(404).json({ error: 'Athlete not found' })
    res.status(500).json({ error: err.message })
  }
}

async function saveNote(req, res) {
  const { id } = req.params
  const { note } = req.body
  try {
    const requestingProfile = await getProfile(req.user.id)
    if (requestingProfile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can save notes' })
    }

    const { team, accessLevel } = await resolveCoachTeamAndAccess(req.user.id, req.query.team_id || null)
    if (!team) {
      return res.status(403).json({ error: 'No team found' })
    }
    if (accessLevel === 'view_only') {
      return res.status(403).json({ error: 'View-only coaches cannot save notes' })
    }
    const onTeam = await isAthleteOnTeam(team.id, id)
    if (!onTeam) {
      return res.status(403).json({ error: 'That athlete is not on your team' })
    }

    const { data, error } = await supabaseAdmin
      .from('coach_notes')
      .upsert(
        {
          coach_id: req.user.id,
          athlete_id: id,
          note: note || '',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'coach_id,athlete_id' }
      )
      .select('note, updated_at')
      .single()

    if (error) throw error
    res.json({ note: data.note, updated_at: data.updated_at })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { profile, saveNote }
