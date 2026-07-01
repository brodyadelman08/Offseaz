const supabaseAdmin = require('../config/supabase')

const VALID_LIFTS = [
  'bench_press', 'squat', 'deadlift', 'trap_bar_deadlift',
  'power_clean', 'overhead_press',
  'hang_clean', 'clean', 'front_squat', 'romanian_deadlift', 'reverse_lunge',
]

const VALID_LIFTS_SET = new Set(VALID_LIFTS)

// Epley formula: for 1 rep use the exact weight; for multiple reps estimate the theoretical 1RM.
// Training max calculations elsewhere continue to use raw weight_lbs — this is for PR detection only.
function calcEstimated1rm(weight, reps) {
  const r = Number(reps) || 1
  return r <= 1 ? Number(weight) : Number(weight) * (1 + r / 30)
}

// Returns { max, is_pr, previous_best, estimated_1rm }
// is_pr is true when the new estimated 1RM exceeds the athlete's previous best estimated 1RM
async function logMax(athleteId, lift, weight_lbs, reps, notes) {
  if (!VALID_LIFTS.includes(lift)) throw new Error(`Invalid lift: ${lift}`)

  const repCount     = Number(reps) || 1
  const estimated_1rm = calcEstimated1rm(weight_lbs, repCount)

  // Fetch prior best estimated_1rm for PR comparison
  const { data: prior } = await supabaseAdmin
    .from('lifting_maxes')
    .select('estimated_1rm')
    .eq('athlete_id', athleteId)
    .eq('lift', lift)
    .order('estimated_1rm', { ascending: false })
    .limit(1)

  const previousBest1rm = prior?.[0]?.estimated_1rm != null ? Number(prior[0].estimated_1rm) : null
  const is_pr = previousBest1rm === null || estimated_1rm > previousBest1rm

  const { data, error } = await supabaseAdmin
    .from('lifting_maxes')
    .insert({ athlete_id: athleteId, lift, weight_lbs, reps: repCount, notes: notes || null, estimated_1rm })
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
      previous_weight_lbs: previousBest1rm,
    }).then(() => {}).catch(err => console.error('[maxesService] pr_celebrations insert failed:', err.message))
  }

  return { max: data, is_pr, previous_best: previousBest1rm, estimated_1rm }
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
  console.log('[removeLiftSelection] START — athleteId:', athleteId, '| liftKey:', liftKey)

  // Cascade-delete all logged maxes for this lift before removing the selection row
  const { data: deletedMaxes, error: maxesErr } = await supabaseAdmin
    .from('lifting_maxes')
    .delete()
    .eq('athlete_id', athleteId)
    .eq('lift', liftKey)
    .select()
  console.log('[removeLiftSelection] lifting_maxes delete — rows affected:', deletedMaxes?.length ?? 'unknown', '| error:', maxesErr ? JSON.stringify(maxesErr) : 'none')
  if (maxesErr) throw maxesErr

  const { data: deletedSel, error } = await supabaseAdmin
    .schema('public').from('athlete_lift_selections')
    .delete()
    .eq('athlete_id', athleteId)
    .eq('lift_key', liftKey)
    .select()
  console.log('[removeLiftSelection] athlete_lift_selections delete — rows affected:', deletedSel?.length ?? 'unknown', '| error:', error ? JSON.stringify(error) : 'none')
  if (error) throw error

  console.log('[removeLiftSelection] DONE — athleteId:', athleteId, '| liftKey:', liftKey)
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

module.exports = { logMax, getMaxesByAthlete, VALID_LIFTS, getSelectedLifts, addLiftSelection, removeLiftSelection, updateLiftSelections }
