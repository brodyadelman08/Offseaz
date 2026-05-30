const supabaseAdmin = require('../config/supabase')

const VALID_LIFTS = [
  'bench_press', 'squat', 'deadlift', 'trap_bar_deadlift',
  'power_clean', 'overhead_press',
  'hang_clean', 'clean', 'front_squat', 'romanian_deadlift', 'reverse_lunge',
]

async function logMax(athleteId, lift, weight_lbs, reps, notes) {
  if (!VALID_LIFTS.includes(lift)) throw new Error(`Invalid lift: ${lift}`)

  const { data, error } = await supabaseAdmin
    .from('lifting_maxes')
    .insert({ athlete_id: athleteId, lift, weight_lbs, reps: reps || 1, notes: notes || null })
    .select()
    .single()

  if (error) {
    // Surface Supabase error detail (e.g. unique constraint violations)
    const detail = error.details || error.message || 'Database error'
    throw new Error(detail)
  }
  return data
}

async function getMaxesByAthlete(athleteId) {
  const { data, error } = await supabaseAdmin
    .from('lifting_maxes')
    .select('id, lift, weight_lbs, reps, notes, logged_at')
    .eq('athlete_id', athleteId)
    .order('logged_at', { ascending: true })

  if (error) throw error

  // Build per-lift structure: history (chronological) + current (highest weight)
  const result = {}
  for (const lift of VALID_LIFTS) {
    result[lift] = { current: null, history: [] }
  }

  for (const row of data || []) {
    if (!result[row.lift]) continue
    result[row.lift].history.push(row)
  }

  // current = entry with highest weight_lbs per lift
  // Use Number() to handle Supabase returning NUMERIC columns as strings
  for (const lift of VALID_LIFTS) {
    const entries = result[lift].history
    if (entries.length > 0) {
      result[lift].current = entries.reduce((best, e) =>
        Number(e.weight_lbs) > Number(best.weight_lbs) ? e : best
      )
    }
  }

  return result
}

module.exports = { logMax, getMaxesByAthlete, VALID_LIFTS }
