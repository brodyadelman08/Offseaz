const { getProfile } = require('../services/authService')
const {
  sendMessage,
  getMessagesForCoach,
  getMessagesForAthlete,
  getTeamAthletes,
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

async function inbox(req, res) {
  try {
    const profile = await getProfile(req.user.id)

    const messages = profile.role === 'coach'
      ? await getMessagesForCoach(req.user.id)
      : await getMessagesForAthlete(req.user.id)

    res.json({ messages })
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

module.exports = { send, inbox, athletes }
