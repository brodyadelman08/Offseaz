const supabaseAdmin = require('../config/supabase')

const VALID_LIFTS = [
  'bench_press', 'squat', 'deadlift', 'trap_bar_deadlift',
  'power_clean', 'overhead_press',
  'hang_clean', 'clean', 'front_squat', 'romanian_deadlift', 'reverse_lunge',
]

const VALID_LIFTS_SET = new Set(VALID_LIFTS)

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

  const { data, error } = await supabaseAdmin
    .from('lifting_maxes')
    .insert({ athlete_id: athleteId, lift, weight_lbs, reps: reps || 1, notes: notes || null })
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
  console.log('[removeLiftSelection] START — athleteId:', athleteId, '| liftKey:', liftKey, '| querying lifting_maxes column "lift"')

  const { data: deletedMaxes, error: maxesErr } = await supabaseAdmin
    .from('lifting_maxes')
    .delete()
    .eq('athlete_id', athleteId)
    .eq('lift', liftKey)
    .select()

  const rowsDeleted = Array.isArray(deletedMaxes) ? deletedMaxes.length : 0
  console.log('[removeLiftSelection] lifting_maxes delete — athleteId:', athleteId, '| liftKey:', liftKey, '| rows deleted:', rowsDeleted, '| error:', maxesErr ? JSON.stringify(maxesErr) : 'none')
  if (maxesErr) throw maxesErr
  if (rowsDeleted === 0) {
    const err = new Error(`lifting_maxes delete returned 0 rows for athleteId:${athleteId} lift:${liftKey} — column "lift" used, verify data exists in table`)
    console.error('[removeLiftSelection] ZERO ROWS DELETED:', err.message)
    throw err
  }

  const { data: deletedSel, error } = await supabaseAdmin
    .schema('public').from('athlete_lift_selections')
    .delete()
    .eq('athlete_id', athleteId)
    .eq('lift_key', liftKey)
    .select()
  console.log('[removeLiftSelection] athlete_lift_selections delete — rows deleted:', Array.isArray(deletedSel) ? deletedSel.length : 'unknown', '| error:', error ? JSON.stringify(error) : 'none')
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
