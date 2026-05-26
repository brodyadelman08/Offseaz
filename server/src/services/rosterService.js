const supabaseAdmin = require('../config/supabase')

const VALID_LIFTS = ['bench_press', 'squat', 'deadlift', 'power_clean', 'overhead_press']

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Given an array of {athlete_id, lift, weight_lbs, reps} rows,
 * build a map: athleteId → { liftKey → { weight_lbs, reps } (best/heaviest) }
 */
function buildMaxesMap(rows) {
  const map = {}
  for (const row of rows || []) {
    if (!map[row.athlete_id]) map[row.athlete_id] = {}
    const current = map[row.athlete_id][row.lift]
    if (!current || row.weight_lbs > current.weight_lbs) {
      map[row.athlete_id][row.lift] = { weight_lbs: row.weight_lbs, reps: row.reps }
    }
  }
  return map
}

// ─── Coach roster ──────────────────────────────────────────────────────────────

/**
 * Returns the full team roster for a coach.
 * sort: 'name' | 'position' | 'joined'
 */
async function getCoachRoster(coachId, sort = 'name') {
  const { data: team, error: teamErr } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('coach_id', coachId)
    .single()

  if (teamErr && teamErr.code !== 'PGRST116') throw teamErr
  if (!team) return []

  const { data: members, error: membersErr } = await supabaseAdmin
    .from('team_members')
    .select(`
      created_at,
      profiles!team_members_athlete_id_fkey ( id, full_name, avatar_url ),
      survey_responses!survey_responses_athlete_id_fkey ( sport, position, goals, time_per_week, completed_at )
    `)
    .eq('team_id', team.id)

  if (membersErr) throw membersErr

  const athleteIds = (members || []).map(m => m.profiles.id)

  // Batch-fetch all maxes for every athlete on the team
  let maxesMap = {}
  if (athleteIds.length > 0) {
    const { data: maxRows } = await supabaseAdmin
      .from('lifting_maxes')
      .select('athlete_id, lift, weight_lbs, reps')
      .in('athlete_id', athleteIds)

    maxesMap = buildMaxesMap(maxRows)
  }

  let results = (members || []).map(m => ({
    id: m.profiles.id,
    full_name: m.profiles.full_name,
    avatar_url: m.profiles.avatar_url || null,
    joined_at: m.created_at,
    survey: m.survey_responses || null,
    maxes: maxesMap[m.profiles.id] || {},
  }))

  // Sorting
  if (sort === 'position') {
    results.sort((a, b) =>
      (a.survey?.position || '￿').localeCompare(b.survey?.position || '￿')
    )
  } else if (sort === 'joined') {
    results.sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at))
  } else {
    results.sort((a, b) => a.full_name.localeCompare(b.full_name))
  }

  return results
}

// ─── Athlete roster ────────────────────────────────────────────────────────────

/**
 * Returns the team roster from an athlete's perspective, with privacy filtering.
 * Private teammates: only name + avatar.
 * Public teammates: name, avatar, sport, position.
 */
async function getAthleteRoster(athleteId) {
  const { data: membership, error: memberErr } = await supabaseAdmin
    .from('team_members')
    .select('team_id')
    .eq('athlete_id', athleteId)
    .single()

  if (memberErr && memberErr.code !== 'PGRST116') throw memberErr
  if (!membership) return { team: null, roster: [] }

  const [{ data: team }, { data: members, error: membersErr }] = await Promise.all([
    supabaseAdmin.from('teams').select('id, name').eq('id', membership.team_id).single(),
    supabaseAdmin
      .from('team_members')
      .select(`
        profiles!team_members_athlete_id_fkey ( id, full_name, avatar_url, privacy_team ),
        survey_responses!survey_responses_athlete_id_fkey ( sport, position )
      `)
      .eq('team_id', membership.team_id),
  ])

  if (membersErr) throw membersErr

  // Include ALL members (including viewer — let client filter self out by id if desired)
  const roster = (members || []).map(m => {
    const p = m.profiles
    if (p.privacy_team === 'private') {
      return { id: p.id, full_name: p.full_name, avatar_url: p.avatar_url, privacy: 'private' }
    }
    return {
      id: p.id,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      privacy: 'public',
      sport: m.survey_responses?.sport || null,
      position: m.survey_responses?.position || null,
    }
  })

  roster.sort((a, b) => a.full_name.localeCompare(b.full_name))

  return { team: team || null, roster }
}

// ─── Teammate profile (athlete views a public teammate) ────────────────────────

/**
 * Returns full profile data for a public teammate.
 * Throws 403 if not on the same team, or if target is private.
 */
async function getTeammateProfile(viewerId, targetId) {
  const [{ data: vMem }, { data: tMem }] = await Promise.all([
    supabaseAdmin.from('team_members').select('team_id').eq('athlete_id', viewerId).single(),
    supabaseAdmin.from('team_members').select('team_id').eq('athlete_id', targetId).single(),
  ])

  if (!vMem || !tMem || vMem.team_id !== tMem.team_id) {
    throw Object.assign(new Error('Not on the same team'), { status: 403 })
  }

  const { data: targetProfile } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, avatar_url, privacy_team')
    .eq('id', targetId)
    .single()

  if (!targetProfile) throw Object.assign(new Error('Athlete not found'), { status: 404 })
  if (targetProfile.privacy_team === 'private') {
    throw Object.assign(new Error('This athlete has a private profile'), { status: 403 })
  }

  const [surveyRes, maxesRes, logsRes] = await Promise.all([
    supabaseAdmin.from('survey_responses').select('*').eq('athlete_id', targetId).single(),
    supabaseAdmin
      .from('lifting_maxes')
      .select('id, lift, weight_lbs, reps, notes, logged_at')
      .eq('athlete_id', targetId)
      .order('logged_at', { ascending: true }),
    supabaseAdmin
      .from('workout_logs')
      .select('status')
      .eq('athlete_id', targetId),
  ])

  // Build per-lift maxes structure (same shape as maxesService)
  const maxes = {}
  for (const lift of VALID_LIFTS) {
    maxes[lift] = { current: null, history: [] }
  }
  for (const row of maxesRes.data || []) {
    if (!maxes[row.lift]) continue
    maxes[row.lift].history.push(row)
  }
  for (const lift of VALID_LIFTS) {
    const entries = maxes[lift].history
    if (entries.length > 0) {
      maxes[lift].current = entries.reduce((best, e) =>
        e.weight_lbs > best.weight_lbs ? e : best
      )
    }
  }

  const logs = logsRes.data || []

  return {
    id: targetProfile.id,
    full_name: targetProfile.full_name,
    avatar_url: targetProfile.avatar_url,
    survey: surveyRes.data || null,
    maxes,
    stats: {
      total_sessions: logs.length,
      completed_sessions: logs.filter(l => l.status === 'completed').length,
    },
  }
}

// ─── Update privacy ────────────────────────────────────────────────────────────

async function updatePrivacy(athleteId, privacyTeam) {
  if (!['public', 'private'].includes(privacyTeam)) {
    throw new Error('privacy_team must be "public" or "private"')
  }

  const { data, error } = await supabaseAdmin
    .from('profiles')
    .update({ privacy_team: privacyTeam })
    .eq('id', athleteId)
    .select()
    .single()

  if (error) throw error
  return data
}

module.exports = { getCoachRoster, getAthleteRoster, getTeammateProfile, updatePrivacy }
