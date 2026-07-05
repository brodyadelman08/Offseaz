'use strict'
const supabaseAdmin = require('../config/supabase')

function getWeekMondayISO() {
  const d = new Date()
  const dow = d.getDay()
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1))
  d.setUTCHours(0, 0, 0, 0)
  return d.toISOString()
}

const COUNTING = new Set(['completed', 'partial', 'skipped_injury'])

async function getLeaderboard(teamId) {
  const { data: members } = await supabaseAdmin
    .from('team_members')
    .select('athlete_id, profiles!team_members_athlete_id_fkey(id, full_name, streak_days)')
    .eq('team_id', teamId).eq('access_level', 'athlete')

  if (!members?.length) return { streak: [], completion_rate: [], sessions_total: [] }

  const athleteIds = members.map(m => m.athlete_id)

  const [surveysRes, logsRes] = await Promise.all([
    supabaseAdmin.from('survey_responses').select('athlete_id, sport, time_per_week').in('athlete_id', athleteIds),
    supabaseAdmin.from('workout_logs').select('athlete_id, status, logged_at').in('athlete_id', athleteIds),
  ])

  const surveyMap = {}
  for (const s of surveysRes.data || []) surveyMap[s.athlete_id] = s

  const weekStart = getWeekMondayISO()

  const athletes = members.map(m => {
    const aLogs        = (logsRes.data || []).filter(l => l.athlete_id === m.athlete_id)
    const weekLogs     = aLogs.filter(l => l.logged_at >= weekStart && COUNTING.has(l.status))
    const totalCounting = aLogs.filter(l => COUNTING.has(l.status)).length
    const survey       = surveyMap[m.athlete_id]
    const daysPerWeek  = survey?.time_per_week || 3
    const compRate     = Math.min(100, Math.round((weekLogs.length / daysPerWeek) * 100))

    return {
      id:               m.athlete_id,
      full_name:        m.profiles?.full_name || 'Athlete',
      sport:            survey?.sport || null,
      streak_days:      m.profiles?.streak_days || 0,
      sessions_this_week: weekLogs.length,
      completion_rate:  compRate,
      sessions_total:   totalCounting,
    }
  })

  return {
    streak:          [...athletes].sort((a, b) => b.streak_days      - a.streak_days),
    completion_rate: [...athletes].sort((a, b) => b.completion_rate  - a.completion_rate),
    sessions_total:  [...athletes].sort((a, b) => b.sessions_total   - a.sessions_total),
  }
}

// TODO: add sport-specific performance PR leaderboard categories once athlete metric selection data is available

module.exports = { getLeaderboard }
