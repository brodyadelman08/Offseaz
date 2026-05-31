const supabaseAdmin = require('../config/supabase')
const { getMaxesByAthlete } = require('./maxesService')
const { getAthleteGoals } = require('./goalsService')
const { getSurveyByAthlete } = require('./surveyService')

const LIFT_LABELS = {
  bench_press:       'Bench Press',
  squat:             'Squat',
  deadlift:          'Deadlift',
  trap_bar_deadlift: 'Trap Bar Deadlift',
  overhead_press:    'Overhead Press',
  power_clean:       'Power Clean',
  hang_clean:        'Hang Clean',
  clean:             'Clean',
  front_squat:       'Front Squat',
  romanian_deadlift: 'Romanian Deadlift',
  reverse_lunge:     'Reverse Lunge',
}

async function generateReport(athleteId, coachId) {
  // 1. Profile
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', athleteId)
    .single()
  if (profileErr) throw new Error('Athlete not found')

  // 2. Run parallel queries
  const [survey, maxes, logsRes, goals, noteRes] = await Promise.all([
    getSurveyByAthlete(athleteId).catch(() => null),
    getMaxesByAthlete(athleteId).catch(() => ({})),
    supabaseAdmin
      .from('workout_logs')
      .select('id, status, logged_at, blueprint_week_id, session_index')
      .eq('athlete_id', athleteId)
      .order('logged_at', { ascending: true }),
    getAthleteGoals(athleteId).catch(() => []),
    supabaseAdmin
      .from('coach_notes')
      .select('note')
      .eq('coach_id', coachId)
      .eq('athlete_id', athleteId)
      .maybeSingle(),
  ])

  const rawLogs = logsRes.data || []

  // Enrich logs with focus/week if available
  let logs = rawLogs
  if (rawLogs.length > 0) {
    const weekIds = [...new Set(rawLogs.map(l => l.blueprint_week_id).filter(Boolean))]
    if (weekIds.length > 0) {
      const { data: weeks } = await supabaseAdmin
        .from('blueprint_weeks')
        .select('id, week_number, sessions')
        .in('id', weekIds)
      const weekMap = Object.fromEntries((weeks || []).map(w => [w.id, w]))
      logs = rawLogs.map(l => {
        const week = weekMap[l.blueprint_week_id]
        return {
          ...l,
          week_number: week?.week_number ?? null,
          session_focus: week?.sessions?.[l.session_index]?.focus ?? null,
        }
      })
    }
  }

  // Stats
  const totalSessions = logs.length
  const completedSessions = logs.filter(l => l.status === 'completed').length
  const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0

  // Best consecutive-completed streak
  let streak = 0, maxStreak = 0
  for (const log of logs) {
    if (log.status === 'completed') {
      streak++
      if (streak > maxStreak) maxStreak = streak
    } else {
      streak = 0
    }
  }

  // Improvement per lift: earliest log vs current PR
  const maxImprovements = {}
  for (const [key, label] of Object.entries(LIFT_LABELS)) {
    const liftData = maxes?.[key]
    if (!liftData?.history?.length) continue
    const sorted = [...liftData.history].sort((a, b) => new Date(a.logged_at) - new Date(b.logged_at))
    const startLbs = Number(sorted[0].weight_lbs)
    const currentLbs = Number(liftData.current?.weight_lbs ?? startLbs)
    maxImprovements[key] = { label, start: startLbs, current: currentLbs, improvement: currentLbs - startLbs }
  }

  const goalsCompleted = goals.filter(g => g.completed).length

  return {
    athlete:   { id: profile.id, full_name: profile.full_name, avatar_url: profile.avatar_url },
    survey,
    maxes,
    maxImprovements,
    logs,
    goals,
    stats: {
      totalSessions,
      completedSessions,
      completionRate,
      maxStreak,
      goalsCompleted,
      goalsTotal: goals.length,
    },
    coachNote: noteRes.data?.note || null,
    generatedAt: new Date().toISOString(),
  }
}

module.exports = { generateReport }
