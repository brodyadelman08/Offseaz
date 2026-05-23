const { getProfile } = require('../services/authService')
const { logSession, getAthleteLog, getTeamLogs } = require('../services/workoutService')
const { getAccountabilityData } = require('../services/accountabilityService')

async function log(req, res) {
  const { blueprint_week_id, session_index, status, effort, note } = req.body

  if (!blueprint_week_id) return res.status(400).json({ error: 'blueprint_week_id is required' })
  if (session_index == null || session_index < 0) return res.status(400).json({ error: 'session_index is required' })
  if (!['completed', 'partial', 'skipped'].includes(status)) {
    return res.status(400).json({ error: 'status must be completed, partial, or skipped' })
  }
  if (status !== 'skipped' && effort != null && (effort < 1 || effort > 10)) {
    return res.status(400).json({ error: 'effort must be between 1 and 10' })
  }

  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'athlete') {
      return res.status(403).json({ error: 'Only athletes can log sessions' })
    }

    const workout = await logSession(req.user.id, {
      blueprint_week_id,
      session_index: parseInt(session_index, 10),
      status,
      effort: effort ? parseInt(effort, 10) : null,
      note,
    })

    res.status(201).json({ workout })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function mine(req, res) {
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'athlete') {
      return res.status(403).json({ error: 'Only athletes can view their logs' })
    }

    const logs = await getAthleteLog(req.user.id)
    res.json({ logs })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function teamLogs(req, res) {
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can view team logs' })
    }

    const logs = await getTeamLogs(req.user.id)
    res.json({ logs })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function accountability(req, res) {
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') {
      return res.status(403).json({ error: 'Only coaches can view the accountability dashboard' })
    }
    const data = await getAccountabilityData(req.user.id)
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { log, mine, teamLogs, accountability }
