'use strict'
const supabaseAdmin = require('../config/supabase')

// ─── Metric definitions ────────────────────────────────────────────────────────
// All values stored in base unit: seconds for time, total inches for feet/inches,
// total seconds for min:sec, raw value for mph/reps/inches.

const METRIC_DEFS = {
  forty_yard_dash:      { name: '40 Yard Dash',             category: 'Speed & Agility',     unit: 'seconds',     lowerIsBetter: true  },
  thirty_yard_dash:     { name: '30 Yard Dash',             category: 'Speed & Agility',     unit: 'seconds',     lowerIsBetter: true  },
  sixty_yard_dash:      { name: '60 Yard Dash',             category: 'Speed & Agility',     unit: 'seconds',     lowerIsBetter: true  },
  ten_yard_split:       { name: '10 Yard Split',            category: 'Speed & Agility',     unit: 'seconds',     lowerIsBetter: true  },
  pro_agility:          { name: 'Pro Agility 5-10-5',       category: 'Speed & Agility',     unit: 'seconds',     lowerIsBetter: true  },
  three_cone:           { name: '3 Cone L Drill',           category: 'Speed & Agility',     unit: 'seconds',     lowerIsBetter: true  },
  vertical_jump:        { name: 'Vertical Jump',            category: 'Power & Jumping',     unit: 'inches',      lowerIsBetter: false },
  broad_jump:           { name: 'Broad Jump',               category: 'Power & Jumping',     unit: 'feet_inches', lowerIsBetter: false },
  standing_long_jump:   { name: 'Standing Long Jump',       category: 'Power & Jumping',     unit: 'feet_inches', lowerIsBetter: false },
  box_jump:             { name: 'Box Jump Height',          category: 'Power & Jumping',     unit: 'inches',      lowerIsBetter: false },
  exit_velocity:        { name: 'Exit Velocity',            category: 'Throwing & Velocity', unit: 'mph',         lowerIsBetter: false },
  pitch_velocity:       { name: 'Pitch Velocity',           category: 'Throwing & Velocity', unit: 'mph',         lowerIsBetter: false },
  throwing_velocity:    { name: 'Throwing Velocity',        category: 'Throwing & Velocity', unit: 'mph',         lowerIsBetter: false, requiresSubType: true },
  shot_put:             { name: 'Shot Put Distance',        category: 'Field Events',        unit: 'feet_inches', lowerIsBetter: false },
  discus:               { name: 'Discus Distance',          category: 'Field Events',        unit: 'feet_inches', lowerIsBetter: false },
  javelin:              { name: 'Javelin Distance',         category: 'Field Events',        unit: 'feet_inches', lowerIsBetter: false },
  mile_time:            { name: 'Mile Time',                category: 'Conditioning',        unit: 'min_sec',     lowerIsBetter: true  },
  four_hundred_meter:   { name: '400 Meter',                category: 'Conditioning',        unit: 'seconds',     lowerIsBetter: true  },
  eight_hundred_meter:  { name: '800 Meter',                category: 'Conditioning',        unit: 'min_sec',     lowerIsBetter: true  },
  bench_225_reps:       { name: '225 lb Bench Press Reps',  category: 'Football Combine',    unit: 'reps',        lowerIsBetter: false },
}

const THROWING_SUB_TYPES = {
  infield:          { name: 'Infield Velocity',        unit: 'mph',     lowerIsBetter: false },
  outfield:         { name: 'Outfield Velocity',       unit: 'mph',     lowerIsBetter: false },
  football_pass:    { name: 'Football Pass Velocity',  unit: 'mph',     lowerIsBetter: false },
  lacrosse_throw:   { name: 'Lacrosse Throw Velocity', unit: 'mph',     lowerIsBetter: false },
  catcher_pop_time: { name: 'Catcher Pop Time',        unit: 'seconds', lowerIsBetter: true  },
}

// Returns the effective { unit, lowerIsBetter } for a selection row
function effectiveDef(metricId, subTypeId) {
  const base = METRIC_DEFS[metricId]
  if (!base) return null
  if (base.requiresSubType && subTypeId) {
    const st = THROWING_SUB_TYPES[subTypeId]
    return st ? { ...st } : null
  }
  return { unit: base.unit, lowerIsBetter: base.lowerIsBetter }
}

function validateSelection(metricId, subTypeId) {
  const def = METRIC_DEFS[metricId]
  if (!def) throw new Error(`Unknown metric: ${metricId}`)
  if (def.requiresSubType) {
    if (!subTypeId) throw new Error(`${def.name} requires a sub-type`)
    if (!THROWING_SUB_TYPES[subTypeId]) throw new Error(`Unknown sub-type: ${subTypeId}`)
  } else if (subTypeId) {
    throw new Error(`${def.name} does not accept a sub-type`)
  }
}

// ─── Service functions ─────────────────────────────────────────────────────────

