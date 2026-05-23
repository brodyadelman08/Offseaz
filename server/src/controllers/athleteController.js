const { getProfile } = require('../services/authService')
const { getAthleteProfile } = require('../services/athleteService')

async function profile(req, res) {
  const { id } = req.params

  try {
    const requestingProfile = await getProfile(req.user.id)
    if (requestingProfile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can view athlete profiles' })
    }

    const athlete = await getAthleteProfile(id, req.user.id)
    res.json({ athlete })
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: err.message })
    if (err.code === 'PGRST116') return res.status(404).json({ error: 'Athlete not found' })
    res.status(500).json({ error: err.message })
  }
}

module.exports = { profile }
