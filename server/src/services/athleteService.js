const supabaseAdmin = require('../config/supabase')
const { getSurveyByAthlete } = require('./surveyService')
const { getAthletePlan } = require('./blueprintService')

async function getAthleteProfile(athleteId, coachId) {
  // Get coach's team
  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('coach_id', coachId)
    .single()

  if (teamError && teamError.code !== 'PGRST116') throw teamError
  if (!team) throw Object.assign(new Error('No team found'), { status: 403 })

  // Verify athlete is on coach's team
  const { data: membership, error: memberError } = await supabaseAdmin
    .from('team_members')
    .select('athlete_id')
    .eq('team_id', team.id)
    .eq('athlete_id', athleteId)
    .single()

  if (memberError && memberError.code !== 'PGRST116') throw memberError
  if (!membership) throw Object.assign(new Error('Athlete not on your team'), { status: 403 })

  // Fetch profile name
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, avatar_url')
    .eq('id', athleteId)
    .single()

  if (profileError) throw profileError

  // Fetch survey, plan, raw logs, and coach note in parallel
  const [survey, plan, logsResult, noteResult] = await Promise.all([
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
    } : null,
    logs,
  }
}

module.exports = { getAthleteProfile }
