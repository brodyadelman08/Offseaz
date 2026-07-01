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
  // Two flat queries merged in JS instead of a nested PostgREST embed.
  // The embed (`performance_prs (...)`) depends on PostgREST's schema-cache
  // having picked up the FK between athlete_metric_selections and
  // performance_prs — if that cache is stale the whole request 500s, even for
  // selections that have nothing to do with the missing PR row. Flat queries
  // can't fail that way, and a selection with no logged value yet just gets
  // an empty performance_prs array instead of crashing the response.
  const { data: selections, error: selErr } = await supabaseAdmin
    .from('athlete_metric_selections')
    .select('id, metric_id, sub_type_id, created_at')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: true })

  if (selErr) {
    console.error('[performanceService] getSelections — selection query error:', {
      code: selErr.code, message: selErr.message, details: selErr.details, hint: selErr.hint, athleteId,
    })
    throw new Error(selErr.message || selErr.details || 'Database error fetching metric selections')
  }

  const rows = selections || []
  if (rows.length === 0) {
    console.log(`[performanceService] getSelections(${athleteId}) -> 0 rows`)
    return []
  }

  const selectionIds = rows.map(r => r.id)
  const { data: prs, error: prErr } = await supabaseAdmin
    .from('performance_prs')
    .select('selection_id, best_value, previous_value, updated_at')
    .in('selection_id', selectionIds)

  if (prErr) {
    // Don't let a PR-fetch failure take down the whole list — log it and fall
    // back to "no PR logged yet" for every selection instead of throwing.
    console.error('[performanceService] getSelections — PR query error (continuing with empty PRs):', {
      code: prErr.code, message: prErr.message, details: prErr.details, hint: prErr.hint, athleteId,
    })
  }

  const prMap = {}
  for (const pr of (prs || [])) prMap[pr.selection_id] = pr

  const result = rows.map(r => ({
    ...r,
    performance_prs: prMap[r.id] ? [prMap[r.id]] : [],
  }))

  console.log(`[performanceService] getSelections(${athleteId}) -> ${result.length} rows:`, result.map(d => ({ id: d.id, metric_id: d.metric_id, sub_type_id: d.sub_type_id, has_pr: d.performance_prs.length > 0 })))
  return result
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
  // Verify ownership before touching any associated data
  const { data: sel, error: checkErr } = await supabaseAdmin
    .from('athlete_metric_selections')
    .select('id')
    .eq('id', selectionId)
    .eq('athlete_id', athleteId)
    .maybeSingle()
  if (checkErr) throw checkErr
  if (!sel) throw new Error('Selection not found or access denied')

  // Cascade-delete all associated data so a re-added metric starts fresh
  const { error: logsErr } = await supabaseAdmin
    .from('performance_logs')
    .delete()
    .eq('selection_id', selectionId)
  if (logsErr) console.error('[removeSelection] logs delete error (continuing):', logsErr)

  const { error: prsErr } = await supabaseAdmin
    .from('performance_prs')
    .delete()
    .eq('selection_id', selectionId)
  if (prsErr) console.error('[removeSelection] prs delete error (continuing):', prsErr)

  const { error } = await supabaseAdmin
    .from('athlete_metric_selections')
    .delete()
    .eq('id', selectionId)
    .eq('athlete_id', athleteId)
  if (error) throw error
}

async function logValue(athleteId, selectionId, value) {
  console.log('[logValue] called', { athleteId, selectionId, value })

  // Verify ownership and get metric info
  const { data: sel, error: selErr } = await supabaseAdmin
    .from('athlete_metric_selections')
    .select('id, metric_id, sub_type_id')
    .eq('id', selectionId)
    .eq('athlete_id', athleteId)
    .single()

  if (selErr || !sel) {
    console.error('[logValue] selection lookup failed', { selErr })
    throw new Error('Selection not found or access denied')
  }

  const def = effectiveDef(sel.metric_id, sel.sub_type_id)
  if (!def) throw new Error('Cannot determine metric definition')

  const numValue = Number(value)
  if (!isFinite(numValue) || numValue <= 0) throw new Error('Value must be a positive number')

  // Read current PR before inserting
  const { data: currentPR, error: prReadErr } = await supabaseAdmin
    .from('performance_prs')
    .select('best_value')
    .eq('selection_id', selectionId)
    .maybeSingle()
  if (prReadErr) console.error('[logValue] PR read error (non-fatal):', prReadErr)

  const previousBest = currentPR ? Number(currentPR.best_value) : null
  const isPR = previousBest === null
    || (def.lowerIsBetter ? numValue < previousBest : numValue > previousBest)
  console.log('[logValue] isPR:', isPR, 'previousBest:', previousBest, 'numValue:', numValue)

  // Insert log entry
  const { data: log, error: logErr } = await supabaseAdmin
    .from('performance_logs')
    .insert({ athlete_id: athleteId, selection_id: selectionId, value: numValue })
    .select()
    .single()

  if (logErr) {
    console.error('[logValue] log insert failed:', { code: logErr.code, message: logErr.message, details: logErr.details })
    throw logErr
  }
  console.log('[logValue] log inserted, id:', log?.id)

  // Upsert PR if new best — log_id intentionally omitted (not a column in performance_prs)
  if (isPR) {
    const { error: prErr } = await supabaseAdmin
      .from('performance_prs')
      .upsert(
        { selection_id: selectionId, best_value: numValue, previous_value: previousBest, updated_at: new Date().toISOString() },
        { onConflict: 'selection_id' }
      )
    if (prErr) {
      console.error('[logValue] PR upsert failed:', { code: prErr.code, message: prErr.message, details: prErr.details })
      throw prErr
    }
    console.log('[logValue] PR upserted for selection', selectionId)
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
