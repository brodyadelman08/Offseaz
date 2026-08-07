const supabaseAdmin = require('../config/supabase')
const { updateAthleteStreak } = require('./streakService')
const { isUserOnTeam } = require('./teamsService')

// Color priority for the activity feed (lower = more urgent)
const ACCENT_RED    = '#c73820'
const ACCENT_ORANGE = '#F75709'
const ACCENT_YELLOW = '#F0BE24'
const ACCENT_BLUE   = '#308EBD'
const ACCENT_WHITE  = '#FFFFFF'

function eventAccent(event) {
  if (event.type === 'workout') {
    if (event.status === 'skipped_injury') return { color: ACCENT_RED,    priority: 0 }
    if (event.status === 'skipped')        return { color: ACCENT_ORANGE, priority: 1 }
    return                                        { color: ACCENT_BLUE,   priority: 3 }
  }
  if (event.type === 'joined' || event.type === 'survey' || event.type === 'blueprint') {
    return { color: ACCENT_BLUE, priority: 3 }
  }
  return { color: ACCENT_WHITE, priority: 4 }
}

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

  // Update streak immediately (awaited) so the caller can compare the fresh
  // streak_days against milestone thresholds right in the log response,
  // instead of needing a separate profile re-fetch.
  let streak_days = null
  try {
    streak_days = await updateAthleteStreak(athleteId)
  } catch (err) {
    console.error('[logSession] streak update failed:', err.message)
  }

  // Fire-and-forget — not needed in the log response, shouldn't block it.
  recomputeCurrentWeek(athleteId, blueprint_week_id).catch(err =>
    console.error('[logSession] recomputeCurrentWeek failed:', err.message)
  )

  return { workout: data, streak_days }
}

// Recomputes how far the athlete has actually progressed through their
// individually-assigned plan and persists it to blueprint_assignments.current_week
// — a stored value, distinct from the plan content, that the UI and survey
// retake both read instead of guessing from elapsed calendar time.
//
// A week counts as "complete" once every session in it has at least one
// workout_logs row (any status — even a skip means the athlete addressed it,
// consistent with how streaks already treat skips as neutral rather than
// blocking). current_week is set to the first NOT-yet-complete week, i.e.
// one past the last fully-logged week, clamped to the plan's length.
async function recomputeCurrentWeek(athleteId, blueprintWeekId) {
  const { data: sourceWeek, error: sourceWeekErr } = await supabaseAdmin
    .from('blueprint_weeks')
    .select('blueprint_id')
    .eq('id', blueprintWeekId)
    .maybeSingle()
  if (sourceWeekErr || !sourceWeek) return

  // current_week lives on the athlete's individual assignment row. Sessions
  // logged against a team-wide (coach-assigned) blueprint have no such row —
  // nothing to update in that case, which is intentional.
  const { data: assignment, error: assignErr } = await supabaseAdmin
    .from('blueprint_assignments')
    .select('id, current_week')
    .eq('blueprint_id', sourceWeek.blueprint_id)
    .eq('athlete_id', athleteId)
    .maybeSingle()
  if (assignErr || !assignment) return

  const { data: weeks, error: weeksErr } = await supabaseAdmin
    .from('blueprint_weeks')
    .select('id, week_number, sessions')
    .eq('blueprint_id', sourceWeek.blueprint_id)
    .order('week_number', { ascending: true })
  if (weeksErr || !weeks?.length) return

  const weekIds = weeks.map(w => w.id)
  const { data: logs, error: logsErr } = await supabaseAdmin
    .from('workout_logs')
    .select('blueprint_week_id, session_index')
    .eq('athlete_id', athleteId)
    .in('blueprint_week_id', weekIds)
  if (logsErr) return

  const loggedSessionsByWeek = {}
  for (const log of logs || []) {
    if (!loggedSessionsByWeek[log.blueprint_week_id]) loggedSessionsByWeek[log.blueprint_week_id] = new Set()
    loggedSessionsByWeek[log.blueprint_week_id].add(log.session_index)
  }

  let newCurrentWeek = 1
  for (const week of weeks) {
    const sessionCount = Array.isArray(week.sessions) ? week.sessions.length : 0
    const loggedCount  = loggedSessionsByWeek[week.id]?.size || 0
    // A week with zero scheduled sessions has nothing to log — treat it as
    // trivially complete rather than a wall the athlete can never pass.
    const isComplete = loggedCount >= sessionCount
    if (isComplete) newCurrentWeek = week.week_number + 1
    else break
  }
  newCurrentWeek = Math.min(newCurrentWeek, weeks.length)

  if (newCurrentWeek !== assignment.current_week) {
    const { error: updateErr } = await supabaseAdmin
      .from('blueprint_assignments')
      .update({ current_week: newCurrentWeek })
      .eq('id', assignment.id)
    if (updateErr) console.error('[recomputeCurrentWeek] update failed:', updateErr.message)
  }
}

