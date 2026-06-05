const { getProfile } = require('../services/authService')
const { resolveCoachTeamAndAccess, getAthleteTeam } = require('../services/teamsService')
const {
  createBlueprint,
  getBlueprintsByCoach,
  getBlueprintsByTeam,
  getBlueprintById,
  getAssignments,
  assignBlueprint,
  bulkAssignBlueprint,
  getAthletePlan,
  toggleLock,
  getAthleteOverrides,
  saveAthleteOverrides,
} = require('../services/blueprintService')
const { createPost } = require('../services/feedService')

async function create(req, res) {
  const { title, description, num_weeks, weeks, locked } = req.body

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' })
  }
  if (!num_weeks || num_weeks < 1 || num_weeks > 16) {
    return res.status(400).json({ error: 'num_weeks must be between 1 and 16' })
  }

  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can create blueprints' })
    }

    const { team, accessLevel } = await resolveCoachTeamAndAccess(req.user.id, req.query.team_id || null)
    if (!team) {
      return res.status(400).json({ error: 'Create a team before building a blueprint' })
    }
    if (accessLevel === 'view_only') {
      return res.status(403).json({ error: 'View-only coaches cannot create blueprints' })
    }

    const blueprint = await createBlueprint(req.user.id, team.id, {
      title: title.trim(),
      description: description || null,
      num_weeks: parseInt(num_weeks, 10),
      weeks: weeks || [],
      locked: locked === true,
    })

    res.status(201).json({ blueprint })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function list(req, res) {
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can list blueprints' })
    }

    // Head coaches: use existing coach-scoped query
    // Assistant coaches: use team-scoped query so they can see the team's blueprints
    const { team, accessLevel } = await resolveCoachTeamAndAccess(req.user.id, req.query.team_id || null)
    let blueprints
    if (!team) {
      blueprints = []
    } else if (accessLevel === 'head_coach') {
      blueprints = await getBlueprintsByCoach(req.user.id)
    } else {
      blueprints = await getBlueprintsByTeam(team.id)
    }
    res.json({ blueprints })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function detail(req, res) {
  const { id } = req.params

  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can view blueprint details' })
    }

    const blueprint = await getBlueprintById(id)
    // Head coach: must own the blueprint. Assistant: must be on the same team.
    const { team, accessLevel } = await resolveCoachTeamAndAccess(req.user.id, req.query.team_id || null)
    const isOwner   = blueprint.coach_id === req.user.id
    const isSameTeam = team && blueprint.team_id === team.id
    if (!isOwner && !isSameTeam) {
      return res.status(403).json({ error: 'Not your blueprint' })
    }

    const assignments = await getAssignments(id)
    res.json({ blueprint, assignments })
  } catch (err) {
    if (err.code === 'PGRST116') {
      return res.status(404).json({ error: 'Blueprint not found' })
    }
    res.status(500).json({ error: err.message })
  }
}

async function assign(req, res) {
  const { id } = req.params
  const { assign_to, athlete_id, starts_on } = req.body

  if (!assign_to || !['team', 'athlete'].includes(assign_to)) {
    return res.status(400).json({ error: 'assign_to must be "team" or "athlete"' })
  }
  if (assign_to === 'athlete' && !athlete_id) {
    return res.status(400).json({ error: 'athlete_id is required when assigning to an athlete' })
  }

  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can assign blueprints' })
    }

    const blueprint = await getBlueprintById(id)
    const { team, accessLevel } = await resolveCoachTeamAndAccess(req.user.id, req.query.team_id || null)
    const isOwner    = blueprint.coach_id === req.user.id
    const isSameTeam = team && blueprint.team_id === team.id
    if (!isOwner && !isSameTeam) {
      return res.status(403).json({ error: 'Not your blueprint' })
    }
    if (accessLevel === 'view_only') {
      return res.status(403).json({ error: 'View-only coaches cannot assign blueprints' })
    }

    const assignment = await assignBlueprint(id, {
      assign_to,
      athlete_id: assign_to === 'athlete' ? athlete_id : null,
      team_id: assign_to === 'team' ? blueprint.team_id : null,
      starts_on,
    })

    res.status(201).json({ assignment })
  } catch (err) {
    if (err.code === 'PGRST116') {
      return res.status(404).json({ error: 'Blueprint not found' })
    }
    res.status(500).json({ error: err.message })
  }
}

async function myPlan(req, res) {
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'athlete') {
      return res.status(403).json({ error: 'Only athletes can view their plan' })
    }

    const { auto_plan, coach_plan } = await getAthletePlan(req.user.id)
    res.json({ auto_plan, coach_plan })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function lock(req, res) {
  const { id } = req.params
  const { locked } = req.body

  if (typeof locked !== 'boolean') {
    return res.status(400).json({ error: 'locked must be a boolean' })
  }

  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can lock blueprints' })
    }

    const blueprint = await getBlueprintById(id)
    if (blueprint.coach_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your blueprint' })
    }

    const updated = await toggleLock(id, locked)
    res.json({ blueprint: updated })
  } catch (err) {
    if (err.code === 'PGRST116') return res.status(404).json({ error: 'Blueprint not found' })
    res.status(500).json({ error: err.message })
  }
}

async function getOverrides(req, res) {
  const { athleteId } = req.params
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can view plan overrides' })
    }
    const result = await getAthleteOverrides(athleteId)
    res.json(result)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function saveOverrides(req, res) {
  const { athleteId } = req.params
  const { assignment_id, overrides } = req.body

  if (!assignment_id || !overrides) {
    return res.status(400).json({ error: 'assignment_id and overrides are required' })
  }

  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can save plan overrides' })
    }
    const { accessLevel } = await resolveCoachTeamAndAccess(req.user.id, req.query.team_id || null)
    if (accessLevel === 'view_only') {
      return res.status(403).json({ error: 'View-only coaches cannot edit plans' })
    }
    const result = await saveAthleteOverrides(athleteId, assignment_id, overrides)
    res.json({ override: result })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function bulkAssign(req, res) {
  const { id } = req.params
  const { athlete_ids, starts_on } = req.body

  if (!Array.isArray(athlete_ids) || athlete_ids.length === 0) {
    return res.status(400).json({ error: 'athlete_ids must be a non-empty array' })
  }

  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can assign blueprints' })
    }

    const blueprint = await getBlueprintById(id)
    const { team, accessLevel } = await resolveCoachTeamAndAccess(req.user.id, req.query.team_id || null)
    const isOwner    = blueprint.coach_id === req.user.id
    const isSameTeam = team && blueprint.team_id === team.id
    if (!isOwner && !isSameTeam) {
      return res.status(403).json({ error: 'Not your blueprint' })
    }
    if (accessLevel === 'view_only') {
      return res.status(403).json({ error: 'View-only coaches cannot assign blueprints' })
    }

    const assignments = await bulkAssignBlueprint(id, athlete_ids, starts_on)

    // Post to team feed so athletes are notified
    if (team) {
      const count = athlete_ids.length
      const msg = `📋 "${blueprint.title}" has been assigned to ${count} athlete${count === 1 ? '' : 's'}.`
      createPost(team.id, req.user.id, msg, null).catch(e =>
        console.error('[bulkAssign] feed notification failed:', e?.message)
      )
    }

    res.status(201).json({ assignments })
  } catch (err) {
    if (err.code === 'PGRST116') {
      return res.status(404).json({ error: 'Blueprint not found' })
    }
    res.status(500).json({ error: err.message })
  }
}

module.exports = { create, list, detail, assign, bulkAssign, myPlan, lock, getOverrides, saveOverrides }
