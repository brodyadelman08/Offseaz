const supabaseAdmin = require('../config/supabase')
const { getSurveyByAthlete } = require('./surveyService')
const { getAthletePlan } = require('./blueprintService')

async function getAthleteProfile(athleteId, coachId) {
  // Resolve EVERY team this coach is associated with — teams they own
  // (coach_id match) plus teams they assist on (a team_members row with a
  // coach-level access_level). A coach who owns or assists multiple teams
  // must be checked against the full set, not a single arbitrarily-picked
  // team — picking just one caused legitimate athletes on the coach's other
  // team(s) to be falsely rejected.
  const { data: ownedTeams, error: ownedErr } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('coach_id', coachId)

  if (ownedErr) throw ownedErr

  const { data: assistantRows, error: assistantErr } = await supabaseAdmin
    .from('team_members')
    .select('team_id')
    .eq('athlete_id', coachId)
    .in('access_level', ['view_only', 'admin_coach'])

  if (assistantErr) throw assistantErr

  const teamIds = [...new Set([
    ...(ownedTeams || []).map(t => t.id),
    ...(assistantRows || []).map(r => r.team_id),
  ])]

  if (!teamIds.length) {
    throw Object.assign(new Error('No team found'), { status: 403 })
  }

  // Verify athlete is on at least one of the coach's teams
  const { data: memberRows, error: memberError } = await supabaseAdmin
    .from('team_members')
    .select('athlete_id')
    .in('team_id', teamIds)
    .eq('athlete_id', athleteId)
    .limit(1)

  if (memberError) throw memberError
  if (!memberRows?.length) throw Object.assign(new Error('Athlete not on your team'), { status: 403 })

  // Fetch profile name
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', athleteId)
    .single()

  if (profileError) throw profileError

  // Fetch survey, plan, raw logs, and coach note in parallel
  const [survey, planResult, logsResult, noteResult] = await Promise.all([
    getSurveyByAthlete(athleteId),
    getAthletePlan(athleteId).catch(() => null),
    supabaseAdmin
      .from('workout_logs')
      .select('id, blueprint_week_id, session_index, status, effort, note, logged_at')
      .eq('athlete_id', athleteId)
      .order('logged_at', { ascending: false }),
    supabaseAdmin
      .from('coach_notes')
      .select('note, updated_at')
      .eq('coach_id', coachId)
      .eq('athlete_id', athleteId)
      .maybeSingle(),
  ])

  // getAthletePlan returns { auto_plan, coach_plan } — prefer the
  // coach-assigned plan, falling back to the auto-generated one.
  const plan = planResult?.coach_plan || planResult?.auto_plan || null

  const rawLogs = logsResult.data || []

  // Enrich logs with week_number and session_focus
  let logs = rawLogs
  if (rawLogs.length > 0) {
    const weekIds = [...new Set(rawLogs.map(l => l.blueprint_week_id))]
    const { data: weeks } = await supabaseAdmin
      .from('blueprint_weeks')
      .select('id, week_number, sessions')
      .in('id', weekIds)

    const weekMap = Object.fromEntries((weeks || []).map(w => [w.id, w]))

    logs = rawLogs.map(l => {
      const week = weekMap[l.blueprint_week_id]
      return {
        id: l.id,
        week_number: week?.week_number ?? null,
        session_focus: week?.sessions?.[l.session_index]?.focus ?? null,
        status: l.status,
        effort: l.effort,
        note: l.note,
        logged_at: l.logged_at,
      }
    })
  }

  return {
    id: profile.id,
    full_name: profile.full_name,
    avatar_url: profile.avatar_url || null,
    survey,
    coach_note: noteResult.data?.note ?? '',
    coach_note_updated_at: noteResult.data?.updated_at ?? null,
    plan: plan ? {
      title: plan.title,
      description: plan.description,
      num_weeks: plan.num_weeks,
      starts_on: plan.starts_on,
      current_week: plan.current_week,
      is_individual: plan.is_individual,
    } : null,
    logs,
  }
}

module.exports = { getAthleteProfile }
