'use strict'
const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const svc = require('../services/performanceService')

// Public metric catalog
router.get('/definitions', (req, res) => {
  res.json({ metrics: svc.METRIC_DEFS, subTypes: svc.THROWING_SUB_TYPES })
})

// Athlete: get own selections + current PRs
router.get('/mine', verifyToken, async (req, res) => {
  try {
    const selections = await svc.getSelections(req.user.id)
    res.json({ selections })
  } catch (err) {
    console.error('[performance] getSelections:', err)
    res.status(500).json({ error: err.message || 'Failed to load performance metrics' })
  }
})

// Athlete: add a metric to their profile
router.post('/selections', verifyToken, async (req, res) => {
  const { metric_id, sub_type_id } = req.body
  if (!metric_id) return res.status(400).json({ error: 'metric_id is required' })
  try {
    const selection = await svc.addSelection(req.user.id, metric_id, sub_type_id || null)
    res.status(201).json({ selection })
  } catch (err) {
    console.error('[performance] addSelection:', err)
    const msg = err?.message || 'Failed to add metric'
    if (msg.includes('already')) return res.status(409).json({ error: msg })
    if (msg.includes('Unknown') || msg.includes('requires') || msg.includes('does not accept')) {
      return res.status(400).json({ error: msg })
    }
    res.status(500).json({ error: msg })
  }
})

// Athlete: remove a metric from their profile
router.delete('/selections/:selectionId', verifyToken, async (req, res) => {
  try {
    await svc.removeSelection(req.user.id, req.params.selectionId)
    res.json({ ok: true })
  } catch (err) {
    console.error('[performance] removeSelection:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Athlete: log a new value for a metric
router.post('/log', verifyToken, async (req, res) => {
  const { selection_id, value } = req.body
  if (!selection_id || value == null) return res.status(400).json({ error: 'selection_id and value are required' })
  try {
    const result = await svc.logValue(req.user.id, selection_id, value)
    res.json({ log: result.log, is_pr: result.is_pr, previous_best: result.previous_best })
  } catch (err) {
    console.error('[performance] logValue:', err.message)
    res.status(err.message.includes('not found') ? 404 : 400).json({ error: err.message })
  }
})

// Athlete or Coach: get log history for one selection
router.get('/selections/:selectionId/history', verifyToken, async (req, res) => {
  try {
    const history = await svc.getHistory(req.user.id, req.params.selectionId)
    res.json({ history })
  } catch (err) {
    console.error('[performance] getHistory:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Coach: read an athlete's selections + current PRs
router.get('/athlete/:athleteId', verifyToken, async (req, res) => {
  try {
    const selections = await svc.getAthleteSelections(req.params.athleteId)
    res.json({ selections })
  } catch (err) {
    console.error('[performance] getAthleteSelections:', err.message)
    res.status(500).json({ error: err.message })
  }
})

// Coach: read log history for one of an athlete's selections
router.get('/athlete/:athleteId/selections/:selectionId/history', verifyToken, async (req, res) => {
  try {
    const history = await svc.getHistory(req.params.athleteId, req.params.selectionId)
    res.json({ history })
  } catch (err) {
    console.error('[performance] getAthleteHistory:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
