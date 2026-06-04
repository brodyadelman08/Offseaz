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
  // Two separate queries — avoids FK hint join fragility across environments
  const { data: membership, error: memberErr } = await supabaseAdmin
    .from('team_members')
    .select('team_id')
    .eq('athlete_id', athleteId)
    .limit(1)

  if (memberErr) throw memberErr
  if (!membership || membership.length === 0) return null

  const { data: team, error: teamErr } = await supabaseAdmin
    .from('teams')
    .select('*')
    .eq('id', membership[0].team_id)
    .single()

  if (teamErr && teamErr.code !== 'PGRST116') throw teamErr
  return team || null
}

async function getAthleteTeams(athleteId) {
  const { data: memberships, error: memberErr } = await supabaseAdmin
    .from('team_members')
    .select('team_id')
    .eq('athlete_id', athleteId)

  if (memberErr) throw memberErr
  if (!memberships || memberships.length === 0) return []

  const teamIds = memberships.map(m => m.team_id)
  const { data: teams, error: teamErr } = await supabaseAdmin
    .from('teams')
    .select('*')
    .in('id', teamIds)

  if (teamErr) throw teamErr
  return teams || []
}

module.exports = { createTeam, getTeamByCoach, getTeamByInviteCode, joinTeam, getAthleteTeam, getAthleteTeams }
