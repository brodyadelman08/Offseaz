const supabaseAdmin = require('../config/supabase')

const VALID_LIFTS = ['bench_press', 'squat', 'deadlift', 'trap_bar_deadlift', 'power_clean', 'overhead_press']

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
  console.log('[getCoachRoster] coachId:', coachId)

  const { data: team, error: teamErr } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('coach_id', coachId)
    .single()

  console.log('[getCoachRoster] team:', team, 'teamErr:', teamErr?.message)
  if (teamErr && teamErr.code !== 'PGRST116') throw teamErr
  if (!team) return []

  // Step 1: get athlete_ids and join dates (no FK hints — avoids PostgREST constraint issues)
  const { data: memberRows, error: membersErr } = await supabaseAdmin
    .from('team_members')
    .select('athlete_id, joined_at')
    .eq('team_id', team.id)

  console.log('[getCoachRoster] memberRows:', memberRows?.length, 'membersErr:', membersErr?.message)
  if (membersErr) throw membersErr
  if (!memberRows || memberRows.length === 0) return []

  const athleteIds = memberRows.map(m => m.athlete_id)
  console.log('[getCoachRoster] athleteIds:', athleteIds)

  // Step 2: fetch profiles, surveys, maxes, and recent injury flags in parallel
  // NOTE: completed_at omitted from survey select — it may not exist in all environments
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const [
    { data: profileRows, error: profErr },
    { data: surveyRows,  error: surveyErr },
    { data: maxRows },
    { data: injuryRows },
  ] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', athleteIds),
    supabaseAdmin
      .from('survey_responses')
      .select('athlete_id, sport, position, goals, time_per_week')
      .in('athlete_id', athleteIds),
    supabaseAdmin
      .from('lifting_maxes')
      .select('athlete_id, lift, weight_lbs, reps')
      .in('athlete_id', athleteIds),
    supabaseAdmin
      .from('workout_logs')
      .select('athlete_id')
      .in('athlete_id', athleteIds)
      .eq('status', 'skipped_injury')
      .gte('logged_at', sevenDaysAgo),
  ])

  console.log('[getCoachRoster] profileRows:', profileRows?.length, 'profErr:', profErr?.message)
  console.log('[getCoachRoster] surveyRows:', surveyRows?.length, 'surveyErr:', surveyErr?.message)
  if (profErr) throw profErr

  // Build lookup maps
  const joinedMap = {}
  for (const m of memberRows) joinedMap[m.athlete_id] = m.joined_at

  const surveyMap = {}
  for (const s of surveyRows || []) surveyMap[s.athlete_id] = s

  const maxesMap = buildMaxesMap(maxRows)

  const recentInjurySet = new Set((injuryRows || []).map(l => l.athlete_id))

  let results = (profileRows || []).map(p => ({
    id: p.id,
    full_name: p.full_name,
    avatar_url: p.avatar_url || null,
    joined_at: joinedMap[p.id] || null,
    survey: surveyMap[p.id] || null,
    maxes: maxesMap[p.id] || {},
    has_recent_injury: recentInjurySet.has(p.id),
  }))

  console.log('[getCoachRoster] results before sort:', results.length)

  // Sorting
  if (sort === 'position') {
    results.sort((a, b) =>
      (a.survey?.position || '￿').localeCompare(b.survey?.position || '￿')
    )
  } else if (sort === 'joined') {
    results.sort((a, b) => new Date(a.joined_at) - new Date(b.joined_at))
  } else {
    results.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))
  }

  console.log('[getCoachRoster] returning', results.length, 'athletes')
  return results
}

// ─── Athlete roster ────────────────────────────────────────────────────────────

/**
 * Returns the team roster from an athlete's perspective, with privacy filtering.
 * Private teammates: only name + avatar.
 * Public teammates: name, avatar, sport, position.
 *
 * Uses the same simple join pattern as getAthleteTeam (no FK hints) to avoid
 * failures when FK constraint names differ across environments.
 */
async function getAthleteRoster(athleteId) {
  // Get athlete's team membership (separate query — avoids FK hint fragility)
  const { data: membership, error: memberErr } = await supabaseAdmin
    .from('team_members')
    .select('team_id')
    .eq('athlete_id', athleteId)
    .single()

  if (memberErr && memberErr.code !== 'PGRST116') throw memberErr
  if (!membership) return { team: null, roster: [] }

  // Fetch team info (includes coach_id for pinning the coach card)
  const { data: teamData, error: teamErr } = await supabaseAdmin
    .from('teams')
    .select('id, name, coach_id')
    .eq('id', membership.team_id)
    .single()

  if (teamErr && teamErr.code !== 'PGRST116') throw teamErr
  if (!teamData) return { team: null, roster: [] }

  // Get all athlete_ids on the same team
  const { data: memberRows, error: membersErr } = await supabaseAdmin
    .from('team_members')
    .select('athlete_id')
    .eq('team_id', membership.team_id)

  if (membersErr) throw membersErr

  const athleteIds = (memberRows || []).map(m => m.athlete_id)
  if (athleteIds.length === 0) return { team: teamData, roster: [] }

  // Fetch profiles, surveys, and coach profile in parallel — no FK hints needed
  const [
    { data: profileRows, error: profErr },
    { data: surveyRows },
    { data: coachProfile },
  ] = await Promise.all([
    supabaseAdmin
      .from('profiles')
      .select('id, full_name, avatar_url, privacy_team')
      .in('id', athleteIds),
    supabaseAdmin
      .from('survey_responses')
      .select('athlete_id, sport, position')
      .in('athlete_id', athleteIds),
    teamData.coach_id
      ? supabaseAdmin
          .from('profiles')
          .select('id, full_name, avatar_url')
          .eq('id', teamData.coach_id)
          .single()
          .then(r => r.data)
      : Promise.resolve(null),
  ])

  if (profErr) throw profErr

  const surveyMap = {}
  for (const s of surveyRows || []) surveyMap[s.athlete_id] = s

  const roster = (profileRows || []).map(p => {
    if (p.privacy_team === 'private') {
      return { id: p.id, full_name: p.full_name, avatar_url: p.avatar_url || null, privacy: 'private' }
    }
    const survey = surveyMap[p.id]
    return {
      id: p.id,
      full_name: p.full_name,
      avatar_url: p.avatar_url || null,
      privacy: 'public',
      sport: survey?.sport || null,
      position: survey?.position || null,
    }
  })

  roster.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''))

  // Attach coach info to team so the client can pin a Coach card
  const team = {
    id: teamData.id,
    name: teamData.name,
    coach: coachProfile ? {
      id: coachProfile.id,
      full_name: coachProfile.full_name,
      avatar_url: coachProfile.avatar_url || null,
    } : null,
  }

  return { team, roster }
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
