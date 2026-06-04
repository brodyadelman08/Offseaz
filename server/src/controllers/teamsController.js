const {
  createTeam,
  getTeamByCoach,
  getTeamByInviteCode,
  getTeamByCoachCode,
  joinTeam,
  joinTeamAsCoach,
  getAthleteTeam,
  getAthleteTeams,
  resolveCoachTeamAndAccess,
  getTeamCoaches,
  updateCoachAccessLevel,
  removeCoachFromTeam,
} = require('../services/teamsService')
const { getProfile } = require('../services/authService')
const { createCoachJoinNotification } = require('../services/notificationService')

// ─── Create team ──────────────────────────────────────────────────────────────

async function create(req, res) {
  const { name } = req.body
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Team name is required' })
  }

  try {
    const team = await createTeam(name.trim(), req.user.id)
    res.status(201).json({ team })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ─── Get current coach's team ─────────────────────────────────────────────────

/**
 * Returns team + my_access_level for any coach user:
 *   head_coach    → team owner
 *   admin_coach   → assistant with write access
 *   view_only     → assistant with read-only access
 *   null          → no team
 */
async function mine(req, res) {
  try {
    const { team, accessLevel } = await resolveCoachTeamAndAccess(req.user.id)
    res.json({ team, my_access_level: accessLevel })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ─── Athlete: join team ───────────────────────────────────────────────────────

async function join(req, res) {
  const { invite_code } = req.body
  if (!invite_code) {
    return res.status(400).json({ error: 'invite_code is required' })
  }

  try {
    const team = await getTeamByInviteCode(invite_code)
    const membership = await joinTeam(team.id, req.user.id)
    res.status(201).json({ team, membership })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Already a member of this team' })
    }
    if (err.code === 'PGRST116') {
      return res.status(404).json({ error: 'Invalid invite code' })
    }
    res.status(500).json({ error: err.message })
  }
}

// ─── Coach: join team as assistant ────────────────────────────────────────────

async function joinAsCoach(req, res) {
  const { coach_code } = req.body
  if (!coach_code) {
    return res.status(400).json({ error: 'coach_code is required' })
  }

  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coach accounts can join as a coach' })
    }

    // Prevent joining if already on a team
    const { team: existing } = await resolveCoachTeamAndAccess(req.user.id)
    if (existing) {
      return res.status(409).json({ error: 'You are already on a team' })
    }

    const team = await getTeamByCoachCode(coach_code.trim())
    const membership = await joinTeamAsCoach(team.id, req.user.id)

    // Notify the head coach
    try {
      await createCoachJoinNotification(team.coach_id, req.user.id, profile.full_name || 'A coach')
    } catch (notifErr) {
      console.error('[joinAsCoach] notification failed (non-fatal):', notifErr.message)
    }

    res.status(201).json({ team, membership })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Already a member of this team' })
    }
    if (err.code === 'PGRST116') {
      return res.status(404).json({ error: 'Invalid coach code' })
    }
    res.status(500).json({ error: err.message })
  }
}

// ─── Get assistant coaches list ───────────────────────────────────────────────

async function coaches(req, res) {
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Coaches only' })
    }

    const { team, accessLevel } = await resolveCoachTeamAndAccess(req.user.id)
    if (!team) return res.json({ coaches: [] })

    const coachList = await getTeamCoaches(team.id)
    res.json({ coaches: coachList, head_coach_id: team.coach_id, my_access_level: accessLevel })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ─── Update coach access level ────────────────────────────────────────────────

async function updateCoachAccess(req, res) {
  const { coachId } = req.params
  const { access_level } = req.body

  if (!['view_only', 'admin_coach'].includes(access_level)) {
    return res.status(400).json({ error: 'access_level must be "view_only" or "admin_coach"' })
  }

  try {
    const { team, accessLevel } = await resolveCoachTeamAndAccess(req.user.id)
    if (!team || accessLevel !== 'head_coach') {
      return res.status(403).json({ error: 'Only the head coach can manage assistant coach access' })
    }

    await updateCoachAccessLevel(team.id, coachId, access_level)
    res.json({ success: true })
  } catch (err) {
    if (err.status === 400) return res.status(400).json({ error: err.message })
    res.status(500).json({ error: err.message })
  }
}

// ─── Remove coach from team ───────────────────────────────────────────────────

async function removeCoach(req, res) {
  const { coachId } = req.params

  try {
    const { team, accessLevel } = await resolveCoachTeamAndAccess(req.user.id)
    if (!team || accessLevel !== 'head_coach') {
      return res.status(403).json({ error: 'Only the head coach can remove coaches' })
    }

    await removeCoachFromTeam(team.id, coachId)
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// ─── Athlete-facing team queries ──────────────────────────────────────────────

async function athleteTeam(req, res) {
  try {
    const team = await getAthleteTeam(req.user.id)
    res.json({ team })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function athleteTeams(req, res) {
  try {
    const teams = await getAthleteTeams(req.user.id)
    res.json({ teams })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = {
  create,
  mine,
  join,
  joinAsCoach,
  coaches,
  updateCoachAccess,
  removeCoach,
  athleteTeam,
  athleteTeams,
}
