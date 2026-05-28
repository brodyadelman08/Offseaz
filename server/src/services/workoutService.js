const supabaseAdmin = require('../config/supabase')

async function logSession(athleteId, { blueprint_week_id, session_index, status, effort, note }) {
  const isSkip = status === 'skipped' || status === 'skipped_injury'
  const row = {
    athlete_id: athleteId,
    blueprint_week_id,
    session_index,
    status,
    effort: isSkip ? null : (effort || null),
    note: note || null,
  }

  const { data, error } = await supabaseAdmin
    .from('workout_logs')
    .upsert(row, { onConflict: 'athlete_id,blueprint_week_id,session_index' })
    .select()
    .single()

  if (error) throw error
  return data
}

async function getAthleteLog(athleteId) {
  const { data, error } = await supabaseAdmin
    .from('workout_logs')
    .select('id, blueprint_week_id, session_index, status, effort, note, logged_at')
    .eq('athlete_id', athleteId)

  if (error) throw error
  return data || []
}

async function getTeamLogs(coachId) {
  // Find the coach's team
  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('coach_id', coachId)
    .single()

  if (teamError && teamError.code !== 'PGRST116') throw teamError
  if (!team) return []

  // Get athlete IDs on this team
  const { data: members, error: memberError } = await supabaseAdmin
    .from('team_members')
    .select('athlete_id')
    .eq('team_id', team.id)

  if (memberError) throw memberError
  if (!members || members.length === 0) return []

  const athleteIds = members.map(m => m.athlete_id)

  // Fetch logs with profile info and week info
  const { data: logs, error: logsError } = await supabaseAdmin
    .from('workout_logs')
    .select(`
      id, status, effort, note, logged_at, session_index,
      profiles!workout_logs_athlete_id_fkey ( full_name ),
      blueprint_weeks!workout_logs_blueprint_week_id_fkey ( week_number, sessions )
    `)
    .in('athlete_id', athleteIds)
    .order('logged_at', { ascending: false })
    .limit(20)

  if (logsError) throw logsError

  return (logs || []).map(log => ({
    id: log.id,
    status: log.status,
    effort: log.effort,
    note: log.note,
    logged_at: log.logged_at,
    week_number: log.blueprint_weeks?.week_number ?? null,
    session_focus: log.blueprint_weeks?.sessions?.[log.session_index]?.focus ?? null,
    athlete_name: log.profiles?.full_name ?? null,
  }))
}

module.exports = { logSession, getAthleteLog, getTeamLogs }
