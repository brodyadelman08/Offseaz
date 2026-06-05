const { submitSurvey, updateSurvey, getSurveyByAthlete, getTeamSurveys, updatePhysicalStats } = require('../services/surveyService')
const { getAthleteTeam } = require('../services/teamsService')
const { getProfile } = require('../services/authService')
const { createInjuryNotification } = require('../services/notificationService')
const { autoAssignBlueprint } = require('../services/autoAssignService')

async function submit(req, res) {
  const {
    full_name,
    age, height_feet, height_inches, weight_lbs, grade,
    sport, position,
    primary_goal, experience_level, days_per_week,
    equipment_tier,
    injury_areas, injury_other, injury_notes,
    weakness_areas,
    offseason_goals,
  } = req.body

  if (!sport || !sport.trim()) {
    return res.status(400).json({ error: 'Sport is required' })
  }

  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'athlete') {
      return res.status(403).json({ error: 'Only athletes can submit surveys' })
    }

    const team = await getAthleteTeam(req.user.id)
    if (!team) {
      return res.status(400).json({ error: 'You must be on a team before submitting a survey' })
    }

    const survey = await submitSurvey(req.user.id, team.id, {
      full_name,
      age, height_feet, height_inches, weight_lbs, grade,
      sport: sport.trim(),
      position,
      primary_goal,
      experience_level,
      days_per_week,
      equipment_tier,
      injury_areas,
      injury_other,
      injury_notes,
      weakness_areas,
      offseason_goals,
    })

    const athleteName = (full_name && full_name.trim()) || profile.full_name || 'An athlete'

    // Notify coach if athlete flagged any injury area
    const hasInjury = (injury_areas || []).some(a => a !== 'None')
    if (hasInjury && team.coach_id) {
      createInjuryNotification(team.coach_id, req.user.id, athleteName).catch(e =>
        console.error('Injury notification failed (submit):', e)
      )
    }

    // Auto-assign a blueprint based on sport/goal — fire-and-forget
    console.log('[survey/submit] team:', { id: team?.id, coach_id: team?.coach_id })
    if (team.coach_id) {
      console.log('[survey/submit] triggering autoAssignBlueprint for athlete', req.user.id)
      autoAssignBlueprint(req.user.id, team.id, team.coach_id, survey, athleteName).catch(e =>
        console.error('[survey/submit] autoAssignBlueprint failed:', e?.message || e)
      )
    } else {
      console.warn('[survey/submit] team has no coach_id — skipping auto-assign. team:', team)
    }

    res.status(201).json({ survey })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Survey already submitted' })
    }
    res.status(500).json({ error: err.message })
  }
}

async function update(req, res) {
  const {
    full_name,
    age, height_feet, height_inches, weight_lbs, grade,
    sport, position,
    primary_goal, experience_level, days_per_week,
    equipment_tier,
    injury_areas, injury_other, injury_notes,
    weakness_areas,
    offseason_goals,
  } = req.body

  if (!sport || !sport.trim()) {
    return res.status(400).json({ error: 'Sport is required' })
  }

  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'athlete') {
      return res.status(403).json({ error: 'Only athletes can update surveys' })
    }

    const survey = await updateSurvey(req.user.id, {
      full_name,
      age, height_feet, height_inches, weight_lbs, grade,
      sport: sport.trim(),
      position,
      primary_goal,
      experience_level,
      days_per_week,
      equipment_tier,
      injury_areas,
      injury_other,
      injury_notes,
      weakness_areas,
      offseason_goals,
    })

    // Notify coach if athlete flagged any injury area
    const hasInjury = (injury_areas || []).some(a => a !== 'None')
    if (hasInjury) {
      try {
        const team = await getAthleteTeam(req.user.id)
        if (team?.coach_id) {
          const athleteName = (full_name && full_name.trim()) || profile.full_name || 'An athlete'
          createInjuryNotification(team.coach_id, req.user.id, athleteName).catch(e =>
            console.error('Injury notification failed (update):', e)
          )
        }
      } catch (e) {
        console.error('Could not look up team for injury notification:', e)
      }
    }

    res.json({ survey })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function mysurvey(req, res) {
  try {
    const survey = await getSurveyByAthlete(req.user.id)
    res.json({ survey })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function teamSurveys(req, res) {
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can view team surveys' })
    }

    const athletes = await getTeamSurveys(req.user.id, req.query.team_id || null)
    res.json({ athletes })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function updatePhysical(req, res) {
  const { height_feet, height_inches, weight_lbs } = req.body
  try {
    const survey = await updatePhysicalStats(req.user.id, { height_feet, height_inches, weight_lbs })
    res.json({ survey })
  } catch (err) {
    if (err.code === 'PGRST116') {
      return res.status(404).json({ error: 'Survey not found — complete your athlete survey first' })
    }
    res.status(500).json({ error: err.message })
  }
}

module.exports = { submit, update, mysurvey, teamSurveys, updatePhysical }
