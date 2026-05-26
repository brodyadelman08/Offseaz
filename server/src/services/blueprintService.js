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
  const { data, error } = await supabaseAdmin
    .from('blueprint_assignments')
    .select(`
      id, starts_on, assigned_at, athlete_id, team_id,
      profiles!blueprint_assignments_athlete_id_fkey ( full_name ),
      teams!blueprint_assignments_team_id_fkey ( name )
    `)
    .eq('blueprint_id', blueprintId)
    .order('assigned_at', { ascending: false })

  if (error) throw error
  return data || []
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

async function getAthletePlan(athleteId) {
  // Find the athlete's team
  const { data: membership, error: memberError } = await supabaseAdmin
    .from('team_members')
    .select('team_id')
    .eq('athlete_id', athleteId)
    .single()

  if (memberError && memberError.code !== 'PGRST116') throw memberError
  const teamId = membership?.team_id || null

  // Find most recent assignment (individual takes priority, then team-wide)
  let assignment = null

  if (teamId) {
    // Fetch both individual and team assignments in parallel
    const [{ data: indiv }, { data: team }] = await Promise.all([
      supabaseAdmin
        .from('blueprint_assignments')
        .select('*, blueprints(*)')
        .eq('athlete_id', athleteId)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('blueprint_assignments')
        .select('*, blueprints(*)')
        .eq('team_id', teamId)
        .order('assigned_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])

    // Pick whichever is more recent
    if (indiv && team) {
      assignment = new Date(indiv.assigned_at) >= new Date(team.assigned_at) ? indiv : team
    } else {
      assignment = indiv || team || null
    }
  } else {
    const { data: indiv } = await supabaseAdmin
      .from('blueprint_assignments')
      .select('*, blueprints(*)')
      .eq('athlete_id', athleteId)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    assignment = indiv || null
  }

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
    weeks: weeks || [],
  }
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

module.exports = {
  createBlueprint,
  getBlueprintsByCoach,
  getBlueprintById,
  getAssignments,
  assignBlueprint,
  getAthletePlan,
  toggleLock,
}
