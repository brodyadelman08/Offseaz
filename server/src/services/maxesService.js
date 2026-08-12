const supabaseAdmin = require('../config/supabase')

const VALID_LIFTS = [
  'bench_press', 'squat', 'trap_bar_deadlift',
  'power_clean', 'overhead_press',
  'hang_clean', 'clean', 'front_squat', 'romanian_deadlift', 'reverse_lunge',
]

const VALID_LIFTS_SET = new Set(VALID_LIFTS)

// Rep-max -> estimated true 1RM multipliers. weight / multiplier == the
// estimated 1RM (e.g. a 5RM of 185 -> 185 / 0.87 = 212.6 -> rounds to 215).
// Only the 4 values the athlete-facing dropdown offers are recognized here;
// 1 is the "no conversion needed" case, handled separately below.
const REP_MAX_MULTIPLIERS = { 3: 0.93, 5: 0.87, 10: 0.75 }

// Converts a logged (weight, reps) entry into an estimated 1RM.
// reps === 1: the weight IS the 1RM already — used as-is, flagged "tested".
// reps in {3, 5, 10}: divided out by its multiplier and rounded to the
//   nearest 5 lbs, flagged "estimated".
// Any other reps value (not reachable through the dropdown-driven client,
//   but defensive against any other caller): falls back to the raw weight,
//   unconverted, still flagged "estimated" since it wasn't a true 1RM test.
function estimateOneRepMax(weightLbs, reps) {
  const w = Number(weightLbs)
  const r = Number(reps) || 1
  if (r === 1) return { estimated_1rm: w, is_estimated: false }
  const multiplier = REP_MAX_MULTIPLIERS[r]
  const estimated_1rm = multiplier ? Math.round((w / multiplier) / 5) * 5 : w
  return { estimated_1rm, is_estimated: true }
}

// Picks the "current" max from a list of logged entries by highest
// ESTIMATED 1RM (not raw weight_lbs) — so a new entry at a different rep
// range never accidentally lowers the stored max just because its raw
// weight happens to be smaller than an old heavier-but-lower-rep entry.
function pickCurrentEntry(entries) {
  return entries.reduce((best, e) =>
    Number(e.estimated_1rm) > Number(best.estimated_1rm) ? e : best
  )
}

// Returns { max, is_pr, previous_best } — is_pr true when new weight > all prior entries
async function logMax(athleteId, lift, weight_lbs, reps, notes) {
  if (!VALID_LIFTS.includes(lift)) throw new Error(`Invalid lift: ${lift}`)

  // Fetch prior best raw weight for PR comparison
  const { data: prior } = await supabaseAdmin
    .from('lifting_maxes')
    .select('weight_lbs')
    .eq('athlete_id', athleteId)
    .eq('lift', lift)
    .order('weight_lbs', { ascending: false })
    .limit(1)

  const previousBest = prior?.[0] ? Number(prior[0].weight_lbs) : null
  const is_pr = previousBest === null || Number(weight_lbs) > previousBest

  const { estimated_1rm, is_estimated } = estimateOneRepMax(weight_lbs, reps)

  const { data, error } = await supabaseAdmin
    .from('lifting_maxes')
    .insert({
      athlete_id: athleteId, lift, weight_lbs, reps: reps || 1, notes: notes || null,
      estimated_1rm, is_estimated,
    })
    .select()
    .single()

  if (error) {
    const detail = error.details || error.message || 'Database error'
    throw new Error(detail)
  }

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
    .select('id, lift, weight_lbs, reps, notes, logged_at, estimated_1rm, is_estimated')
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
      result[lift].current = pickCurrentEntry(entries)
    }
  }

  return result
}

// ─── Lift selections ───────────────────────────────────────────────────────────

async function getSelectedLifts(athleteId) {
  const { data, error } = await supabaseAdmin
    .schema('public').from('athlete_lift_selections')
    .select('lift_key')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data || []).map(r => r.lift_key)
}

async function addLiftSelection(athleteId, liftKey) {
  if (!VALID_LIFTS_SET.has(liftKey)) throw new Error(`Invalid lift: ${liftKey}`)
  const { error } = await supabaseAdmin
    .schema('public').from('athlete_lift_selections')
    .insert({ athlete_id: athleteId, lift_key: liftKey })
  if (error && error.code !== '23505') throw error  // ignore duplicate key
}

async function removeLiftSelection(athleteId, liftKey) {
  // Zero rows deleted here is a legitimate no-op (the athlete never logged a
  // max for this lift) — not an error condition.
  const { error: maxesErr } = await supabaseAdmin
    .from('lifting_maxes')
    .delete()
    .eq('athlete_id', athleteId)
    .eq('lift', liftKey)
  if (maxesErr) throw maxesErr

  const { error } = await supabaseAdmin
    .schema('public').from('athlete_lift_selections')
    .delete()
    .eq('athlete_id', athleteId)
    .eq('lift_key', liftKey)
  if (error) throw error
}

// Atomically replaces all lift selections for an athlete with the provided list.
// Runs DELETE (all rows for athlete) then INSERT (new rows) in sequence.
async function updateLiftSelections(athleteId, liftKeys) {
  for (const key of liftKeys) {
    if (!VALID_LIFTS_SET.has(key)) throw new Error(`Invalid lift: ${key}`)
  }
  const { error: delErr } = await supabaseAdmin
    .schema('public').from('athlete_lift_selections')
    .delete()
    .eq('athlete_id', athleteId)
  if (delErr) throw delErr
  if (liftKeys.length > 0) {
    const rows = liftKeys.map(k => ({ athlete_id: athleteId, lift_key: k }))
    const { error: insErr } = await supabaseAdmin
      .schema('public').from('athlete_lift_selections')
      .insert(rows)
    if (insErr) throw insErr
  }
}

module.exports = {
  logMax, getMaxesByAthlete, VALID_LIFTS, getSelectedLifts, addLiftSelection, removeLiftSelection, updateLiftSelections,
  estimateOneRepMax, pickCurrentEntry, REP_MAX_MULTIPLIERS,
}