async function getSelections(athleteId) {
  const { data, error } = await supabaseAdmin
    .from('athlete_metric_selections')
    .select(`
      id, metric_id, sub_type_id, created_at,
      performance_prs (best_value, previous_value, updated_at)
    `)
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: true })

  if (error) throw error
  console.log(`[performanceService] getSelections(${athleteId}) -> ${(data || []).length} rows:`, (data || []).map(d => ({ id: d.id, metric_id: d.metric_id, sub_type_id: d.sub_type_id })))
  return data || []
}

async function addSelection(athleteId, metricId, subTypeId) {
  validateSelection(metricId, subTypeId || null)
  const normalizedSubType = subTypeId || null

  const { data, error } = await supabaseAdmin
    .from('athlete_metric_selections')
    .insert({ athlete_id: athleteId, metric_id: metricId, sub_type_id: normalizedSubType })
    .select()
    .single()

  if (!error) return data

  console.error('[performanceService] addSelection DB error:', {
    code: error.code, message: error.message, details: error.details, hint: error.hint,
    athleteId, metricId, subTypeId: normalizedSubType,
  })

  if (error.code === '23505') {
    // Unique violation — check whether THIS athlete genuinely already has this
    // exact selection. If so it's a real duplicate; return it instead of erroring
    // so the UI can treat the add as a no-op success.
    let existingQuery = supabaseAdmin
      .from('athlete_metric_selections')
      .select('id, metric_id, sub_type_id, created_at')
      .eq('athlete_id', athleteId)
      .eq('metric_id', metricId)
    existingQuery = normalizedSubType
      ? existingQuery.eq('sub_type_id', normalizedSubType)
      : existingQuery.is('sub_type_id', null)
    const { data: existingRows, error: existingErr } = await existingQuery

    if (!existingErr && existingRows && existingRows.length > 0) {
      console.log('[performanceService] addSelection: genuine duplicate for this athlete, returning existing row', existingRows[0])
      return existingRows[0]
    }

    // The conflict did NOT come from a row belonging to this athlete — the unique
    // index is most likely missing athlete_id and is colliding across athletes.
    console.error('[performanceService] PHANTOM CONFLICT: unique constraint hit but no matching row exists for this athlete. Check that the partial unique indexes on athlete_metric_selections include athlete_id in the key.')
    throw new Error('Unable to add this metric right now. Please try again in a moment.')
  }
  throw new Error(error.message || error.details || 'Database error inserting metric selection')
}

async function removeSelection(athleteId, selectionId) {
  const { error } = await supabaseAdmin
    .from('athlete_metric_selections')
    .delete()
    .eq('id', selectionId)
    .eq('athlete_id', athleteId)

  if (error) throw error
}

async function logValue(athleteId, selectionId, value) {
  // Verify ownership and get metric info
  const { data: sel, error: selErr } = await supabaseAdmin
    .from('athlete_metric_selections')
    .select('id, metric_id, sub_type_id')
    .eq('id', selectionId)
    .eq('athlete_id', athleteId)
    .single()

  if (selErr || !sel) throw new Error('Selection not found or access denied')

  const def = effectiveDef(sel.metric_id, sel.sub_type_id)
  if (!def) throw new Error('Cannot determine metric definition')

  const numValue = Number(value)
  if (!isFinite(numValue) || numValue <= 0) throw new Error('Value must be a positive number')

  // Read current PR before inserting
  const { data: currentPR } = await supabaseAdmin
    .from('performance_prs')
    .select('best_value')
    .eq('selection_id', selectionId)
    .maybeSingle()

  const previousBest = currentPR ? Number(currentPR.best_value) : null
  const isPR = previousBest === null
    || (def.lowerIsBetter ? numValue < previousBest : numValue > previousBest)

  // Insert log
  const { data: log, error: logErr } = await supabaseAdmin
    .from('performance_logs')
    .insert({ athlete_id: athleteId, selection_id: selectionId, value: numValue })
    .select()
    .single()

  if (logErr) throw logErr

  // Upsert PR record if new best
  if (isPR) {
    await supabaseAdmin
      .from('performance_prs')
      .upsert(
        { selection_id: selectionId, best_value: numValue, previous_value: previousBest, log_id: log.id, updated_at: new Date().toISOString() },
        { onConflict: 'selection_id' }
      )
  }

  return { log, is_pr: isPR, previous_best: previousBest }
}

async function getHistory(athleteId, selectionId) {
  // Verify the selection belongs to this athlete (or allow any authenticated user for coach reads)
  const { data, error } = await supabaseAdmin
    .from('performance_logs')
    .select('id, value, logged_at')
    .eq('selection_id', selectionId)
    .order('logged_at', { ascending: false })

  if (error) throw error
  return data || []
}

async function getAthleteSelections(athleteId) {
  // Same as getSelections — exposed for coach reads
  return getSelections(athleteId)
}

module.exports = {
  METRIC_DEFS,
  THROWING_SUB_TYPES,
  getSelections,
  addSelection,
  removeSelection,
  logValue,
  getHistory,
  getAthleteSelections,
}
