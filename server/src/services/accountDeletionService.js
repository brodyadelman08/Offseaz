const supabaseAdmin = require('../config/supabase')

async function del(table, column, value) {
  const { error } = await supabaseAdmin.from(table).delete().eq(column, value)
  if (error) throw error
}

// ─── Team data cascade ─────────────────────────────────────────────────────────
//
// Deletes everything scoped to a single team: blueprints (+ their weeks and
// assignments), team-wide assignments not tied to a specific blueprint,
// messages, digest history, memberships, then the team row itself.
// Does NOT touch coach_notes/coach_notifications — those are coach-scoped
// (keyed by coach_id + athlete_id, no team_id column) and survive a single
// team's deletion since a coach may run more than one team.
async function deleteTeamData(teamId) {
  const { data: blueprints, error: bpErr } = await supabaseAdmin
    .from('blueprints').select('id').eq('team_id', teamId)
  if (bpErr) throw bpErr

  const blueprintIds = (blueprints || []).map(b => b.id)
  if (blueprintIds.length) {
    const { error: weekErr } = await supabaseAdmin.from('blueprint_weeks').delete().in('blueprint_id', blueprintIds)
    if (weekErr) throw weekErr
    const { error: assignErr } = await supabaseAdmin.from('blueprint_assignments').delete().in('blueprint_id', blueprintIds)
    if (assignErr) throw assignErr
  }

  // Assignments scoped directly to the team (team-wide assignment, not yet
  // tied to one specific blueprint that was already cleared above)
  await del('blueprint_assignments', 'team_id', teamId)
  await del('blueprints', 'team_id', teamId)
  await del('team_messages', 'team_id', teamId)
  await del('weekly_digests', 'team_id', teamId)
  await del('team_members', 'team_id', teamId)

  const { error: teamErr } = await supabaseAdmin.from('teams').delete().eq('id', teamId)
  if (teamErr) throw teamErr
}

// ─── Athlete account deletion ──────────────────────────────────────────────────
async function deleteAthleteAccount(athleteId) {
  // performance_prs has no athlete_id column (PK is selection_id, 1:1 with
  // athlete_metric_selections) — resolve the athlete's selection ids first.
  const { data: selections, error: selErr } = await supabaseAdmin
    .from('athlete_metric_selections').select('id').eq('athlete_id', athleteId)
  if (selErr) throw selErr
  const selectionIds = (selections || []).map(s => s.id)
  if (selectionIds.length) {
    const { error: prErr } = await supabaseAdmin.from('performance_prs').delete().in('selection_id', selectionIds)
    if (prErr) throw prErr
  }

  await del('athlete_metric_selections', 'athlete_id', athleteId)
  await del('athlete_lift_selections',   'athlete_id', athleteId)
  await del('performance_logs',          'athlete_id', athleteId)
  await del('lifting_maxes',             'athlete_id', athleteId)
  await del('workout_logs',              'athlete_id', athleteId)
  await del('daily_checkins',            'athlete_id', athleteId)
  await del('athlete_goals',             'athlete_id', athleteId)
  await del('survey_responses',          'athlete_id', athleteId)
  await del('blueprint_assignments',     'athlete_id', athleteId)
  await del('team_members',              'athlete_id', athleteId)
  await del('pr_celebrations',           'athlete_id', athleteId)

  const { error: profileErr } = await supabaseAdmin.from('profiles').delete().eq('id', athleteId)
  if (profileErr) throw profileErr

  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(athleteId)
  if (authErr) throw authErr
}

// ─── Coach account deletion ────────────────────────────────────────────────────
async function deleteCoachAccount(coachId) {
  const { data: ownedTeams, error: teamsErr } = await supabaseAdmin
    .from('teams').select('id').eq('coach_id', coachId)
  if (teamsErr) throw teamsErr

  for (const team of ownedTeams || []) {
    await deleteTeamData(team.id)
  }

  // Coach-scoped data not tied to a specific team
  await del('coach_notes',          'coach_id', coachId)
  await del('coach_notifications',  'coach_id', coachId)

  // Any remaining assistant-coach memberships on teams this coach doesn't own
  // (team_members.athlete_id also stores assistant-coach ids — see CLAUDE.md)
  await del('team_members', 'athlete_id', coachId)

  const { error: profileErr } = await supabaseAdmin.from('profiles').delete().eq('id', coachId)
  if (profileErr) throw profileErr

  const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(coachId)
  if (authErr) throw authErr
}

module.exports = { deleteTeamData, deleteAthleteAccount, deleteCoachAccount }
