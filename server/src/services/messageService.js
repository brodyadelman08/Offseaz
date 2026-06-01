const supabaseAdmin = require('../config/supabase')

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
      team_id: team.id,
      sender_id: senderId,
      recipient_id: recipient_id || null,
      body,
    })
    .select()
    .single()

  if (error) throw error
  return data
}

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
      id, body, sent_at, recipient_id,
      sender:profiles!team_messages_sender_id_fkey ( full_name ),
      recipient:profiles!team_messages_recipient_id_fkey ( full_name )
    `)
    .eq('team_id', team.id)
    .order('sent_at', { ascending: false })

  if (error) throw error

  return (data || []).map(m => ({
    id: m.id,
    body: m.body,
    sent_at: m.sent_at,
    recipient_id: m.recipient_id,
    sender_name: m.sender?.full_name || null,
    recipient_name: m.recipient?.full_name || null,
  }))
}

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
      id, body, sent_at, recipient_id,
      sender:profiles!team_messages_sender_id_fkey ( full_name )
    `)
    .eq('team_id', membership.team_id)
    .or(`recipient_id.is.null,recipient_id.eq.${athleteId}`)
    .order('sent_at', { ascending: false })

  if (error) throw error

  return (data || []).map(m => ({
    id: m.id,
    body: m.body,
    sent_at: m.sent_at,
    recipient_id: m.recipient_id,
    sender_name: m.sender?.full_name || null,
    recipient_name: null,
  }))
}

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
    id: m.profiles.id,
    full_name: m.profiles.full_name,
  }))
}

module.exports = { sendMessage, getMessagesForCoach, getMessagesForAthlete, getTeamAthletes }
