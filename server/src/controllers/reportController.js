const { getProfile } = require('../services/authService')
const { generateReport } = require('../services/reportService')
const { getAthleteProfile } = require('../services/athleteService')

async function getReport(req, res) {
  const { athleteId } = req.params
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') return res.status(403).json({ error: 'Coach only' })
    // Verify the athlete is on this coach's team
    await getAthleteProfile(athleteId, req.user.id)
    const report = await generateReport(athleteId, req.user.id)
    res.json({ report })
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: err.message })
    res.status(500).json({ error: err.message })
  }
}

module.exports = { getReport }
