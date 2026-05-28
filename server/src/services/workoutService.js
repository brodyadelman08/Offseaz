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

  // Get athlete IDs with join dates
  const { data: members, error: memberError } = await supabaseAdmin
    .from('team_members')
    .select('athlete_id, joined_at')
    .eq('team_id', team.id)

  if (memberError) throw memberError
  if (!members || members.length === 0) return []

  const athleteIds = members.map(m => m.athlete_id)
  const joinedMap = {}
  for (const m of members) joinedMap[m.athlete_id] = m.joined_at

  // Fetch all activity sources in parallel — no FK hint joins (avoids PostgREST constraint name issues)
  const [profilesRes, logsRes, surveysRes, assignmentsRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, full_name').in('id', athleteIds),
    supabaseAdmin.from('workout_logs')
      .select('id, athlete_id, blueprint_week_id, session_index, status, effort, note, logged_at')
      .in('athlete_id', athleteIds)
      .order('logged_at', { ascending: false })
      .limit(30),
    supabaseAdmin.from('survey_responses')
      .select('athlete_id, created_at')
      .in('athlete_id', athleteIds),
    supabaseAdmin.from('blueprint_assignments')
      .select('id, athlete_id, assigned_at, blueprint_id')
      .in('athlete_id', athleteIds),
  ])

  // Build profile name map
  const profileMap = {}
  for (const p of profilesRes.data || []) profileMap[p.id] = p.full_name || 'Athlete'

  // Look up blueprint titles
  const bpIds = [...new Set((assignmentsRes.data || []).map(a => a.blueprint_id).filter(Boolean))]
  let bpTitleMap = {}
  if (bpIds.length > 0) {
    const { data: bps } = await supabaseAdmin.from('blueprints').select('id, title').in('id', bpIds)
    for (const bp of bps || []) bpTitleMap[bp.id] = bp.title
  }

  // Look up blueprint week data (session focus + week number) for workout logs
  const rawLogs = logsRes.data || []
  const weekIds = [...new Set(rawLogs.map(l => l.blueprint_week_id).filter(Boolean))]
  let weekMap = {}
  if (weekIds.length > 0) {
    const { data: weeks } = await supabaseAdmin
      .from('blueprint_weeks').select('id, week_number, sessions').in('id', weekIds)
    for (const w of weeks || []) weekMap[w.id] = w
  }

  const events = []

  // Parse injury exercise names from the ⚠️ note prefix
  function parseInjuryExercises(note) {
    if (!note) return null
    const match = note.match(/⚠️ Cannot complete: (.+)/i)
    if (!match) return null
    return match[1].split(',').map(s => s.trim()).filter(Boolean)
  }

  // Workout log events
  for (const log of rawLogs) {
    const week = weekMap[log.blueprint_week_id]
    const injuryExercises = log.status === 'skipped_injury' ? parseInjuryExercises(log.note) : null
    events.push({
      id: `workout-${log.id}`,
      type: 'workout',
      athlete_id: log.athlete_id,
      athlete_name: profileMap[log.athlete_id] || 'Athlete',
      timestamp: log.logged_at,
      status: log.status,
      effort: log.effort,
      session_focus: week?.sessions?.[log.session_index]?.focus ?? null,
      week_number: week?.week_number ?? null,
      injury_exercises: injuryExercises,
    })
  }

  // Team join events
  for (const athleteId of athleteIds) {
    const joinedAt = joinedMap[athleteId]
    if (joinedAt) {
      events.push({
        id: `joined-${athleteId}`,
        type: 'joined',
        athlete_id: athleteId,
        athlete_name: profileMap[athleteId] || 'Athlete',
        timestamp: joinedAt,
      })
    }
  }

  // Survey submission events
  for (const survey of surveysRes.data || []) {
    if (survey.created_at) {
      events.push({
        id: `survey-${survey.athlete_id}`,
        type: 'survey',
        athlete_id: survey.athlete_id,
        athlete_name: profileMap[survey.athlete_id] || 'Athlete',
        timestamp: survey.created_at,
      })
    }
  }

  // Blueprint assignment events (individual athlete assignments only)
  for (const assignment of assignmentsRes.data || []) {
    if (assignment.athlete_id && assignment.assigned_at) {
      events.push({
        id: `blueprint-${assignment.id}`,
        type: 'blueprint',
        athlete_id: assignment.athlete_id,
        athlete_name: profileMap[assignment.athlete_id] || 'Athlete',
        timestamp: assignment.assigned_at,
        blueprint_title: bpTitleMap[assignment.blueprint_id] ?? null,
      })
    }
  }

  // Sort newest-first, return top 20
  events.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
  return events.slice(0, 20)
}

module.exports = { logSession, getAthleteLog, getTeamLogs }
