const supabaseAdmin = require('../config/supabase')

async function createInjuryNotification(coachId, athleteId, athleteName) {
  // Upsert — re-alerts the coach even if they've already seen a previous injury flag
  const { error } = await supabaseAdmin
    .from('coach_notifications')
    .upsert(
      {
        coach_id: coachId,
        athlete_id: athleteId,
        type: 'injury_flag',
        message: `${athleteName} flagged an injury — tap to review their profile.`,
        dismissed_at: null,
        created_at: new Date().toISOString(),
      },
      { onConflict: 'coach_id,athlete_id,type' }
    )

  if (error) throw error
}

async function createBlueprintNotification(coachId, athleteId, athleteName, blueprintTitle) {
  const { error } = await supabaseAdmin
    .from('coach_notifications')
    .upsert(
      {
        coach_id:    coachId,
        athlete_id:  athleteId,
        type:        'blueprint_assigned',
        message:     `${athleteName} completed their survey — a blueprint was auto-assigned: "${blueprintTitle}". Tap to review.`,
        dismissed_at: null,
        created_at:  new Date().toISOString(),
      },
      { onConflict: 'coach_id,athlete_id,type' }
    )

  if (error) throw error
}

async function getCoachNotifications(coachId) {
  const { data, error } = await supabaseAdmin
    .from('coach_notifications')
    .select('id, athlete_id, type, message, created_at')
    .eq('coach_id', coachId)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

async function createCoachJoinNotification(headCoachId, newCoachId, newCoachName) {
  const { error } = await supabaseAdmin
    .from('coach_notifications')
    .upsert(
      {
        coach_id:    headCoachId,
        athlete_id:  newCoachId,   // reuses athlete_id column to store the new coach's user id
        type:        'coach_joined',
        message:     `${newCoachName} joined your team as a coach. Go to Roster → Coaches to manage their access.`,
        dismissed_at: null,
        created_at:  new Date().toISOString(),
      },
      { onConflict: 'coach_id,athlete_id,type' }
    )

  if (error) throw error
}

async function dismissAthleteNotifications(coachId, athleteId) {
  const { error } = await supabaseAdmin
    .from('coach_notifications')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('coach_id', coachId)
    .eq('athlete_id', athleteId)
    .is('dismissed_at', null)

  if (error) throw error
}

module.exports = { createInjuryNotification, createBlueprintNotification, createCoachJoinNotification, getCoachNotifications, dismissAthleteNotifications }
