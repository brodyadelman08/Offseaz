const supabaseAdmin = require('../config/supabase')
const { generateBlueprintForAthlete } = require('../data/blueprintTemplates')
const { createBlueprint } = require('./blueprintService')
const { createBlueprintNotification } = require('./notificationService')

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
  // Generate weeks from the template system
  const blueprintData = generateBlueprintForAthlete(survey)
  if (!blueprintData) {
    console.log('[autoAssignBlueprint] no template found for survey:', survey.sport)
    return null
  }

  const { title, description, num_weeks, weeks } = blueprintData

  // Create the blueprint under the coach's account
  const blueprint = await createBlueprint(coachId, teamId, {
    title,
    description,
    num_weeks,
    weeks,
    locked: false,
  })

  // Assign directly to the athlete (not the whole team)
  const today = new Date().toISOString().split('T')[0]
  const { error: assignError } = await supabaseAdmin
    .from('blueprint_assignments')
    .insert({
      blueprint_id: blueprint.id,
      athlete_id:   athleteId,
      team_id:      null,
      starts_on:    today,
    })

  if (assignError) throw assignError

  // Notify the coach (fire-and-forget — don't block if this fails)
  createBlueprintNotification(coachId, athleteId, athleteName, title).catch(e =>
    console.error('[autoAssignBlueprint] notification failed:', e)
  )

  console.log(`[autoAssignBlueprint] assigned "${title}" to athlete ${athleteId}`)
  return blueprint
}

module.exports = { autoAssignBlueprint }
