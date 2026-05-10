const { submitSurvey, getSurveyByAthlete, getTeamSurveys } = require('../services/surveyService')
const { getAthleteTeam } = require('../services/teamsService')
const { getProfile } = require('../services/authService')

async function submit(req, res) {
  const { sport, position, goals, weaknesses, injury_history, equipment, time_per_week } = req.body

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
      sport: sport.trim(),
      position,
      goals,
      weaknesses,
      injury_history,
      equipment,
      time_per_week,
    })

    res.status(201).json({ survey })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Survey already submitted' })
    }
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

module.exports = { submit, mysurvey, teamSurveys }
