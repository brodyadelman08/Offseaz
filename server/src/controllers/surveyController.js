const { submitSurvey, updateSurvey, getSurveyByAthlete, getTeamSurveys, updatePhysicalStats } = require('../services/surveyService')
const { getAthleteTeam } = require('../services/teamsService')
const { getProfile } = require('../services/authService')
const { createInjuryNotification } = require('../services/notificationService')
const { autoAssignBlueprint, regenerateUpcomingWeeks, programmingFieldsChanged } = require('../services/autoAssignService')

// "Other" never drives any automatic exercise substitution or caution badge
// (see applyInjuryAdjustments in blueprintTemplates.js) — the coach
// notification message is the ONLY place that information reaches anyone,
// so a blank description would mean the flag goes nowhere. Mirrors the
// client-side canAdvance() check in Survey.jsx — this is the server-side
// half of the same rule, not a replacement for it.
function otherInjuryDescriptionMissing(injuryAreas, injuryOther) {
  return (injuryAreas || []).includes('Other') && !(injuryOther && injuryOther.trim())
}

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
  if (otherInjuryDescriptionMissing(injury_areas, injury_other)) {
    return res.status(400).json({ error: 'Please describe the injury when "Other" is selected' })
  }

  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'athlete') {
      return res.status(403).json({ error: 'Only athletes can submit surveys' })
    }

    // Team is OPTIONAL — athletes can complete the survey and get a preview
    // blueprint without joining a team first.
    const team = await getAthleteTeam(req.user.id).catch(() => null)

    const survey = await submitSurvey(req.user.id, team?.id || null, {
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

    // Notify coach only if athlete is on a team and flagged an injury.
    // "Other" is what actually needs the coach's eyes — everything else
    // already shows up as a real substitution/badge in the plan itself.
    const hasInjury = (injury_areas || []).some(a => a !== 'None')
    if (hasInjury && team?.coach_id) {
      const otherDescription = (injury_areas || []).includes('Other') ? injury_other?.trim() || null : null
      createInjuryNotification(team.coach_id, req.user.id, athleteName, otherDescription).catch(e =>
        console.error('Injury notification failed (submit):', e)
      )
    }

    // Auto-assign a blueprint only when the athlete is on a team.
    // Without a team there is no coach_id, so the blueprints insert would fail
    // (coach_id NOT NULL).  Teamless athletes see a locked preview once they
    // join a team — no blueprint record is needed yet.
    if (team?.id && team?.coach_id) {
      console.log('[survey/submit] team found — running autoAssignBlueprint', { teamId: team.id, coachId: team.coach_id })
      autoAssignBlueprint(req.user.id, team.id, team.coach_id, survey, athleteName).catch(e =>
        console.error('[survey/submit] autoAssignBlueprint failed:', e?.message || e)
      )
    } else {
      console.log('[survey/submit] no team — skipping autoAssignBlueprint for teamless athlete')
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
  if (otherInjuryDescriptionMissing(injury_areas, injury_other)) {
    return res.status(400).json({ error: 'Please describe the injury when "Other" is selected' })
  }

  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'athlete') {
      return res.status(403).json({ error: 'Only athletes can update surveys' })
    }

    // Snapshot the pre-retake answers so we can tell afterward whether
    // anything that actually drives blueprint generation changed.
    const oldSurvey = await getSurveyByAthlete(req.user.id).catch(() => null)

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

    const athleteName = (full_name && full_name.trim()) || profile.full_name || 'An athlete'
    const team = await getAthleteTeam(req.user.id).catch(() => null)

    // Notify coach if athlete flagged any injury area
    const hasInjury = (injury_areas || []).some(a => a !== 'None')
    if (hasInjury && team?.coach_id) {
      const otherDescription = (injury_areas || []).includes('Other') ? injury_other?.trim() || null : null
      createInjuryNotification(team.coach_id, req.user.id, athleteName, otherDescription).catch(e =>
        console.error('Injury notification failed (update):', e)
      )
    }

    // Retaking the survey only touches the plan if the athlete is on a team
    // (same rule as first-time submit — no coach_id, nothing to assign) AND
    // an answer that actually feeds blueprint generation changed. If nothing
    // programming-relevant changed, the plan resumes exactly as-is.
    if (team?.id && team?.coach_id) {
      if (programmingFieldsChanged(oldSurvey, survey)) {
        console.log('[survey/update] programming-relevant answers changed — regenerating upcoming weeks', {
          athleteId: req.user.id, teamId: team.id, coachId: team.coach_id,
        })
        regenerateUpcomingWeeks(req.user.id, team.id, team.coach_id, survey, athleteName).catch(e =>
          console.error('[survey/update] regenerateUpcomingWeeks failed:', e?.message || e)
        )
      } else {
        console.log('[survey/update] no programming-relevant changes — plan resumes unchanged', { athleteId: req.user.id })
      }
    } else {
      console.log('[survey/update] no team — skipping plan regeneration for teamless athlete')
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
    if (err.status === 403) return res.status(403).json({ error: err.message })
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

module.exports = { submit, update, mysurvey, teamSurveys, updatePhysical, otherInjuryDescriptionMissing }
