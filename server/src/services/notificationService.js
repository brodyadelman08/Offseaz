const supabaseAdmin = require('../config/supabase')
const { isUserOnTeam } = require('./teamsService')

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

// coach_notifications has no team_id column of its own (see schema.sql) — for
// every notification type, `athlete_id` is always a team_members row for the
// relevant team (a real athlete for injury_flag/blueprint_assigned/
// program_complete; an assistant/head coach's own id, reused via the same
// column, for coach_joined/ownership_transfer — transferOwnership() confirms
// the new head coach is already a team_members row before notifying them).
// So scoping to one team, without a schema change, means intersecting the
// coach's notifications with that team's team_members.athlete_id set.
async function getCoachNotifications(coachId, teamId = null) {
  if (teamId && !(await isUserOnTeam(coachId, teamId))) {
    // A caller-supplied team_id was never checked before — without this, any
    // coach could pass another team's id and see who's on its roster via
    // which notifications come back scoped to it.
    throw Object.assign(new Error('That team is not yours'), { status: 403 })
  }

  let query = supabaseAdmin
    .from('coach_notifications')
    .select('id, athlete_id, type, message, created_at')
    .eq('coach_id', coachId)
    .is('dismissed_at', null)
    .order('created_at', { ascending: false })

  if (teamId) {
    const { data: members, error: memberErr } = await supabaseAdmin
      .from('team_members').select('athlete_id').eq('team_id', teamId)
    if (memberErr) throw memberErr
    const memberIds = new Set((members || []).map(m => m.athlete_id))
    if (memberIds.size === 0) return []
    query = query.in('athlete_id', [...memberIds])
  }

  const { data, error } = await query
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

async function createProgramCompletionNotification(coachId, athleteId, athleteName) {
  const { error } = await supabaseAdmin
    .from('coach_notifications')
    .upsert(
      {
        coach_id:    coachId,
        athlete_id:  athleteId,
        type:        'program_complete',
        message:     `${athleteName} completed their 16-week program and is waiting for a new plan. Tap to assign one.`,
        dismissed_at: null,
        created_at:  new Date().toISOString(),
      },
      { onConflict: 'coach_id,athlete_id,type' }
    )

  if (error) throw error
}

async function createOwnershipTransferNotification(newHeadCoachId, teamName) {
  const { error } = await supabaseAdmin
    .from('coach_notifications')
    .insert({
      coach_id:   newHeadCoachId,
      athlete_id: newHeadCoachId,   // self-notification; athlete_id col reused
      type:       'ownership_transfer',
      message:    `You are now the head coach of ${teamName}. You have full admin access.`,
      dismissed_at: null,
      created_at: new Date().toISOString(),
    })

  if (error) throw error
}

module.exports = {
  createInjuryNotification,
  createBlueprintNotification,
  createCoachJoinNotification,
  createProgramCompletionNotification,
  createOwnershipTransferNotification,
  getCoachNotifications,
  dismissAthleteNotifications,
}
