'use strict'
const supabaseAdmin = require('../config/supabase')

// Statuses that count toward the streak (athlete actively engaged)
const COUNTING = new Set(['completed', 'partial', 'skipped_injury'])

// Compute day-based streak from an array of workout_log rows.
//
// Rules:
//   completed / partial / skipped_injury → counts (increments streak)
//   skipped                              → neutral (no effect either way)
//   no log at all for a calendar day     → one consecutive miss allowed (grace);
//                                          two consecutive misses ends the streak
//
// Returns integer number of days.
function computeStreakDays(logs) {
  if (!logs?.length) return 0

  const countingDays = new Set()
  const anyLogDays   = new Set()

  for (const l of logs) {
    const day = (l.logged_at || '').slice(0, 10)
    if (!day) continue
    anyLogDays.add(day)
    if (COUNTING.has(l.status)) countingDays.add(day)
  }

  if (!countingDays.size) return 0

  const todayKey = new Date().toISOString().slice(0, 10)
  const cur      = new Date(todayKey + 'T00:00:00.000Z')
  let streak     = 0
  let missedDays = 0

  for (let i = 0; i < 400; i++) {
    const dateStr = cur.toISOString().slice(0, 10)

    if (countingDays.has(dateStr)) {
      streak++
      missedDays = 0
    } else if (anyLogDays.has(dateStr)) {
      // Plain 'skipped' — neutral, doesn't count, doesn't break streak
    } else {
      // No log at all for this day
      missedDays++
      if (missedDays >= 2) break
    }

    cur.setUTCDate(cur.getUTCDate() - 1)
  }

  return streak
}

// Recompute streak_days for a single athlete and persist it to profiles.
async function updateAthleteStreak(athleteId) {
  try {
    const { data: logs, error } = await supabaseAdmin
      .from('workout_logs')
      .select('status, logged_at')
      .eq('athlete_id', athleteId)

    if (error) {
      console.error('[StreakService] Failed to fetch logs for', athleteId, error.message)
      return
    }

    const streak_days = computeStreakDays(logs || [])

    const { error: updateErr } = await supabaseAdmin
      .from('profiles')
      .update({ streak_days })
      .eq('id', athleteId)

    if (updateErr) {
      console.error('[StreakService] Failed to update streak for', athleteId, updateErr.message)
    }
  } catch (err) {
    console.error('[StreakService] updateAthleteStreak error:', err.message)
  }
}

// Nightly job: reset streak_days to 0 for athletes who have had no counting
// log in the past 48 hours (two consecutive missed days — grace has expired).
async function runNightlyStreakReset() {
  try {
    const { data: athletes } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'athlete')
      .gt('streak_days', 0)

    if (!athletes?.length) {
      console.log('[StreakReset] No athletes with active streaks')
      return
    }

    const athleteIds = athletes.map(a => a.id)
    const cutoff     = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

    const { data: recentLogs } = await supabaseAdmin
      .from('workout_logs')
      .select('athlete_id')
      .in('athlete_id', athleteIds)
      .in('status', ['completed', 'partial', 'skipped_injury'])
      .gte('logged_at', cutoff)

    const activeIds = new Set((recentLogs || []).map(l => l.athlete_id))
    const resetIds  = athleteIds.filter(id => !activeIds.has(id))

    if (resetIds.length === 0) {
      console.log('[StreakReset] All active streaks have recent logs — no resets needed')
      return
    }

    const { error } = await supabaseAdmin
      .from('profiles')
      .update({ streak_days: 0 })
      .in('id', resetIds)

    if (error) {
      console.error('[StreakReset] Failed to reset streaks:', error.message)
    } else {
      console.log(`[StreakReset] Reset streak for ${resetIds.length} athlete(s)`)
    }
  } catch (err) {
    console.error('[StreakReset] Fatal error:', err.message)
  }
}

module.exports = { computeStreakDays, updateAthleteStreak, runNightlyStreakReset }
