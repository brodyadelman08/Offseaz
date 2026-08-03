const supabaseAdmin = require('../config/supabase')

async function createBlueprint(coachId, teamId, { title, description, num_weeks, weeks, locked }) {
  const { data: blueprint, error: bpError } = await supabaseAdmin
    .from('blueprints')
    .insert({ coach_id: coachId, team_id: teamId, title, description, num_weeks, locked: locked ?? false })
    .select()
    .single()

  if (bpError) throw bpError

  if (weeks && weeks.length > 0) {
    const rows = weeks.map(w => ({
      blueprint_id: blueprint.id,
      week_number: w.week_number,
      objective: w.objective || null,
      sessions: w.sessions || [],
    }))

    const { error: weeksError } = await supabaseAdmin
      .from('blueprint_weeks')
      .insert(rows)

    if (weeksError) throw weeksError
  }

  return blueprint
}

async function getBlueprintsByTeam(teamId) {
  const { data, error } = await supabaseAdmin
    .from('blueprints')
    .select(`
      id, title, description, num_weeks, created_at, coach_id,
      blueprint_assignments ( id )
    `)
    .eq('team_id', teamId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map(b => ({
    ...b,
    assignment_count: b.blueprint_assignments?.length ?? 0,
    blueprint_assignments: undefined,
  }))
}

async function getBlueprintsByCoach(coachId) {
  const { data, error } = await supabaseAdmin
    .from('blueprints')
    .select(`
      id, title, description, num_weeks, created_at,
      blueprint_assignments ( id )
    `)
    .eq('coach_id', coachId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map(b => ({
    ...b,
    assignment_count: b.blueprint_assignments?.length ?? 0,
    blueprint_assignments: undefined,
  }))
}

async function getBlueprintById(blueprintId) {
  const { data: blueprint, error: bpError } = await supabaseAdmin
    .from('blueprints')
    .select('*')
    .eq('id', blueprintId)
    .single()

  if (bpError) throw bpError

  const { data: weeks, error: weeksError } = await supabaseAdmin
    .from('blueprint_weeks')
    .select('*')
    .eq('blueprint_id', blueprintId)
    .order('week_number', { ascending: true })

  if (weeksError) throw weeksError

  return { ...blueprint, weeks: weeks || [] }
}

async function getAssignments(blueprintId) {
  const { data: rows, error } = await supabaseAdmin
    .from('blueprint_assignments')
    .select('id, starts_on, assigned_at, athlete_id, team_id')
    .eq('blueprint_id', blueprintId)
    .order('assigned_at', { ascending: false })

  if (error) throw error
  if (!rows || rows.length === 0) return []

  // Collect unique IDs then fetch profiles and teams with .in() — no FK hints needed
  const athleteIds = [...new Set(rows.filter(r => r.athlete_id).map(r => r.athlete_id))]
  const teamIds    = [...new Set(rows.filter(r => r.team_id).map(r => r.team_id))]

  const [profilesRes, teamsRes] = await Promise.all([
    athleteIds.length > 0
      ? supabaseAdmin.from('profiles').select('id, full_name').in('id', athleteIds)
      : Promise.resolve({ data: [] }),
    teamIds.length > 0
      ? supabaseAdmin.from('teams').select('id, name').in('id', teamIds)
      : Promise.resolve({ data: [] }),
  ])

  const profileMap = {}
  for (const p of profilesRes.data || []) profileMap[p.id] = p

  const teamsMap = {}
  for (const t of teamsRes.data || []) teamsMap[t.id] = t

  return rows.map(r => ({
    ...r,
    profiles: r.athlete_id ? (profileMap[r.athlete_id] || null) : null,
    teams:    r.team_id    ? (teamsMap[r.team_id]    || null) : null,
  }))
}

async function assignBlueprint(blueprintId, { assign_to, athlete_id, team_id, starts_on }) {
  const row = {
    blueprint_id: blueprintId,
    starts_on: starts_on || new Date().toISOString().split('T')[0],
    athlete_id: assign_to === 'athlete' ? athlete_id : null,
    team_id: assign_to === 'team' ? team_id : null,
  }

  const { data, error } = await supabaseAdmin
    .from('blueprint_assignments')
    .insert(row)
    .select()
    .single()

  if (error) throw error
  return data
}

async function bulkAssignBlueprint(blueprintId, athleteIds, startsOn) {
  const date = startsOn || new Date().toISOString().split('T')[0]
  const rows = athleteIds.map(athleteId => ({
    blueprint_id: blueprintId,
    starts_on:    date,
    athlete_id:   athleteId,
    team_id:      null,
  }))

  const { data, error } = await supabaseAdmin
    .from('blueprint_assignments')
    .insert(rows)
    .select()

  if (error) throw error
  return data || []
}

async function getAthletePlan(athleteId) {
  // Find the athlete's team
  const { data: membership, error: memberError } = await supabaseAdmin
    .from('team_members')
    .select('team_id')
    .eq('athlete_id', athleteId)
    .single()

  if (memberError && memberError.code !== 'PGRST116') throw memberError
  const teamId = membership?.team_id || null

  // Fetch all relevant assignments with blueprint data
  const [{ data: indivData, error: indivErr }, teamResult] = await Promise.all([
    supabaseAdmin
      .from('blueprint_assignments')
      .select('*, blueprints(*)')
      .eq('athlete_id', athleteId)
      .order('assigned_at', { ascending: false }),
    teamId
      ? supabaseAdmin
          .from('blueprint_assignments')
          .select('*, blueprints(*)')
          .eq('team_id', teamId)
          .order('assigned_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ])

  if (indivErr) throw indivErr
  if (teamResult.error) throw teamResult.error

  // Merge, keeping only assignments that have a linked blueprint
  const allAssignments = [
    ...(indivData || []).filter(a => a.blueprints),
    ...(teamResult.data || []).filter(a => a.blueprints),
  ]

  // Separate auto-generated (description starts with "Auto-generated") from coach-assigned
  const autoAssignments = allAssignments
    .filter(a => a.blueprints?.description?.startsWith('Auto-generated'))
    .sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at))

  const coachAssignments = allAssignments
    .filter(a => !a.blueprints?.description?.startsWith('Auto-generated'))
    .sort((a, b) => new Date(b.assigned_at) - new Date(a.assigned_at))

  // Build a full plan object (with weeks) from an assignment row
  async function buildPlan(assignment) {
    if (!assignment) return null
    const blueprint = assignment.blueprints
    const { data: weeks, error: weeksError } = await supabaseAdmin
      .from('blueprint_weeks')
      .select('*')
      .eq('blueprint_id', blueprint.id)
      .order('week_number', { ascending: true })
    if (weeksError) throw weeksError
    return {
      id: blueprint.id,
      title: blueprint.title,
      description: blueprint.description,
      num_weeks: blueprint.num_weeks,
      starts_on: assignment.starts_on,
      assigned_at: assignment.assigned_at,
      // Athlete's actual progress — a stored value, not derived from elapsed
      // time. Defaults to 1 for rows that predate this column.
      current_week: assignment.current_week || 1,
      // current_week is only ever recomputed for assignments scoped to one
      // athlete (assignment.athlete_id set) — an auto-generated plan always
      // qualifies; a coach plan does too if assigned to one athlete. A
      // team-wide bulk assignment (athlete_id null, shared by the whole
      // roster) has no single meaningful current_week, so the client should
      // fall back to its elapsed-time estimate for that case only.
      is_individual: assignment.athlete_id != null,
      weeks: weeks || [],
    }
  }

  const [auto_plan, coach_plan] = await Promise.all([
    buildPlan(autoAssignments[0] || null),
    buildPlan(coachAssignments[0] || null),
  ])

  return { auto_plan, coach_plan }
}

// Finds the athlete's current individual auto-generated assignment (if any),
// i.e. the plan that was built from their survey answers — never a
// coach-built/coach-assigned plan. Used by survey retake to know what to
// preserve vs. regenerate.
async function getAthleteAutoAssignment(athleteId) {
  const { data, error } = await supabaseAdmin
    .from('blueprint_assignments')
    .select('*, blueprints(*)')
    .eq('athlete_id', athleteId)
    .order('assigned_at', { ascending: false })

  if (error) throw error

  const match = (data || []).find(a => a.blueprints?.description?.startsWith('Auto-generated'))
  if (!match) return null
  return { assignment: match, blueprint: match.blueprints }
}

// Overwrites a blueprint's title/description and the content of only the
// given weeks (each { week_number, objective, sessions }) — every other week
// row is left completely untouched, so completed history and the
// workout_logs pointing at those blueprint_week_id rows stay intact.
async function updateBlueprintUpcomingWeeks(blueprintId, { title, description }, upcomingWeeks) {
  const { error: bpError } = await supabaseAdmin
    .from('blueprints')
    .update({ title, description })
    .eq('id', blueprintId)

  if (bpError) throw bpError

  for (const week of upcomingWeeks) {
    const { error } = await supabaseAdmin
      .from('blueprint_weeks')
      .update({ objective: week.objective || null, sessions: week.sessions || [] })
      .eq('blueprint_id', blueprintId)
      .eq('week_number', week.week_number)

    if (error) throw error
  }
}

async function deleteBlueprint(blueprintId) {
  // Delete child rows first so FK constraints don't block the parent delete.
  // (Supabase RLS / PostgREST needs explicit deletes unless DB-level CASCADE is set.)

  // workout_logs is keyed by blueprint_week_id, not blueprint_id directly —
  // look up this blueprint's week ids first so no log is left dangling.
  const { data: weekRows, error: weekLookupErr } = await supabaseAdmin
    .from('blueprint_weeks')
    .select('id')
    .eq('blueprint_id', blueprintId)
  if (weekLookupErr) throw weekLookupErr

  const weekIds = (weekRows || []).map(w => w.id)
  if (weekIds.length > 0) {
    const { error: logsErr } = await supabaseAdmin
      .from('workout_logs')
      .delete()
      .in('blueprint_week_id', weekIds)
    if (logsErr) throw logsErr
  }

  // athlete_plan_overrides is keyed by assignment_id, not blueprint_id directly —
  // look up this blueprint's assignment ids first so no override is left orphaned.
  const { data: assignmentRows, error: assignLookupErr } = await supabaseAdmin
    .from('blueprint_assignments')
    .select('id')
    .eq('blueprint_id', blueprintId)
  if (assignLookupErr) throw assignLookupErr

  const assignmentIds = (assignmentRows || []).map(a => a.id)
  if (assignmentIds.length > 0) {
    const { error: overridesErr } = await supabaseAdmin
      .from('athlete_plan_overrides')
      .delete()
      .in('assignment_id', assignmentIds)
    if (overridesErr) throw overridesErr
  }

  const { error: assignErr } = await supabaseAdmin
    .from('blueprint_assignments')
    .delete()
    .eq('blueprint_id', blueprintId)
  if (assignErr) throw assignErr

  const { error: weeksErr } = await supabaseAdmin
    .from('blueprint_weeks')
    .delete()
    .eq('blueprint_id', blueprintId)
  if (weeksErr) throw weeksErr

  const { error } = await supabaseAdmin
    .from('blueprints')
    .delete()
    .eq('id', blueprintId)
  if (error) throw error
}

async function toggleLock(blueprintId, locked) {
  const { data, error } = await supabaseAdmin
    .from('blueprints')
    .update({ locked })
    .eq('id', blueprintId)
    .select()
    .single()

  if (error) throw error
  return data
}

async function getAthleteOverrides(athleteId) {
  // Get the athlete's active assignment id first
  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('team_id')
    .eq('athlete_id', athleteId)
    .maybeSingle()

  const teamId = membership?.team_id || null

  let assignment = null
  if (teamId) {
    const [{ data: indiv }, { data: team }] = await Promise.all([
      supabaseAdmin.from('blueprint_assignments').select('id').eq('athlete_id', athleteId)
        .order('assigned_at', { ascending: false }).limit(1).maybeSingle(),
      supabaseAdmin.from('blueprint_assignments').select('id').eq('team_id', teamId)
        .order('assigned_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    if (indiv && team) {
      assignment = indiv
    } else {
      assignment = indiv || team || null
    }
  } else {
    const { data: indiv } = await supabaseAdmin.from('blueprint_assignments').select('id')
      .eq('athlete_id', athleteId).order('assigned_at', { ascending: false }).limit(1).maybeSingle()
    assignment = indiv || null
  }

  if (!assignment) return { overrides: null, assignmentId: null }

  const { data, error } = await supabaseAdmin
    .from('athlete_plan_overrides')
    .select('*')
    .eq('assignment_id', assignment.id)
    .eq('athlete_id', athleteId)
    .maybeSingle()

  if (error) throw error
  return { overrides: data?.overrides || null, assignmentId: assignment.id }
}

async function saveAthleteOverrides(athleteId, assignmentId, overrides) {
  const { data, error } = await supabaseAdmin
    .from('athlete_plan_overrides')
    .upsert(
      { assignment_id: assignmentId, athlete_id: athleteId, overrides, updated_at: new Date().toISOString() },
      { onConflict: 'assignment_id,athlete_id' }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

module.exports = {
  createBlueprint,
  getBlueprintsByCoach,
  getBlueprintsByTeam,
  getBlueprintById,
  getAssignments,
  assignBlueprint,
  bulkAssignBlueprint,
  getAthletePlan,
  getAthleteAutoAssignment,
  updateBlueprintUpcomingWeeks,
  toggleLock,
  deleteBlueprint,
  getAthleteOverrides,
  saveAthleteOverrides,
}
