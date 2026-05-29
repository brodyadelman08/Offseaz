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

  // 4. Notify the coach (fire-and-forget — don't block on failure)
  createBlueprintNotification(coachId, athleteId, athleteName, title).catch(e =>
    console.error('[autoAssignBlueprint] notification failed:', e?.message)
  )

  console.log(`[autoAssignBlueprint] SUCCESS — "${title}" assigned to athlete ${athleteId}`)
  return blueprint
}

module.exports = { autoAssignBlueprint }
