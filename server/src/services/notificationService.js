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

async function dismissAthleteNotifications(coachId, athleteId) {
  const { error } = await supabaseAdmin
    .from('coach_notifications')
    .update({ dismissed_at: new Date().toISOString() })
    .eq('coach_id', coachId)
    .eq('athlete_id', athleteId)
    .is('dismissed_at', null)

  if (error) throw error
}

module.exports = { createInjuryNotification, getCoachNotifications, dismissAthleteNotifications }