async function getAthleteLog(athleteId) {
  const { data, error } = await supabaseAdmin
    .from('workout_logs')
    .select('id, blueprint_week_id, session_index, status, effort, note, logged_at')
    .eq('athlete_id', athleteId)

  if (error) throw error
  return data || []
}

async function getTeamLogs(coachId, teamId = null) {
  // Find the coach's team
  let resolvedTeamId = teamId
  if (!resolvedTeamId) {
    const { data: teams } = await supabaseAdmin
      .from('teams').select('id').eq('coach_id', coachId).limit(1)
    if (!teams?.length) return []
    resolvedTeamId = teams[0].id
  } else if (!(await isUserOnTeam(coachId, resolvedTeamId))) {
    // A caller-supplied team_id was never verified — without this, any
    // coach could pass another team's id and read its full activity feed.
    throw Object.assign(new Error('That team is not yours'), { status: 403 })
  }

  // Get athlete IDs with join dates — filter to athletes only so coaches
  // who joined as assistants don't show up in the activity feed.
  const { data: members, error: memberError } = await supabaseAdmin
    .from('team_members')
    .select('athlete_id, joined_at')
    .eq('team_id', resolvedTeamId)
    .eq('access_level', 'athlete')

  if (memberError) throw memberError
  if (!members || members.length === 0) return []

  const athleteIds = members.map(m => m.athlete_id)
  const joinedMap = {}
  for (const m of members) joinedMap[m.athlete_id] = m.joined_at

  // Fetch all activity sources in parallel — no FK hint joins (avoids PostgREST constraint name issues)
  const [profilesRes, logsRes, surveysRes, assignmentsRes] = await Promise.all([
    supabaseAdmin.from('profiles').select('id, full_name, streak_days').in('id', athleteIds),
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

  // Build profile name + streak map
  const profileMap = {}
  const streakMap  = {}
  for (const p of profilesRes.data || []) {
    profileMap[p.id] = p.full_name || 'Athlete'
    streakMap[p.id]  = p.streak_days || 0
  }

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

  const STREAK_MILESTONES = new Set([7, 14, 21])
  // Track which athlete already has a milestone marked (only the most recent log)
  const milestonedAthletes = new Set()

  // Workout log events
  for (const log of rawLogs) {
    const week            = weekMap[log.blueprint_week_id]
    const injuryExercises = log.status === 'skipped_injury' ? parseInjuryExercises(log.note) : null
    const streak          = streakMap[log.athlete_id] || 0
    const isMilestone     = STREAK_MILESTONES.has(streak) && !milestonedAthletes.has(log.athlete_id)
    if (isMilestone) milestonedAthletes.add(log.athlete_id)

    const accent = isMilestone
      ? { color: ACCENT_YELLOW, priority: 2 }
      : eventAccent({ type: 'workout', status: log.status })

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
      is_streak_milestone: isMilestone,
      streak_days: isMilestone ? streak : undefined,
      accent_color: accent.color,
      color_priority: accent.priority,
    })
  }

  // Team join events
  for (const athleteId of athleteIds) {
    const joinedAt = joinedMap[athleteId]
    if (joinedAt) {
      const accent = eventAccent({ type: 'joined' })
      events.push({
        id: `joined-${athleteId}`,
        type: 'joined',
        athlete_id: athleteId,
        athlete_name: profileMap[athleteId] || 'Athlete',
        timestamp: joinedAt,
        accent_color: accent.color,
        color_priority: accent.priority,
      })
    }
  }

  // Survey submission events
  for (const survey of surveysRes.data || []) {
    if (survey.created_at) {
      const accent = eventAccent({ type: 'survey' })
      events.push({
        id: `survey-${survey.athlete_id}`,
        type: 'survey',
        athlete_id: survey.athlete_id,
        athlete_name: profileMap[survey.athlete_id] || 'Athlete',
        timestamp: survey.created_at,
        accent_color: accent.color,
        color_priority: accent.priority,
      })
    }
  }

  // Blueprint assignment events (individual athlete assignments only)
  for (const assignment of assignmentsRes.data || []) {
    if (assignment.athlete_id && assignment.assigned_at) {
      const accent = eventAccent({ type: 'blueprint' })
      events.push({
        id: `blueprint-${assignment.id}`,
        type: 'blueprint',
        athlete_id: assignment.athlete_id,
        athlete_name: profileMap[assignment.athlete_id] || 'Athlete',
        timestamp: assignment.assigned_at,
        blueprint_title: bpTitleMap[assignment.blueprint_id] ?? null,
        accent_color: accent.color,
        color_priority: accent.priority,
      })
    }
  }

  // Sort by color priority (most urgent first), then by recency within each group
  events.sort((a, b) => {
    if (a.color_priority !== b.color_priority) return a.color_priority - b.color_priority
    return new Date(b.timestamp) - new Date(a.timestamp)
  })
  return events.slice(0, 20)
}

module.exports = { logSession, getAthleteLog, getTeamLogs }
