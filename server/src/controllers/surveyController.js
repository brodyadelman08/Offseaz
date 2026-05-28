const { submitSurvey, updateSurvey, getSurveyByAthlete, getTeamSurveys } = require('../services/surveyService')
const { getAthleteTeam } = require('../services/teamsService')
const { getProfile } = require('../services/authService')
const { createInjuryNotification } = require('../services/notificationService')

async function submit(req, res) {
  const {
    full_name,
    age, height_feet, height_inches, weight_lbs, grade,
    sport, position,
    primary_goal, experience_level, days_per_week,
    equipment_tier,
    injury_areas, injury_other,
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
      weakness_areas,
      offseason_goals,
    })

    // Notify coach if athlete flagged any injury area
    const hasInjury = (injury_areas || []).some(a => a !== 'None')
    if (hasInjury && team.coach_id) {
      const athleteName = (full_name && full_name.trim()) || profile.full_name || 'An athlete'
      createInjuryNotification(team.coach_id, req.user.id, athleteName).catch(e =>
        console.error('Injury notification failed (submit):', e)
      )
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
    injury_areas, injury_other,
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

    const athletes = await getTeamSurveys(req.user.id)
    res.json({ athletes })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { submit, update, mysurvey, teamSurveys }
