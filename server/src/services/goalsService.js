const supabaseAdmin = require('../config/supabase')

async function getAthleteGoals(athleteId) {
  const { data, error } = await supabaseAdmin
    .from('athlete_goals')
    .select('*')
    .eq('athlete_id', athleteId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

async function createGoal(athleteId, { title, target, due_date, source = 'custom' }) {
  const { data, error } = await supabaseAdmin
    .from('athlete_goals')
    .insert({ athlete_id: athleteId, title, target: target || null, due_date: due_date || null, source })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

async function updateGoal(goalId, athleteId, updates) {
  const patch = { ...updates }
  if (patch.completed === true && !patch.completed_at) {
    patch.completed_at = new Date().toISOString()
  } else if (patch.completed === false) {
    patch.completed_at = null
  }
  const { data, error } = await supabaseAdmin
    .from('athlete_goals')
    .update(patch)
    .eq('id', goalId)
    .eq('athlete_id', athleteId)
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

async function deleteGoal(goalId, athleteId) {
  const { error } = await supabaseAdmin
    .from('athlete_goals')
    .delete()
    .eq('id', goalId)
    .eq('athlete_id', athleteId)
  if (error) throw new Error(error.message)
}

module.exports = { getAthleteGoals, createGoal, updateGoal, deleteGoal }
