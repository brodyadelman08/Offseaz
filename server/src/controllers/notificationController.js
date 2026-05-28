const { getProfile } = require('../services/authService')
const { getCoachNotifications, dismissAthleteNotifications } = require('../services/notificationService')

async function list(req, res) {
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') return res.status(403).json({ error: 'Coaches only' })
    const notifications = await getCoachNotifications(req.user.id)
    res.json({ notifications })
  } catch (err) {
    res.status(500).json({ error: err.message })
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
    res.status(500).json({ error: err.message })
  }
}

module.exports = { list, dismissByAthlete }
