const crypto = require('crypto')
const supabaseAdmin = require('../config/supabase')

function generateInviteCode() {
  return crypto.randomBytes(4).toString('hex')
}

// ─── Team creation ────────────────────────────────────────────────────────────

async function createTeam(name, coachId) {
  // Generate two separate invite codes — one for athletes, one for assistant coaches
  let invite_code, coach_code
  // Ensure uniqueness (retry on collision, extremely unlikely)
  for (let i = 0; i < 10; i++) {
    invite_code = generateInviteCode()
    coach_code  = generateInviteCode()
    const { data: clash } = await supabaseAdmin
      .from('teams')
      .select('id')
      .or(`invite_code.eq.${invite_code},coach_code.eq.${coach_code}`)
      .limit(1)
    if (!clash || clash.length === 0) break
  }

  const { data, error } = await supabaseAdmin
    .from('teams')
    .insert({ name, coach_id: coachId, invite_code, coach_code })
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Team lookups ─────────────────────────────────────────────────────────────

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

async function getTeamByCoachCode(coachCode) {
  const { data, error } = await supabaseAdmin
    .from('teams')
    .select('*')
    .eq('coach_code', coachCode)
    .single()

  if (error) throw error
  return data
}

// ─── Athlete join ─────────────────────────────────────────────────────────────

async function joinTeam(teamId, athleteId) {
  const { data, error } = await supabaseAdmin
    .from('team_members')
    .insert({ team_id: teamId, athlete_id: athleteId, access_level: 'athlete' })
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Athlete membership queries ───────────────────────────────────────────────

async function getAthleteTeam(athleteId) {
  const { data: membership, error: memberErr } = await supabaseAdmin
    .from('team_members')
    .select('team_id')
    .eq('athlete_id', athleteId)
    .eq('access_level', 'athlete')
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
    .eq('access_level', 'athlete')

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

// ─── Assistant coach access resolution ────────────────────────────────────────

/**
 * For any coach user, return their team and access level.
 * Head coaches  → { team, accessLevel: 'head_coach' }
 * Asst. coaches → { team, accessLevel: 'view_only' | 'admin_coach' }
 * No team       → { team: null, accessLevel: null }
 */
async function resolveCoachTeamAndAccess(coachId) {
  // 1. Check if this user is the head coach (team owner)
  const { data: ownedTeams, error: ownedErr } = await supabaseAdmin
    .from('teams')
    .select('*')
    .eq('coach_id', coachId)
    .limit(1)

  if (!ownedErr && ownedTeams && ownedTeams.length > 0) {
    return { team: ownedTeams[0], accessLevel: 'head_coach' }
  }

  // 2. Check if this user is an assistant coach in team_members
  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('team_id, access_level')
    .eq('athlete_id', coachId)
    .in('access_level', ['view_only', 'admin_coach'])
    .limit(1)

  if (!membership || membership.length === 0) return { team: null, accessLevel: null }

  const { data: team, error: teamErr } = await supabaseAdmin
    .from('teams')
    .select('*')
    .eq('id', membership[0].team_id)
    .single()

  if (teamErr && teamErr.code !== 'PGRST116') throw teamErr
  return { team: team || null, accessLevel: membership[0].access_level }
}

// ─── Assistant coach join ─────────────────────────────────────────────────────

/**
 * Add a coach to a team as view_only assistant coach.
 * Throws 409 if they're already on a team.
 */
async function joinTeamAsCoach(teamId, coachId) {
  const { data, error } = await supabaseAdmin
    .from('team_members')
    .insert({ team_id: teamId, athlete_id: coachId, access_level: 'view_only' })
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Team coaches management ──────────────────────────────────────────────────

/**
 * Returns all assistant coaches on a team (excludes the head coach and athletes).
 * Each record includes profile info + access_level + joined_at.
 */
async function getTeamCoaches(teamId) {
  const { data: memberRows, error: memberErr } = await supabaseAdmin
    .from('team_members')
    .select('athlete_id, access_level, joined_at')
    .eq('team_id', teamId)
    .in('access_level', ['view_only', 'admin_coach'])
    .order('joined_at', { ascending: true })

  if (memberErr) throw memberErr
  if (!memberRows || memberRows.length === 0) return []

  const coachIds = memberRows.map(m => m.athlete_id)
  const { data: profiles, error: profErr } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', coachIds)

  if (profErr) throw profErr

  const profileMap = {}
  for (const p of profiles || []) profileMap[p.id] = p

  return memberRows.map(m => ({
    id:           m.athlete_id,
    full_name:    profileMap[m.athlete_id]?.full_name || 'Unknown',
    avatar_url:   profileMap[m.athlete_id]?.avatar_url || null,
    access_level: m.access_level,
    joined_at:    m.joined_at,
  }))
}

/**
 * Update an assistant coach's access level (head coach only).
 * newLevel must be 'view_only' or 'admin_coach'.
 */
async function updateCoachAccessLevel(teamId, coachId, newLevel) {
  if (!['view_only', 'admin_coach'].includes(newLevel)) {
    throw Object.assign(new Error('Invalid access level'), { status: 400 })
  }

  const { error } = await supabaseAdmin
    .from('team_members')
    .update({ access_level: newLevel })
    .eq('team_id', teamId)
    .eq('athlete_id', coachId)
    .in('access_level', ['view_only', 'admin_coach'])

  if (error) throw error
}

/**
 * Remove an assistant coach from a team (head coach only).
 */
async function removeCoachFromTeam(teamId, coachId) {
  const { error } = await supabaseAdmin
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('athlete_id', coachId)
    .in('access_level', ['view_only', 'admin_coach'])

  if (error) throw error
}

module.exports = {
  createTeam,
  getTeamByCoach,
  getTeamByInviteCode,
  getTeamByCoachCode,
  joinTeam,
  joinTeamAsCoach,
  getAthleteTeam,
  getAthleteTeams,
  resolveCoachTeamAndAccess,
  getTeamCoaches,
  updateCoachAccessLevel,
  removeCoachFromTeam,
}
