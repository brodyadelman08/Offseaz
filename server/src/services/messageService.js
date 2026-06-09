const supabaseAdmin = require('../config/supabase')

// ── Internal helpers ─────────────────────────────────────────────────────────

function getInitials(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return (parts[0][0] || '?').toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function shapeMessage(m, viewerId) {
  return {
    id:          m.id,
    body:        m.content,
    sent_at:     m.created_at,
    sender_id:   m.sender_id,
    sender_name: m.sender?.full_name || null,
    is_mine:     m.sender_id === viewerId,
    initials:    getInitials(m.sender?.full_name),
  }
}

// Returns { teamId, coachId } or null.
// When teamId is supplied, only that specific team is considered — used when
// the client passes ?team_id= after a multi-team switch.
async function getUserTeamInfo(userId, role, teamId = null) {
  if (role === 'coach') {
    // Head coach: look up by coach_id. Honour explicit teamId if given.
    let query = supabaseAdmin.from('teams').select('id, coach_id').eq('coach_id', userId)
    if (teamId) query = query.eq('id', teamId)
    const { data: owned, error: ownErr } = await query.order('created_at', { ascending: true }).limit(1)
    if (ownErr && ownErr.code !== 'PGRST116') throw ownErr
    if (owned?.length) return { teamId: owned[0].id, coachId: userId }

    // Assistant coach: team_members row. Filter by teamId when provided.
    let memQuery = supabaseAdmin
      .from('team_members')
      .select('team_id')
      .eq('athlete_id', userId)
      .in('access_level', ['view_only', 'admin_coach'])
    if (teamId) {
      memQuery = memQuery.eq('team_id', teamId)
    } else {
      memQuery = memQuery.order('joined_at', { ascending: true }).limit(1)
    }
    const { data: memberships, error: memErr } = await memQuery
    if (memErr && memErr.code !== 'PGRST116') throw memErr
    if (!memberships?.length) return null
    const tm = memberships[0]
    const { data: teamRow } = await supabaseAdmin
      .from('teams').select('id, coach_id').eq('id', tm.team_id).single()
    if (!teamRow) return null
    return { teamId: teamRow.id, coachId: teamRow.coach_id }
  }

  // Athlete — filter by explicit teamId when provided; otherwise default to
  // the first joined team (join order) to preserve legacy single-team behaviour.
  let athQuery = supabaseAdmin
    .from('team_members')
    .select('team_id, teams!inner(coach_id)')
    .eq('athlete_id', userId)
    .eq('access_level', 'athlete')
  if (teamId) {
    athQuery = athQuery.eq('team_id', teamId)
  } else {
    athQuery = athQuery.order('joined_at', { ascending: true }).limit(1)
  }
  const { data: rows, error } = await athQuery
  if (error && error.code !== 'PGRST116') throw error
  if (!rows?.length) return null
  return { teamId: rows[0].team_id, coachId: rows[0].teams.coach_id }
}

// Fetch all DM messages between two users in a team (two queries merged)
async function fetchDMMessages(teamId, userA, userB, ascending = true) {
  const sel = `id, content, created_at, sender_id,
    sender:profiles!team_messages_sender_id_fkey(full_name)`

  const [{ data: sent }, { data: received }] = await Promise.all([
    supabaseAdmin
      .from('team_messages')
      .select(sel)
      .eq('team_id', teamId)
      .eq('sender_id', userA)
      .eq('recipient_id', userB)
      .order('created_at', { ascending }),
    supabaseAdmin
      .from('team_messages')
      .select(sel)
      .eq('team_id', teamId)
      .eq('sender_id', userB)
      .eq('recipient_id', userA)
      .order('created_at', { ascending }),
  ])

  const all = [...(sent || []), ...(received || [])]
  all.sort((a, b) =>
    ascending
      ? new Date(a.created_at) - new Date(b.created_at)
      : new Date(b.created_at) - new Date(a.created_at),
  )
  return all
}

// ── Conversation list (sidebar) ───────────────────────────────────────────────

async function getConversationList(userId, role, teamId = null) {
  const info = await getUserTeamInfo(userId, role, teamId)
  if (!info) return []
  const { teamId: resolvedTeamId, coachId } = info

  const sel = `id, content, created_at, sender_id,
    sender:profiles!team_messages_sender_id_fkey(full_name)`

  // Group chat: last message + unread count
  const [{ data: groupLatest }, { count: groupUnread }] = await Promise.all([
    supabaseAdmin
      .from('team_messages')
      .select(sel)
      .eq('team_id', resolvedTeamId)
      .is('recipient_id', null)
      .order('created_at', { ascending: false })
      .limit(1),
    supabaseAdmin
      .from('team_messages')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', resolvedTeamId)
      .is('recipient_id', null)
      .eq('is_read', false)
      .neq('sender_id', userId),
  ])

  const gl = groupLatest?.[0]
  const conversations = [{
    id:          'group',
    name:        'Group Chat',
    type:        'group',
    isPinned:    true,
    unreadCount: groupUnread || 0,
    lastMessage: gl ? {
      body:        gl.content,
      sent_at:     gl.created_at,
      sender_name: gl.sender?.full_name,
      is_mine:     gl.sender_id === userId,
    } : null,
  }]

  if (role === 'coach') {
    // One DM conversation per team athlete — filter to athletes only
    const { data: members } = await supabaseAdmin
      .from('team_members')
      .select('athlete_id')
      .eq('team_id', resolvedTeamId)
      .eq('access_level', 'athlete')

    // Fetch profiles separately to avoid FK hint fragility
    const memberIds = (members || []).map(m => m.athlete_id)
    const { data: profileRows } = memberIds.length
      ? await supabaseAdmin.from('profiles').select('id, full_name').in('id', memberIds)
      : { data: [] }
    const profileMap = {}
    for (const p of profileRows || []) profileMap[p.id] = p.full_name

    await Promise.all((members || []).map(async m => {
      const athleteId   = m.athlete_id
      const athleteName = profileMap[athleteId] || 'Athlete'

      const [dmAll, { count: unread }] = await Promise.all([
        fetchDMMessages(resolvedTeamId, userId, athleteId, false),
        supabaseAdmin
          .from('team_messages')
          .select('id', { count: 'exact', head: true })
          .eq('team_id', resolvedTeamId)
          .eq('sender_id', athleteId)
          .eq('recipient_id', userId)
          .eq('is_read', false),
      ])

      const last = dmAll[0]
      conversations.push({
        id:          athleteId,
        name:        athleteName,
        type:        'dm',
        isPinned:    false,
        unreadCount: unread || 0,
        lastMessage: last ? {
          body:        last.content,
          sent_at:     last.created_at,
          sender_name: last.sender?.full_name,
          is_mine:     last.sender_id === userId,
        } : null,
      })
    }))
  } else {
    // Athlete: DM with coach
    const [{ data: coachProfile }, dmAll, { count: unread }] = await Promise.all([
      supabaseAdmin.from('profiles').select('full_name').eq('id', coachId).single(),
      fetchDMMessages(resolvedTeamId, userId, coachId, false),
      supabaseAdmin
        .from('team_messages')
        .select('id', { count: 'exact', head: true })
        .eq('team_id', resolvedTeamId)
        .eq('sender_id', coachId)
        .eq('recipient_id', userId)
        .eq('is_read', false),
    ])

    const last = dmAll[0]
    conversations.push({
      id:          coachId,
      name:        coachProfile?.full_name || 'Coach',
      type:        'dm',
      isPinned:    false,
      unreadCount: unread || 0,
      lastMessage: last ? {
        body:        last.content,
        sent_at:     last.created_at,
        sender_name: last.sender?.full_name,
        is_mine:     last.sender_id === userId,
      } : null,
    })
  }

  return conversations
}

// ── Full thread for one conversation ─────────────────────────────────────────

async function getConversationThread(userId, role, conversationId, teamId = null) {
  const info = await getUserTeamInfo(userId, role, teamId)
  if (!info) return []
  const { teamId: resolvedTeamId } = info

  let rows

  if (conversationId === 'group') {
    const { data, error } = await supabaseAdmin
      .from('team_messages')
      .select(`id, content, created_at, sender_id,
        sender:profiles!team_messages_sender_id_fkey(full_name)`)
      .eq('team_id', resolvedTeamId)
      .is('recipient_id', null)
      .order('created_at', { ascending: true })
    if (error) throw error
    rows = data || []

    // Mark unread as read
    await supabaseAdmin
      .from('team_messages')
      .update({ is_read: true })
      .eq('team_id', resolvedTeamId)
      .is('recipient_id', null)
      .eq('is_read', false)
      .neq('sender_id', userId)
  } else {
    rows = await fetchDMMessages(resolvedTeamId, userId, conversationId, true)

    // Mark messages from the other person as read
    await supabaseAdmin
      .from('team_messages')
      .update({ is_read: true })
      .eq('team_id', resolvedTeamId)
      .eq('sender_id', conversationId)
      .eq('recipient_id', userId)
      .eq('is_read', false)
  }

  return rows.map(m => shapeMessage(m, userId))
}

// ── Send a message ────────────────────────────────────────────────────────────

async function sendChatMessage(senderId, role, conversationId, content) {
  const info = await getUserTeamInfo(senderId, role)
  if (!info) throw new Error('Not on a team')
  const { teamId } = info

  const recipientId = conversationId === 'group' ? null : conversationId

  const { data, error } = await supabaseAdmin
    .from('team_messages')
    .insert({
      team_id:      teamId,
      sender_id:    senderId,
      recipient_id: recipientId,
      content,
      parent_id:    null,
      is_read:      false,
    })
    .select(`id, content, created_at, sender_id,
      sender:profiles!team_messages_sender_id_fkey(full_name)`)
    .single()
  if (error) throw error

  return shapeMessage(data, senderId)
}

// ── Legacy: roster list for coach ────────────────────────────────────────────

async function getTeamAthletes(coachId, teamId = null) {
  let resolvedTeamId = teamId
  if (!resolvedTeamId) {
    const { data: teams } = await supabaseAdmin
      .from('teams').select('id').eq('coach_id', coachId).limit(1)
    if (!teams?.length) return []
    resolvedTeamId = teams[0].id
  }
  // Use two queries to avoid FK hint fragility
  const { data: members, error } = await supabaseAdmin
    .from('team_members')
    .select('athlete_id')
    .eq('team_id', resolvedTeamId)
    .eq('access_level', 'athlete')
  if (error) throw error
  if (!members?.length) return []
  const ids = members.map(m => m.athlete_id)
  const { data: profiles } = await supabaseAdmin
    .from('profiles').select('id, full_name').in('id', ids)
  return (profiles || []).map(p => ({ id: p.id, full_name: p.full_name }))
}

module.exports = {
  getConversationList,
  getConversationThread,
  sendChatMessage,
  getTeamAthletes,
}
