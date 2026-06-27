const supabaseAdmin = require('../config/supabase')

const VALID_LIFTS = [
  'bench_press', 'squat', 'deadlift', 'trap_bar_deadlift',
  'power_clean', 'overhead_press',
  'hang_clean', 'clean', 'front_squat', 'romanian_deadlift', 'reverse_lunge',
]

// Returns { max, is_pr, previous_best } — is_pr true when new weight > all prior entries
async function logMax(athleteId, lift, weight_lbs, reps, notes) {
  if (!VALID_LIFTS.includes(lift)) throw new Error(`Invalid lift: ${lift}`)

  // Fetch prior best before inserting so we can detect a PR
  const { data: prior } = await supabaseAdmin
    .from('lifting_maxes')
    .select('weight_lbs')
    .eq('athlete_id', athleteId)
    .eq('lift', lift)
    .order('weight_lbs', { ascending: false })
    .limit(1)

  const previousBest = prior?.[0] ? Number(prior[0].weight_lbs) : null
  const is_pr = previousBest === null || Number(weight_lbs) > previousBest

  const { data, error } = await supabaseAdmin
    .from('lifting_maxes')
    .insert({ athlete_id: athleteId, lift, weight_lbs, reps: reps || 1, notes: notes || null })
    .select()
    .single()

  if (error) {
    const detail = error.details || error.message || 'Database error'
    throw new Error(detail)
  }

  // Record the PR celebration in history
  if (is_pr) {
    supabaseAdmin.from('pr_celebrations').insert({
      athlete_id: athleteId, lift,
      new_weight_lbs: weight_lbs,
      previous_weight_lbs: previousBest,
    }).then(() => {}).catch(err => console.error('[maxesService] pr_celebrations insert failed:', err.message))
  }

  return { max: data, is_pr, previous_best: previousBest }
}

async function getMaxesByAthlete(athleteId) {
  const { data, error } = await supabaseAdmin
    .from('lifting_maxes')
    .select('id, lift, weight_lbs, reps, notes, logged_at')
    .eq('athlete_id', athleteId)
    .order('logged_at', { ascending: true })

  if (error) throw error

  const result = {}
  for (const lift of VALID_LIFTS) {
    result[lift] = { current: null, history: [] }
  }

  for (const row of data || []) {
    if (!result[row.lift]) continue
    result[row.lift].history.push(row)
  }

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
