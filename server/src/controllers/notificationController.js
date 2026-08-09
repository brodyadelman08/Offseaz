const { getProfile } = require('../services/authService')
const { getCoachNotifications, dismissAthleteNotifications } = require('../services/notificationService')
const { sendError } = require('../utils/errorResponse')

async function list(req, res) {
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') return res.status(403).json({ error: 'Coaches only' })
    const notifications = await getCoachNotifications(req.user.id, req.query.team_id || null)
    res.json({ notifications })
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: err.message })
    sendError(res, err, 'Failed to load notifications.')
  }
}

async function dismissByAthlete(req, res) {
  const { athleteId } = req.params
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') return res.status(403).json({ error: 'Coaches only' })
    await dismissAthleteNotifications(req.user.id, athleteId)
    res.json({ ok: true })
  } catch (err) {
    sendError(res, err, 'Failed to dismiss notifications.')
  }
}

module.exports = { list, dismissByAthlete }
