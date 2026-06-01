const { getProfile } = require('../services/authService')
const {
  sendMessage, sendReply,
  getMessagesForCoach, getMessagesForAthlete,
  getThread, getTeamAthletes,
} = require('../services/messageService')

async function send(req, res) {
  const { recipient_id, body } = req.body
  if (!body || !body.trim()) {
    return res.status(400).json({ error: 'Message body is required' })
  }
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can send messages' })
    }
    const message = await sendMessage(req.user.id, {
      recipient_id: recipient_id || null,
      body: body.trim(),
    })
    res.status(201).json({ message })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function reply(req, res) {
  const { messageId } = req.params
  const { body } = req.body
  if (!body || !body.trim()) {
    return res.status(400).json({ error: 'Reply body is required' })
  }
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'athlete') {
      return res.status(403).json({ error: 'Only athletes can reply to messages' })
    }
    const message = await sendReply(req.user.id, {
      parent_id: messageId,
      body: body.trim(),
    })
    res.status(201).json({ message })
  } catch (err) {
    if (err.message === 'Not a member of this team') {
      return res.status(403).json({ error: err.message })
    }
    res.status(500).json({ error: err.message })
  }
}

async function inbox(req, res) {
  try {
    const profile  = await getProfile(req.user.id)
    const messages = profile.role === 'coach'
      ? await getMessagesForCoach(req.user.id)
      : await getMessagesForAthlete(req.user.id)
    res.json({ messages })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function thread(req, res) {
  const { messageId } = req.params
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can view full threads' })
    }
    const data = await getThread(messageId)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function athletes(req, res) {
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can access this' })
    }
    const list = await getTeamAthletes(req.user.id)
    res.json({ athletes: list })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { send, reply, inbox, thread, athletes }
