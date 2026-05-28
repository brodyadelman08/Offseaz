const supabaseAdmin = require('../config/supabase')
const { getTeamLogs } = require('./workoutService')

function getMondayKey(date) {
  const d = new Date(date)
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  d.setHours(0, 0, 0, 0)
  return d.toISOString().split('T')[0]
}

function getThisWeekMonday() {
  return getMondayKey(new Date())
}

function isSkip(status) {
  return status === 'skipped' || status === 'skipped_injury'
}

function computeStreak(logs) {
  const nonSkipped = logs.filter(l => !isSkip(l.status))
  if (!nonSkipped.length) return 0
  const loggedWeeks = new Set(nonSkipped.map(l => getMondayKey(l.logged_at)))
  const latest = [...nonSkipped].sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at))[0]
  const d = new Date(getMondayKey(latest.logged_at))
  let streak = 0
  while (loggedWeeks.has(d.toISOString().split('T')[0])) {
    streak++
    d.setDate(d.getDate() - 7)
  }
  return streak
}

function computeMetrics(logs, weekMonday) {
  const thisWeekLogs = logs.filter(l => getMondayKey(l.logged_at) === weekMonday)
  const nonSkippedThisWeek = thisWeekLogs.filter(l => !isSkip(l.status))
  const efforts = nonSkippedThisWeek.filter(l => l.effort != null).map(l => l.effort)
  const avgEffort = efforts.length
    ? Math.round((efforts.reduce((a, b) => a + b, 0) / efforts.length) * 10) / 10
    : null
  const sorted = [...logs].sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at))

  return {
    logged_this_week: thisWeekLogs.length > 0,
    sessions_this_week: thisWeekLogs.length,
    avg_effort_this_week: avgEffort,
    streak_weeks: computeStreak(logs),
    last_logged_at: sorted[0]?.logged_at || null,
  }
}

async function getAccountabilityData(coachId) {
  // Get coach's team
  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('coach_id', coachId)
    .single()

  if (teamError && teamError.code !== 'PGRST116') throw teamError
  if (!team) return { athletes: [], logs: [] }

  // Get all team members with full_name
  const { data: members, error: memberError } = await supabaseAdmin
    .from('team_members')
    .select('athlete_id, profiles!team_members_athlete_id_fkey(id, full_name)')
    .eq('team_id', team.id)

  if (memberError) throw memberError
  if (!members || members.length === 0) return { athletes: [], logs: [] }

  const athleteIds = members.map(m => m.athlete_id)

  // Fetch all logs for streak history (no limit)
  const { data: allLogs, error: logsError } = await supabaseAdmin
    .from('workout_logs')
    .select('athlete_id, status, effort, logged_at')
    .in('athlete_id', athleteIds)

  if (logsError) throw logsError

  const weekMonday = getThisWeekMonday()

  // Compute per-athlete metrics
  const athletes = members.map(m => {
    const athleteLogs = (allLogs || []).filter(l => l.athlete_id === m.athlete_id)
    return {
      id: m.athlete_id,
      full_name: m.profiles.full_name,
      ...computeMetrics(athleteLogs, weekMonday),
    }
  })

  // Sort: not logged first, then logged (most actionable at top)
  athletes.sort((a, b) => {
    if (a.logged_this_week !== b.logged_this_week) return a.logged_this_week ? 1 : -1
    return (a.full_name || '').localeCompare(b.full_name || '')
  })

  // Recent activity feed (reuse existing function)
  const logs = await getTeamLogs(coachId)

  return { athletes, logs }
}

module.exports = { getAccountabilityData }
