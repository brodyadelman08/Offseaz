const { getProfile } = require('../services/authService')
const { resolveCoachTeamAndAccess, getAthleteTeam, isAthleteOnTeam, filterAthleteIdsOnTeam } = require('../services/teamsService')
const { SPORT_TEMPLATES, TEMPLATE_GOALS, applyDeloadAdjustments, applyAccessoryProgression, applySessionOrganization, SPORT_ACCESSORY_ROTATION, resolveAccessoryCapKey } = require('../data/blueprintTemplates')
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
  deleteBlueprint,
  getAthleteOverrides,
  saveAthleteOverrides,
} = require('../services/blueprintService')
const { createPost } = require('../services/feedService')

// Coach-facing template catalog for the manual blueprint builder. This is the
// same server-authoritative data (and generator functions) used by auto-assign —
// there is no separate client-side copy of the exercise-selection logic.
async function listTemplates(req, res) {
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can view blueprint templates' })
    }
    // generateWeeks is a function on each sport entry — JSON.stringify drops it
    // automatically, so only the display metadata (id, label, positions, phases, etc.) is sent.
    res.json({ sports: SPORT_TEMPLATES, goals: TEMPLATE_GOALS })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function generateFromTemplate(req, res) {
  const { sport_id, position_id, goal_id, days_per_week } = req.body

  if (!sport_id || !position_id) {
    return res.status(400).json({ error: 'sport_id and position_id are required' })
  }

  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can generate blueprint templates' })
    }

    const sport = SPORT_TEMPLATES.find(s => s.id === sport_id)
    if (!sport) return res.status(400).json({ error: 'Unknown sport template' })

    const position = sport.positions.find(p => p.id === position_id)
    if (!position) return res.status(400).json({ error: 'Unknown position for this sport' })

    const goal = goal_id === 'muscle_gain' ? 'muscle_gain' : 'standard'
    const days = days_per_week ? parseInt(days_per_week, 10) : undefined

    const rotation = SPORT_ACCESSORY_ROTATION[sport.id] || {}
    const capKey = resolveAccessoryCapKey(sport.id, position_id, goal)
    const organized = applySessionOrganization(sport.generateWeeks(position_id, goal, days), rotation, capKey)
    const weeks = applyDeloadAdjustments(applyAccessoryProgression(organized, rotation))
    res.json({ weeks })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function create(req, res) {
  const { title, description, num_weeks, weeks, locked } = req.body

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' })
  }
  if (!num_weeks || num_weeks < 1 || num_weeks > 16) {
    return res.status(400).json({ error: 'num_weeks must be between 1 and 16' })
  }

  const numWeeksInt = parseInt(num_weeks, 10)

  if (!Array.isArray(weeks) || weeks.length !== numWeeksInt) {
    return res.status(400).json({ error: `weeks must be an array with exactly ${numWeeksInt} entries to match num_weeks` })
  }

  const seenWeekNumbers = new Set()
  for (const week of weeks) {
    const wn = week?.week_number
    if (!Number.isInteger(wn) || wn < 1 || wn > numWeeksInt) {
      return res.status(400).json({ error: `Each week must have a week_number between 1 and ${numWeeksInt}` })
    }
    if (seenWeekNumbers.has(wn)) {
      return res.status(400).json({ error: `Duplicate week_number ${wn} found in weeks` })
    }
    seenWeekNumbers.add(wn)

    if (week.sessions !== undefined && (!Array.isArray(week.sessions) || week.sessions.length > 20)) {
      return res.status(400).json({ error: `Week ${wn} has too many sessions — max 20 sessions per week` })
    }

    if (Array.isArray(week.sessions)) {
      for (const session of week.sessions) {
        if (session?.day && String(session.day).length > 100) {
          return res.status(400).json({ error: 'Session day is too long' })
        }
        if (session?.focus && String(session.focus).length > 200) {
          return res.status(400).json({ error: 'Session focus is too long' })
        }
        if (session?.description && String(session.description).length > 2000) {
          return res.status(400).json({ error: 'Session description too long' })
        }
      }
    }
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

    if (assign_to === 'athlete') {
      const onTeam = await isAthleteOnTeam(blueprint.team_id, athlete_id)
      if (!onTeam) {
        return res.status(403).json({ error: 'That athlete is not on your team' })
      }
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
    const { team } = await resolveCoachTeamAndAccess(req.user.id, req.query.team_id || null)
    if (!team) {
      return res.status(403).json({ error: 'No team found' })
    }
    const onTeam = await isAthleteOnTeam(team.id, athleteId)
    if (!onTeam) {
      return res.status(403).json({ error: 'That athlete is not on your team' })
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
    const { team, accessLevel } = await resolveCoachTeamAndAccess(req.user.id, req.query.team_id || null)
    if (!team) {
      return res.status(403).json({ error: 'No team found' })
    }
    if (accessLevel === 'view_only') {
      return res.status(403).json({ error: 'View-only coaches cannot edit plans' })
    }
    const onTeam = await isAthleteOnTeam(team.id, athleteId)
    if (!onTeam) {
      return res.status(403).json({ error: 'That athlete is not on your team' })
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

    // Silently drop any athlete id that isn't actually on this blueprint's team
    // before inserting — prevents assigning to athletes from other teams.
    const validAthleteIds = await filterAthleteIdsOnTeam(blueprint.team_id, athlete_ids)
    if (validAthleteIds.length === 0) {
      return res.status(400).json({ error: 'None of the provided athletes are on your team' })
    }

    const assignments = await bulkAssignBlueprint(id, validAthleteIds, starts_on)

    // Post to team feed so athletes are notified
    if (team) {
      const count = validAthleteIds.length
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

async function remove(req, res) {
  const { id } = req.params
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can delete blueprints' })
    }

    const blueprint = await getBlueprintById(id)
    if (blueprint.coach_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your blueprint' })
    }

    await deleteBlueprint(id)
    res.status(204).send()
  } catch (err) {
    if (err.code === 'PGRST116') {
      return res.status(404).json({ error: 'Blueprint not found' })
    }
    res.status(500).json({ error: err.message })
  }
}

module.exports = { listTemplates, generateFromTemplate, create, list, detail, assign, bulkAssign, myPlan, lock, remove, getOverrides, saveOverrides }
