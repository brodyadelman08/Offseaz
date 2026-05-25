const supabaseAdmin = require('../config/supabase')

async function submitSurvey(athleteId, teamId, fields) {
  const { data, error } = await supabaseAdmin
    .from('survey_responses')
    .insert({
      athlete_id: athleteId,
      team_id: teamId,
      sport: fields.sport,
      position: fields.position || null,
      goals: fields.goals || null,
      weaknesses: fields.weaknesses || null,
      injury_history: fields.injury_history || null,
      equipment: fields.equipment || [],
      time_per_week: fields.time_per_week ? parseInt(fields.time_per_week, 10) : null,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function getSurveyByAthlete(athleteId) {
  const { data, error } = await supabaseAdmin
    .from('survey_responses')
    .select('*')
    .eq('athlete_id', athleteId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

async function getTeamSurveys(coachId) {
  // Get the coach's team first
  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('coach_id', coachId)
    .single()

  if (teamError && teamError.code !== 'PGRST116') throw teamError
  if (!team) return []

  // Get all team members with their profiles and survey responses (left join)
  const { data: members, error: membersError } = await supabaseAdmin
    .from('team_members')
    .select(`
      athlete_id,
      profiles!team_members_athlete_id_fkey ( id, full_name, avatar_url ),
      survey_responses!survey_responses_athlete_id_fkey ( sport, position, goals, weaknesses, injury_history, equipment, time_per_week, completed_at )
    `)
    .eq('team_id', team.id)
    .order('survey_responses(completed_at)', { ascending: false, nullsFirst: false })

  if (membersError) throw membersError

  return (members || []).map(m => ({
    id: m.profiles.id,
    full_name: m.profiles.full_name,
    avatar_url: m.profiles.avatar_url || null,
    survey: m.survey_responses || null,
  }))
}

module.exports = { submitSurvey, getSurveyByAthlete, getTeamSurveys }
