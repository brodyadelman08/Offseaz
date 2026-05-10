const { getProfile } = require('../services/authService')
const { getTeamByCoach, getAthleteTeam } = require('../services/teamsService')
const {
  createBlueprint,
  getBlueprintsByCoach,
  getBlueprintById,
  getAssignments,
  assignBlueprint,
  getAthletePlan,
} = require('../services/blueprintService')

async function create(req, res) {
  const { title, description, num_weeks, weeks } = req.body

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'Title is required' })
  }
  if (!num_weeks || num_weeks < 1 || num_weeks > 12) {
    return res.status(400).json({ error: 'num_weeks must be between 1 and 12' })
  }

  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can create blueprints' })
    }

    const team = await getTeamByCoach(req.user.id)
    if (!team) {
      return res.status(400).json({ error: 'Create a team before building a blueprint' })
    }

    const blueprint = await createBlueprint(req.user.id, team.id, {
      title: title.trim(),
      description: description || null,
      num_weeks: parseInt(num_weeks, 10),
      weeks: weeks || [],
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

    const blueprints = await getBlueprintsByCoach(req.user.id)
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
    if (blueprint.coach_id !== req.user.id) {
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
    if (blueprint.coach_id !== req.user.id) {
      return res.status(403).json({ error: 'Not your blueprint' })
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

    const plan = await getAthletePlan(req.user.id)
    res.json({ plan })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { create, list, detail, assign, myPlan }
