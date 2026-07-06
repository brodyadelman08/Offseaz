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

// ─── Multi-team support: list all teams for a coach ──────────────────────────

/**
 * Returns all teams a coach owns or is an assistant on.
 * Each team object has an extra `my_access_level` field.
 */
async function getCoachTeams(coachId) {
  // All teams this coach owns
  const { data: owned, error } = await supabaseAdmin
    .from('teams').select('*').eq('coach_id', coachId).order('created_at', { ascending: true })
  if (error) throw error

  // All teams where this coach is an assistant
  const { data: memberships } = await supabaseAdmin
    .from('team_members').select('team_id, access_level')
    .eq('athlete_id', coachId).in('access_level', ['view_only', 'admin_coach'])

  let assistantTeams = []
  if (memberships?.length) {
    const ids = memberships.map(m => m.team_id)
    const { data: aTeams } = await supabaseAdmin.from('teams').select('*').in('id', ids)
    assistantTeams = aTeams || []
  }
  const membershipMap = Object.fromEntries((memberships || []).map(m => [m.team_id, m.access_level]))

  return [
    ...(owned || []).map(t => ({ ...t, my_access_level: 'head_coach' })),
    ...assistantTeams.map(t => ({ ...t, my_access_level: membershipMap[t.id] || 'view_only' })),
  ]
}

// ─── Assistant coach access resolution ────────────────────────────────────────

/**
 * For any coach user, return their team and access level.
 * Accepts an optional teamId to resolve a specific team.
 * Head coaches  → { team, accessLevel: 'head_coach' }
 * Asst. coaches → { team, accessLevel: 'view_only' | 'admin_coach' }
 * No team       → { team: null, accessLevel: null }
 */
async function resolveCoachTeamAndAccess(coachId, teamId = null) {
  if (teamId) {
    const { data: ownedTeam } = await supabaseAdmin
      .from('teams').select('*').eq('id', teamId).eq('coach_id', coachId).maybeSingle()
    if (ownedTeam) return { team: ownedTeam, accessLevel: 'head_coach' }

    const { data: membership } = await supabaseAdmin
      .from('team_members').select('team_id, access_level')
      .eq('team_id', teamId).eq('athlete_id', coachId)
      .in('access_level', ['view_only', 'admin_coach']).maybeSingle()
    if (!membership) return { team: null, accessLevel: null }

    const { data: team } = await supabaseAdmin.from('teams').select('*').eq('id', teamId).maybeSingle()
    return { team: team || null, accessLevel: membership.access_level }
  }

  // Fallback: first owned team
  const { data: ownedTeams } = await supabaseAdmin
    .from('teams').select('*').eq('coach_id', coachId).limit(1)
  if (ownedTeams?.length) return { team: ownedTeams[0], accessLevel: 'head_coach' }

  // Then assistant team
  const { data: memberships } = await supabaseAdmin
    .from('team_members').select('team_id, access_level')
    .eq('athlete_id', coachId).in('access_level', ['view_only', 'admin_coach']).limit(1)
  if (!memberships?.length) return { team: null, accessLevel: null }

  const { data: team } = await supabaseAdmin
    .from('teams').select('*').eq('id', memberships[0].team_id).maybeSingle()
  return { team: team || null, accessLevel: memberships[0].access_level }
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

/**
 * Transfer head-coach ownership of a team to an existing assistant coach.
 * The previous head coach is downgraded to admin_coach (assistant with write access).
 *
 * No new SQL needed — updates existing teams.coach_id and team_members rows.
 */
async function transferTeamOwnership(teamId, currentHeadCoachId, newHeadCoachId) {
  // 1. Promote the new head coach: insert them as head_coach in teams table
  const { error: teamErr } = await supabaseAdmin
    .from('teams')
    .update({ coach_id: newHeadCoachId })
    .eq('id', teamId)
    .eq('coach_id', currentHeadCoachId)  // safety: only if caller is the current owner

  if (teamErr) throw teamErr

  // 2. Remove the new head coach from team_members (they're now the owner, not an assistant)
  await supabaseAdmin
    .from('team_members')
    .delete()
    .eq('team_id', teamId)
    .eq('athlete_id', newHeadCoachId)

  // 3. Add the old head coach as an admin_coach assistant (if they want to stay)
  //    We upsert so calling this twice is safe.
  await supabaseAdmin
    .from('team_members')
    .upsert(
      { team_id: teamId, athlete_id: currentHeadCoachId, access_level: 'admin_coach' },
      { onConflict: 'team_id,athlete_id' }
    )
}

// ─── Team-membership verification (IDOR guards) ───────────────────────────────

/**
 * Verifies a single athlete is a member (access_level 'athlete') of the given team.
 */
async function isAthleteOnTeam(teamId, athleteId) {
  if (!teamId || !athleteId) return false
  const { data, error } = await supabaseAdmin
    .from('team_members')
    .select('athlete_id')
    .eq('team_id', teamId)
    .eq('athlete_id', athleteId)
    .eq('access_level', 'athlete')
    .limit(1)

  if (error) throw error
  return Boolean(data?.length)
}

/**
 * Filters a list of athlete ids down to only those that are members
 * (access_level 'athlete') of the given team.
 */
async function filterAthleteIdsOnTeam(teamId, athleteIds) {
  if (!teamId || !athleteIds?.length) return []
  const { data, error } = await supabaseAdmin
    .from('team_members')
    .select('athlete_id')
    .eq('team_id', teamId)
    .eq('access_level', 'athlete')
    .in('athlete_id', athleteIds)

  if (error) throw error
  return (data || []).map(r => r.athlete_id)
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
  getCoachTeams,
  resolveCoachTeamAndAccess,
  getTeamCoaches,
  updateCoachAccessLevel,
  removeCoachFromTeam,
  transferTeamOwnership,
  isAthleteOnTeam,
  filterAthleteIdsOnTeam,
}
