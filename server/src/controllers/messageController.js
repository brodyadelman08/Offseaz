const { getProfile } = require('../services/authService')
const { resolveCoachTeamAndAccess } = require('../services/teamsService')
const {
  getConversationList,
  getConversationThread,
  sendChatMessage,
  getTeamAthletes,
} = require('../services/messageService')
const { sendError } = require('../utils/errorResponse')

// GET /api/messages/conversations
async function conversations(req, res) {
  try {
    const profile = await getProfile(req.user.id)
    // Optional ?team_id lets multi-team coaches and athletes scope the
    // conversation list to their currently-selected team.
    const teamId = req.query.team_id || null
    const list = await getConversationList(req.user.id, profile.role, teamId)
    res.json({ conversations: list })
  } catch (err) {
    sendError(res, err, 'Failed to load conversations.')
  }
}

// GET /api/messages/thread/:convId
async function thread(req, res) {
  const { convId } = req.params
  try {
    const profile  = await getProfile(req.user.id)
    const teamId   = req.query.team_id || null
    const messages = await getConversationThread(req.user.id, profile.role, convId, teamId)
    res.json({ messages })
  } catch (err) {
    sendError(res, err, 'Failed to load messages.')
  }
}

// POST /api/messages/thread/:convId
async function send(req, res) {
  const { convId }  = req.params
  const { content } = req.body
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Message content is required' })
  }
  try {
    const profile = await getProfile(req.user.id)
    // View-only coaches cannot send messages
    if (profile.role === 'coach') {
      const { accessLevel } = await resolveCoachTeamAndAccess(req.user.id)
      if (accessLevel === 'view_only') {
        return res.status(403).json({ error: 'View-only coaches cannot send messages' })
      }
    }
    const message = await sendChatMessage(req.user.id, profile.role, convId, content.trim())
    res.status(201).json({ message })
  } catch (err) {
    sendError(res, err, 'Failed to send message.')
  }
}

// GET /api/messages/athletes  (coach only — roster picker helper)
async function athletes(req, res) {
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can access this' })
    }
    const list = await getTeamAthletes(req.user.id, req.query.team_id || null)
    res.json({ athletes: list })
  } catch (err) {
    sendError(res, err, 'Failed to load athletes.')
  }
}

module.exports = { conversations, thread, send, athletes }
