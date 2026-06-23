const supabaseAdmin = require('../config/supabase')

async function submitSurvey(athleteId, teamId, fields) {
  // Update profile name if provided
  if (fields.full_name && fields.full_name.trim()) {
    await supabaseAdmin
      .from('profiles')
      .update({ full_name: fields.full_name.trim() })
      .eq('id', athleteId)
  }

  // Build backward-compatible text values for legacy columns so existing
  // profile views (goals, weaknesses, injury_history, equipment) still render.
  const goalsText     = (fields.offseason_goals || []).join(', ') || null
  const weaknessText  = (fields.weakness_areas  || []).join(', ') || null
  const injuryParts   = [...(fields.injury_areas || [])]
  if (fields.injury_other && fields.injury_other.trim()) {
    injuryParts.push(`Other: ${fields.injury_other.trim()}`)
  }
  const injuryText    = injuryParts.filter(p => p !== 'None').join(', ') || null
  const equipmentArr  = fields.equipment_tier ? [{
    Full: 'Full Gym', Partial: 'Partial Gym', Minimal: 'Minimal Equipment',
  }[fields.equipment_tier] || fields.equipment_tier] : []

  const { data, error } = await supabaseAdmin
    .from('survey_responses')
    .insert({
      athlete_id: athleteId,
      team_id:    teamId,

      // ── Legacy columns (kept for existing components) ──────────────────
      sport:          fields.sport,
      position:       fields.position       || null,
      goals:          goalsText,
      weaknesses:     weaknessText,
      injury_history: injuryText,
      equipment:      equipmentArr,
      time_per_week:  fields.days_per_week  ? parseInt(fields.days_per_week, 10)  : null,

      // ── New columns ────────────────────────────────────────────────────
      age:              fields.age              ? parseInt(fields.age, 10)              : null,
      height_feet:      fields.height_feet      ? parseInt(fields.height_feet, 10)      : null,
      height_inches:    fields.height_inches != null ? parseInt(fields.height_inches, 10) : null,
      weight_lbs:       fields.weight_lbs       ? parseInt(fields.weight_lbs, 10)       : null,
      grade:            fields.grade            || null,
      primary_goal:     fields.primary_goal     || null,
      experience_level: fields.experience_level || null,
      equipment_tier:   fields.equipment_tier   || null,
      injury_areas:     fields.injury_areas     || [],
      injury_other:     fields.injury_other     || null,
      injury_notes:     fields.injury_notes     || null,
      weakness_areas:   fields.weakness_areas   || [],
      offseason_goals:  fields.offseason_goals  || [],
    })
    .select()
    .single()

  if (error) throw error
  return data
}

async function updateSurvey(athleteId, fields) {
  // Update profile name if provided
  if (fields.full_name && fields.full_name.trim()) {
    await supabaseAdmin
      .from('profiles')
      .update({ full_name: fields.full_name.trim() })
      .eq('id', athleteId)
  }

  const goalsText     = (fields.offseason_goals || []).join(', ') || null
  const weaknessText  = (fields.weakness_areas  || []).join(', ') || null
  const injuryParts   = [...(fields.injury_areas || [])]
  if (fields.injury_other && fields.injury_other.trim()) {
    injuryParts.push(`Other: ${fields.injury_other.trim()}`)
  }
  const injuryText    = injuryParts.filter(p => p !== 'None').join(', ') || null
  const equipmentArr  = fields.equipment_tier ? [{
    Full: 'Full Gym', Partial: 'Partial Gym', Minimal: 'Minimal Equipment',
  }[fields.equipment_tier] || fields.equipment_tier] : []

  const { data, error } = await supabaseAdmin
    .from('survey_responses')
    .update({
      sport:          fields.sport,
      position:       fields.position       || null,
      goals:          goalsText,
      weaknesses:     weaknessText,
      injury_history: injuryText,
      equipment:      equipmentArr,
      time_per_week:  fields.days_per_week  ? parseInt(fields.days_per_week, 10)  : null,
      age:              fields.age              ? parseInt(fields.age, 10)              : null,
      height_feet:      fields.height_feet      ? parseInt(fields.height_feet, 10)      : null,
      height_inches:    fields.height_inches != null ? parseInt(fields.height_inches, 10) : null,
      weight_lbs:       fields.weight_lbs       ? parseInt(fields.weight_lbs, 10)       : null,
      grade:            fields.grade            || null,
      primary_goal:     fields.primary_goal     || null,
      experience_level: fields.experience_level || null,
      equipment_tier:   fields.equipment_tier   || null,
      injury_areas:     fields.injury_areas     || [],
      injury_other:     fields.injury_other     || null,
      injury_notes:     fields.injury_notes     || null,
      weakness_areas:   fields.weakness_areas   || [],
      offseason_goals:  fields.offseason_goals  || [],
      completed_at:     new Date().toISOString(),
    })
    .eq('athlete_id', athleteId)
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

async function getTeamSurveys(coachId, teamId = null) {
  let resolvedTeamId = teamId
  if (!resolvedTeamId) {
    const { data: teams } = await supabaseAdmin
      .from('teams').select('id').eq('coach_id', coachId).limit(1)
    if (!teams?.length) return []
    resolvedTeamId = teams[0].id
  }

  // Get athlete_ids first (no FK joins — avoids PostgREST constraint name issues)
  const { data: memberRows, error: membersError } = await supabaseAdmin
    .from('team_members')
    .select('athlete_id')
    .eq('team_id', resolvedTeamId)

  if (membersError) throw membersError
  if (!memberRows || memberRows.length === 0) return []

  const athleteIds = memberRows.map(m => m.athlete_id)

  // Fetch profiles and surveys separately using .in() — no FK hints needed
  const [{ data: profileRows, error: profError }, { data: surveyRows }] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', athleteIds),
    supabaseAdmin
      .from('survey_responses')
      .select('athlete_id, sport, position, goals, weaknesses, injury_history, injury_areas, injury_other, injury_notes, equipment, time_per_week, primary_goal, experience_level, equipment_tier, grade, age, height_feet, height_inches, weight_lbs, completed_at')
      .in('athlete_id', athleteIds),
  ])

  if (profError) throw profError

  const surveyMap = {}
  for (const s of surveyRows || []) surveyMap[s.athlete_id] = s

  return (profileRows || []).map(p => ({
    id:         p.id,
    full_name:  p.full_name,
    avatar_url: p.avatar_url || null,
    survey:     surveyMap[p.id] || null,
  }))
}

async function updatePhysicalStats(athleteId, { height_feet, height_inches, weight_lbs }) {
  const update = {}
  if (height_feet !== undefined && height_feet !== '') update.height_feet = parseInt(height_feet, 10) || null
  if (height_inches !== undefined && height_inches !== '') update.height_inches = parseInt(height_inches, 10) ?? null
  if (weight_lbs !== undefined && weight_lbs !== '') update.weight_lbs = parseInt(weight_lbs, 10) || null

  const { data, error } = await supabaseAdmin
    .from('survey_responses')
    .update(update)
    .eq('athlete_id', athleteId)
    .select()
    .single()

  if (error) throw error
  return data
}

module.exports = { submitSurvey, updateSurvey, getSurveyByAthlete, getTeamSurveys, updatePhysicalStats }
