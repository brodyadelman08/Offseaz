const svc = require('../services/performanceService')
const { getProfile } = require('../services/authService')
const { getAthleteProfile } = require('../services/athleteService')
const { sendError } = require('../utils/errorResponse')

// Public metric catalog — intentionally unauthenticated
function getDefinitions(req, res) {
  res.json({ metrics: svc.METRIC_DEFS, subTypes: svc.THROWING_SUB_TYPES })
}

// Athlete: get own selections + current PRs
async function getMine(req, res) {
  try {
    const selections = await svc.getSelections(req.user.id)
    res.json({ selections })
  } catch (err) {
    sendError(res, err, 'Failed to load performance metrics.')
  }
}

// Athlete: add a metric to their profile
async function addSelectionHandler(req, res) {
  const { metric_id, sub_type_id } = req.body
  if (!metric_id) return res.status(400).json({ error: 'metric_id is required' })
  try {
    const selection = await svc.addSelection(req.user.id, metric_id, sub_type_id || null)
    res.status(201).json({ selection })
  } catch (err) {
    const msg = err?.message || 'Failed to add metric'
    if (msg.includes('already')) return res.status(409).json({ error: msg })
    if (msg.includes('Unknown') || msg.includes('requires') || msg.includes('does not accept')) {
      return res.status(400).json({ error: msg })
    }
    sendError(res, err, 'Failed to add metric.')
  }
}

// Athlete: remove a metric from their profile
async function removeSelectionHandler(req, res) {
  try {
    await svc.removeSelection(req.user.id, req.params.selectionId)
    res.json({ ok: true })
  } catch (err) {
    sendError(res, err, 'Failed to remove metric.')
  }
}

// Athlete: log a new value for a metric
async function logValueHandler(req, res) {
  const { selection_id, value } = req.body
  if (!selection_id || value == null) return res.status(400).json({ error: 'selection_id and value are required' })
  try {
    const result = await svc.logValue(req.user.id, selection_id, value)
    res.json({ log: result.log, is_pr: result.is_pr, previous_best: result.previous_best })
  } catch (err) {
    if (err.message?.includes('not found')) return res.status(404).json({ error: err.message })
    if (err.message === 'Value must be a positive number' || err.message === 'Cannot determine metric definition') {
      return res.status(400).json({ error: err.message })
    }
    sendError(res, err, 'Failed to log value.')
  }
}

// Athlete or Coach: get log history for one selection
async function getHistoryHandler(req, res) {
  try {
    const history = await svc.getHistory(req.user.id, req.params.selectionId)
    res.json({ history })
  } catch (err) {
    sendError(res, err, 'Failed to load history.')
  }
}

// Coach: read an athlete's selections + current PRs
async function getAthleteSelectionsHandler(req, res) {
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') return res.status(403).json({ error: 'Coach only' })
    // Verify the athlete is on this coach's team
    await getAthleteProfile(req.params.athleteId, req.user.id)
    const selections = await svc.getAthleteSelections(req.params.athleteId)
    res.json({ selections })
  } catch (err) {
    sendError(res, err, 'Failed to load athlete metrics.')
  }
}

// Coach: read log history for one of an athlete's selections
async function getAthleteHistoryHandler(req, res) {
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') return res.status(403).json({ error: 'Coach only' })
    // Verify the athlete is on this coach's team
    await getAthleteProfile(req.params.athleteId, req.user.id)
    const history = await svc.getHistory(req.params.athleteId, req.params.selectionId)
    res.json({ history })
  } catch (err) {
    sendError(res, err, 'Failed to load athlete history.')
  }
}

module.exports = {
  getDefinitions,
  getMine,
  addSelectionHandler,
  removeSelectionHandler,
  logValueHandler,
  getHistoryHandler,
  getAthleteSelectionsHandler,
  getAthleteHistoryHandler,
}
