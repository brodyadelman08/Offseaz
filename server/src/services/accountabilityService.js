const supabaseAdmin = require('../config/supabase')
const { getTeamLogs } = require('./workoutService')
const { computeStreakDays } = require('./streakService')
const { getTeamCheckins } = require('./checkinService')
const { isUserOnTeam } = require('./teamsService')

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

function computeMetrics(logs, weekMonday) {
  const thisWeekLogs       = logs.filter(l => getMondayKey(l.logged_at) === weekMonday)
  const countingThisWeek   = thisWeekLogs.filter(l => l.status !== 'skipped')
  const efforts            = countingThisWeek.filter(l => l.effort != null).map(l => l.effort)
  const avgEffort          = efforts.length
    ? Math.round((efforts.reduce((a, b) => a + b, 0) / efforts.length) * 10) / 10
    : null
  const sorted = [...logs].sort((a, b) => new Date(b.logged_at) - new Date(a.logged_at))

  return {
    logged_this_week:    thisWeekLogs.length > 0,
    sessions_this_week:  thisWeekLogs.length,
    avg_effort_this_week: avgEffort,
    streak_days:         computeStreakDays(logs),
    last_logged_at:      sorted[0]?.logged_at || null,
  }
}

async function getAccountabilityData(coachId, teamId = null) {
  // Get coach's team
  let resolvedTeamId = teamId
  if (!resolvedTeamId) {
    const { data: teams } = await supabaseAdmin
      .from('teams').select('id').eq('coach_id', coachId).limit(1)
    if (!teams?.length) return { athletes: [], logs: [] }
    resolvedTeamId = teams[0].id
  } else if (!(await isUserOnTeam(coachId, resolvedTeamId))) {
    // Readiness check-ins live in here too — a caller-supplied team_id must
    // never be trusted without this check.
    throw Object.assign(new Error('That team is not yours'), { status: 403 })
  }

  // Get athlete members only — filter out assistant coaches who may have
  // access_level 'admin_coach' or 'view_only' on team_members.
  const { data: members, error: memberError } = await supabaseAdmin
    .from('team_members')
    .select('athlete_id, profiles!team_members_athlete_id_fkey(id, full_name)')
    .eq('team_id', resolvedTeamId)
    .eq('access_level', 'athlete')

  if (memberError) throw memberError
  if (!members || members.length === 0) return { athletes: [], logs: [] }

  const athleteIds = members.map(m => m.athlete_id)

  // Fetch all logs for streak history + today's check-ins in parallel
  const [logsRes, checkins] = await Promise.all([
    supabaseAdmin.from('workout_logs').select('athlete_id, status, effort, logged_at').in('athlete_id', athleteIds),
    getTeamCheckins(athleteIds),
  ])
  if (logsRes.error) throw logsRes.error

  const allLogs   = logsRes.data || []
  const weekMonday = getThisWeekMonday()

  // Build checkin map: athleteId → { readiness_score, is_rest_day }
  const checkinMap = {}
  for (const c of checkins) checkinMap[c.athlete_id] = c

  // Compute per-athlete metrics
  const athletes = members.map(m => {
    const athleteLogs = allLogs.filter(l => l.athlete_id === m.athlete_id)
    const ci = checkinMap[m.athlete_id] || null
    return {
      id: m.athlete_id,
      full_name: m.profiles.full_name,
      today_readiness: ci?.readiness_score ?? null,
      today_is_rest_day: ci?.is_rest_day ?? false,
      checked_in_today: !!ci,
      ...computeMetrics(athleteLogs, weekMonday),
    }
  })

  // Sort: not logged first, then logged (most actionable at top)
  athletes.sort((a, b) => {
    if (a.logged_this_week !== b.logged_this_week) return a.logged_this_week ? 1 : -1
    return (a.full_name || '').localeCompare(b.full_name || '')
  })

  // Recent activity feed (reuse existing function)
  const logs = await getTeamLogs(coachId, resolvedTeamId)

  return { athletes, logs }
}

module.exports = { getAccountabilityData }
