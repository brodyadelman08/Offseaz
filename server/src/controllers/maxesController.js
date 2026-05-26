const { getProfile } = require('../services/authService')
const { logMax, getMaxesByAthlete } = require('../services/maxesService')
const { getAthleteProfile } = require('../services/athleteService')

async function getMyMaxes(req, res) {
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'athlete') {
      return res.status(403).json({ error: 'Only athletes can access their maxes' })
    }
    const maxes = await getMaxesByAthlete(req.user.id)
    res.json({ maxes })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function addMax(req, res) {
  const { lift, weight_lbs, reps, notes } = req.body
  if (!lift || weight_lbs == null) {
    return res.status(400).json({ error: 'lift and weight_lbs are required' })
  }
  if (weight_lbs <= 0 || weight_lbs > 2000) {
    return res.status(400).json({ error: 'weight_lbs must be between 1 and 2000' })
  }
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'athlete') {
      return res.status(403).json({ error: 'Only athletes can log maxes' })
    }
    const max = await logMax(req.user.id, lift, weight_lbs, reps, notes)
    res.status(201).json({ max })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

async function getAthleteMaxes(req, res) {
  const { athleteId } = req.params
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can view athlete maxes' })
    }
    // Verifies the athlete is on this coach's team
    await getAthleteProfile(athleteId, req.user.id)
    const maxes = await getMaxesByAthlete(athleteId)
    res.json({ maxes })
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: err.message })
    res.status(500).json({ error: err.message })
  }
}

module.exports = { getMyMaxes, addMax, getAthleteMaxes }
