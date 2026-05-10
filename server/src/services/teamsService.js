const crypto = require('crypto')
const supabaseAdmin = require('../config/supabase')

function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex')
}

async function createTeam(name, coachId) {
  const invite_code = generateInviteCode()
  const { data, error } = await supabaseAdmin
    .from('teams')
    .insert({ name, coach_id: coachId, invite_code })
    .select()
    .single()

  if (error) throw error
  return data
}

async function getTeamByCoach(coachId) {
  const { data, error } = await supabaseAdmin
    .from('teams')
    .select('*')
    .eq('coach_id', coachId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data || null
}

async function getTeamByInviteCode(inviteCode) {
  const { data, error } = await supabaseAdmin
    .from('teams')
    .select('*')
    .eq('invite_code', inviteCode)
    .single()

  if (error) throw error
  return data
}

async function joinTeam(teamId, athleteId) {
  const { data, error } = await supabaseAdmin
    .from('team_members')
    .insert({ team_id: teamId, athlete_id: athleteId })
    .select()
    .single()

  if (error) throw error
  return data
}

async function getAthleteTeam(athleteId) {
  const { data, error } = await supabaseAdmin
    .from('team_members')
    .select('team_id, teams(*)')
    .eq('athlete_id', athleteId)
    .single()

  if (error && error.code !== 'PGRST116') throw error
  return data ? data.teams : null
}

module.exports = { createTeam, getTeamByCoach, getTeamByInviteCode, joinTeam, getAthleteTeam }
