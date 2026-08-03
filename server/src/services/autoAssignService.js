const supabaseAdmin = require('../config/supabase')
const { generateBlueprintForAthlete } = require('../data/blueprintTemplates')
const { createBlueprint, getAthleteAutoAssignment, updateBlueprintUpcomingWeeks } = require('./blueprintService')
const { createBlueprintNotification } = require('./notificationService')

// Survey fields that actually feed generateBlueprintForAthlete() — see
// normalizeSport/normalizePosition/normalizeGoal/normalizeExperience and the
// injury-substitution pass in server/src/data/blueprintTemplates.js. Any
// other field changing (name, weight, goals text, etc.) has no effect on
// programming and should not trigger a regeneration.
const PROGRAMMING_FIELDS = ['sport', 'position', 'primary_goal', 'experience_level', 'time_per_week', 'injury_areas']

/**
 * True if any survey field that actually drives blueprint generation changed
 * between the old and new survey rows. Used by survey retake to decide
 * whether the athlete's plan needs to change at all.
 */
function programmingFieldsChanged(oldSurvey, newSurvey) {
  if (!oldSurvey) return true
  for (const field of PROGRAMMING_FIELDS) {
    const oldVal = oldSurvey[field]
    const newVal = newSurvey[field]
    if (Array.isArray(oldVal) || Array.isArray(newVal)) {
      const a = JSON.stringify([...(oldVal || [])].sort())
      const b = JSON.stringify([...(newVal || [])].sort())
      if (a !== b) return true
    } else if ((oldVal ?? null) !== (newVal ?? null)) {
      return true
    }
  }
  return false
}

/**
 * Auto-generate and assign a blueprint when an athlete completes their survey.
 * Called fire-and-forget from surveyController — errors are logged, not thrown.
 *
 * @param {string} athleteId
 * @param {string} teamId
 * @param {string} coachId
 * @param {object} survey   - survey_responses row (needs sport, position, primary_goal, time_per_week)
 * @param {string} athleteName
 */
async function autoAssignBlueprint(athleteId, teamId, coachId, survey, athleteName) {
  console.log('[autoAssignBlueprint] START', {
    athleteId, teamId, coachId,
    sport: survey?.sport,
    primary_goal: survey?.primary_goal,
    position: survey?.position,
    time_per_week: survey?.time_per_week,
  })

  // 1. Generate weeks from the template system
  let blueprintData
  try {
    blueprintData = generateBlueprintForAthlete(survey)
    console.log('[autoAssignBlueprint] template generated:', blueprintData?.title, '— weeks:', blueprintData?.weeks?.length)
  } catch (err) {
    console.error('[autoAssignBlueprint] generateBlueprintForAthlete threw:', err)
    throw err
  }

  if (!blueprintData) {
    console.error('[autoAssignBlueprint] generateBlueprintForAthlete returned null — aborting')
    return null
  }

  const { title, description, num_weeks, weeks } = blueprintData

  // 2. Create the blueprint row + all 16 blueprint_weeks rows
  let blueprint
  try {
    blueprint = await createBlueprint(coachId, teamId, { title, description, num_weeks, weeks, locked: false })
    console.log('[autoAssignBlueprint] blueprint row created, id:', blueprint?.id)
  } catch (err) {
    console.error('[autoAssignBlueprint] createBlueprint failed:', err?.message, err?.code, err?.details)
    throw err
  }

  // 3. Insert the blueprint_assignment for this athlete
  const today = new Date().toISOString().split('T')[0]
  const { data: assignment, error: assignError } = await supabaseAdmin
    .from('blueprint_assignments')
    .insert({
      blueprint_id: blueprint.id,
      athlete_id:   athleteId,
      team_id:      null,
      starts_on:    today,
    })
    .select()
    .single()

  if (assignError) {
    console.error('[autoAssignBlueprint] blueprint_assignments insert failed:', assignError?.message, assignError?.code, assignError?.details)
    throw assignError
  }

  console.log('[autoAssignBlueprint] assignment row created, id:', assignment?.id)

  // 4. Notify the coach — only if there is one (teamless preview has no coach)
  if (coachId) {
    createBlueprintNotification(coachId, athleteId, athleteName, title).catch(e =>
      console.error('[autoAssignBlueprint] notification failed:', e?.message)
    )
  }

  console.log(`[autoAssignBlueprint] SUCCESS — "${title}" assigned to athlete ${athleteId}`)
  return blueprint
}

/**
 * Called fire-and-forget from surveyController.update() when a retake
 * changed a programming-relevant answer. Regenerates a full fresh 16-week
 * template from the new survey, then overwrites ONLY the blueprint_weeks
 * rows from the athlete's current position onward — weeks before that are
 * never touched, so completed history (and the workout_logs pointing at
 * those exact blueprint_week_id rows) survives untouched.
 *
 * If the athlete has no existing auto-generated plan (e.g. they completed
 * the survey teamless and only just joined a team), this behaves exactly
 * like a first-time assignment — there is no history to preserve.
 *
 * @param {string} athleteId
 * @param {string} teamId
 * @param {string} coachId
 * @param {object} survey   - the athlete's UPDATED survey_responses row
 * @param {string} athleteName
 */
async function regenerateUpcomingWeeks(athleteId, teamId, coachId, survey, athleteName) {
  console.log('[regenerateUpcomingWeeks] START', { athleteId, teamId, coachId })

  const existing = await getAthleteAutoAssignment(athleteId)

  if (!existing) {
    console.log('[regenerateUpcomingWeeks] no existing auto-generated plan — assigning fresh')
    return autoAssignBlueprint(athleteId, teamId, coachId, survey, athleteName)
  }

  const { assignment, blueprint } = existing
  const currentWeek = Math.max(1, assignment.current_week || 1)
  console.log('[regenerateUpcomingWeeks] existing plan found', {
    blueprintId: blueprint.id, assignmentId: assignment.id, currentWeek,
  })

  let blueprintData
  try {
    blueprintData = generateBlueprintForAthlete(survey)
  } catch (err) {
    console.error('[regenerateUpcomingWeeks] generateBlueprintForAthlete threw:', err)
    throw err
  }

  if (!blueprintData) {
    console.error('[regenerateUpcomingWeeks] generateBlueprintForAthlete returned null — aborting')
    return null
  }

  const { title, description, weeks } = blueprintData

  // Weeks before currentWeek are the athlete's immutable history — only
  // regenerate currentWeek and everything after it.
  const upcomingWeeks = weeks.filter(w => w.week_number >= currentWeek)
  console.log(`[regenerateUpcomingWeeks] regenerating weeks ${currentWeek}-${blueprint.num_weeks}, preserving weeks 1-${currentWeek - 1}`)

  try {
    await updateBlueprintUpcomingWeeks(blueprint.id, { title, description }, upcomingWeeks)
  } catch (err) {
    console.error('[regenerateUpcomingWeeks] updateBlueprintUpcomingWeeks failed:', err?.message, err?.code, err?.details)
    throw err
  }

  if (coachId) {
    createBlueprintNotification(coachId, athleteId, athleteName, title).catch(e =>
      console.error('[regenerateUpcomingWeeks] notification failed:', e?.message)
    )
  }

  console.log(`[regenerateUpcomingWeeks] SUCCESS — "${title}" updated for athlete ${athleteId} from week ${currentWeek} onward`)
  return blueprint
}

module.exports = { autoAssignBlueprint, regenerateUpcomingWeeks, programmingFieldsChanged }
