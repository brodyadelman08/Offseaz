const supabaseAdmin = require('../config/supabase')

// ── Coach sends a new top-level message ──────────────────────────────────────

async function sendMessage(senderId, { recipient_id, body }) {
  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('coach_id', senderId)
    .single()
  if (teamError) throw teamError

  const { data, error } = await supabaseAdmin
    .from('team_messages')
    .insert({
      team_id:      team.id,
      sender_id:    senderId,
      recipient_id: recipient_id || null,
      content:      body,
      parent_id:    null,
      is_read:      false,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Athlete replies to a top-level message ───────────────────────────────────

async function sendReply(athleteId, { parent_id, body }) {
  // Verify the parent exists, is top-level, and belongs to a team the athlete is on
  const { data: parent, error: parentErr } = await supabaseAdmin
    .from('team_messages')
    .select('id, team_id, sender_id')
    .eq('id', parent_id)
    .is('parent_id', null)
    .single()
  if (parentErr || !parent) throw new Error('Message not found')

  const { data: membership } = await supabaseAdmin
    .from('team_members')
    .select('team_id')
    .eq('athlete_id', athleteId)
    .eq('team_id', parent.team_id)
    .maybeSingle()
  if (!membership) throw new Error('Not a member of this team')

  const { data, error } = await supabaseAdmin
    .from('team_messages')
    .insert({
      team_id:      parent.team_id,
      sender_id:    athleteId,
      recipient_id: parent.sender_id,  // coach who sent the original
      parent_id:    parent_id,
      content:      body,
      is_read:      false,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

// ── Coach inbox: top-level messages + reply counts ───────────────────────────

async function getMessagesForCoach(coachId) {
  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('coach_id', coachId)
    .single()
  if (teamError && teamError.code !== 'PGRST116') throw teamError
  if (!team) return []

  const { data, error } = await supabaseAdmin
    .from('team_messages')
    .select(`
      id, content, created_at, recipient_id,
      sender:profiles!team_messages_sender_id_fkey ( full_name ),
      recipient:profiles!team_messages_recipient_id_fkey ( full_name )
    `)
    .eq('team_id', team.id)
    .is('parent_id', null)
    .order('created_at', { ascending: false })
  if (error) throw error

  const rows = data || []
  if (rows.length === 0) return []

  // Fetch reply stats (count + unread flag) for all top-level messages in one query
  const msgIds = rows.map(m => m.id)
  const { data: replies } = await supabaseAdmin
    .from('team_messages')
    .select('parent_id, is_read, sender_id, content, created_at, sender:profiles!team_messages_sender_id_fkey ( full_name )')
    .in('parent_id', msgIds)
    .order('created_at', { ascending: true })

  const replyRows = replies || []

  return rows.map(m => ({
    id:             m.id,
    body:           m.content,
    sent_at:        m.created_at,
    recipient_id:   m.recipient_id,
    sender_name:    m.sender?.full_name    || null,
    recipient_name: m.recipient?.full_name || null,
    reply_count:    replyRows.filter(r => r.parent_id === m.id).length,
    has_unread:     replyRows.some(r => r.parent_id === m.id && !r.is_read),
    // Include the latest reply preview
    latest_reply:   replyRows.filter(r => r.parent_id === m.id).slice(-1)[0] || null,
  }))
}

// ── Athlete inbox: top-level messages + athlete's own replies ────────────────

async function getMessagesForAthlete(athleteId) {
  const { data: membership, error: memberError } = await supabaseAdmin
    .from('team_members')
    .select('team_id')
    .eq('athlete_id', athleteId)
    .single()
  if (memberError && memberError.code !== 'PGRST116') throw memberError
  if (!membership) return []

  const { data, error } = await supabaseAdmin
    .from('team_messages')
    .select(`
      id, content, created_at, recipient_id,
      sender:profiles!team_messages_sender_id_fkey ( full_name )
    `)
    .eq('team_id', membership.team_id)
    .is('parent_id', null)
    .or(`recipient_id.is.null,recipient_id.eq.${athleteId}`)
    .order('created_at', { ascending: false })
  if (error) throw error

  const rows = data || []
  if (rows.length === 0) return []

  // Fetch all replies for these messages (from anyone)
  const msgIds = rows.map(m => m.id)
  const { data: replies } = await supabaseAdmin
    .from('team_messages')
    .select(`
      id, content, created_at, parent_id, sender_id,
      sender:profiles!team_messages_sender_id_fkey ( full_name )
    `)
    .in('parent_id', msgIds)
    .order('created_at', { ascending: true })

  const replyRows = replies || []

  return rows.map(m => ({
    id:           m.id,
    body:         m.content,
    sent_at:      m.created_at,
    recipient_id: m.recipient_id,
    sender_name:  m.sender?.full_name || null,
    replies: replyRows
      .filter(r => r.parent_id === m.id)
      .map(r => ({
        id:          r.id,
        body:        r.content,
        sent_at:     r.created_at,
        sender_id:   r.sender_id,
        sender_name: r.sender?.full_name || null,
      })),
  }))
}

// ── Get full thread (for coach expanding a conversation) ─────────────────────

async function getThread(messageId) {
  const { data: parent, error: parentErr } = await supabaseAdmin
    .from('team_messages')
    .select(`
      id, content, created_at, recipient_id, team_id,
      sender:profiles!team_messages_sender_id_fkey ( full_name ),
      recipient:profiles!team_messages_recipient_id_fkey ( full_name )
    `)
    .eq('id', messageId)
    .is('parent_id', null)
    .single()
  if (parentErr || !parent) throw new Error('Message not found')

  const { data: replies } = await supabaseAdmin
    .from('team_messages')
    .select(`
      id, content, created_at, sender_id,
      sender:profiles!team_messages_sender_id_fkey ( full_name )
    `)
    .eq('parent_id', messageId)
    .order('created_at', { ascending: true })

  // Mark replies as read now that the coach is viewing
  if (replies && replies.length > 0) {
    await supabaseAdmin
      .from('team_messages')
      .update({ is_read: true })
      .eq('parent_id', messageId)
      .eq('is_read', false)
  }

  return {
    id:             parent.id,
    body:           parent.content,
    sent_at:        parent.created_at,
    recipient_id:   parent.recipient_id,
    sender_name:    parent.sender?.full_name    || null,
    recipient_name: parent.recipient?.full_name || null,
    replies: (replies || []).map(r => ({
      id:          r.id,
      body:        r.content,
      sent_at:     r.created_at,
      sender_id:   r.sender_id,
      sender_name: r.sender?.full_name || null,
    })),
  }
}

// ── Roster list for compose recipient selector ───────────────────────────────

async function getTeamAthletes(coachId) {
  const { data: team, error: teamError } = await supabaseAdmin
    .from('teams')
    .select('id')
    .eq('coach_id', coachId)
    .single()
  if (teamError && teamError.code !== 'PGRST116') throw teamError
  if (!team) return []

  const { data, error } = await supabaseAdmin
    .from('team_members')
    .select('athlete_id, profiles!team_members_athlete_id_fkey ( id, full_name )')
    .eq('team_id', team.id)
  if (error) throw error

  return (data || []).map(m => ({
    id:        m.profiles.id,
    full_name: m.profiles.full_name,
  }))
}

module.exports = {
  sendMessage, sendReply,
  getMessagesForCoach, getMessagesForAthlete,
  getThread, getTeamAthletes,
}
