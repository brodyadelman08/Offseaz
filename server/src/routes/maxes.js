'use strict'
const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { getMyMaxes, addMax, getAthleteMaxes } = require('../controllers/maxesController')
const { getSelectedLifts, addLiftSelection, removeLiftSelection, updateLiftSelections } = require('../services/maxesService')
const { sendError } = require('../utils/errorResponse')

// ── Lift selections (must be before /:athleteId to avoid route conflict) ───────

router.get('/selections', verifyToken, async (req, res) => {
  try {
    const selected_lifts = await getSelectedLifts(req.user.id)
    res.json({ selected_lifts })
  } catch (err) {
    console.error('[maxes] getSelectedLifts:', err.message)
    sendError(res, err, 'Failed to load lift selections.')
  }
})

router.post('/selections/:liftKey', verifyToken, async (req, res) => {
  try {
    await addLiftSelection(req.user.id, req.params.liftKey)
    res.json({ ok: true })
  } catch (err) {
    console.error('[maxes] addLiftSelection:', err.message)
    if (err.message.includes('Invalid')) return res.status(400).json({ error: err.message })
    sendError(res, err, 'Failed to add lift selection.')
  }
})

router.delete('/selections/:liftKey', verifyToken, async (req, res) => {
  try {
    await removeLiftSelection(req.user.id, req.params.liftKey)
    res.json({ ok: true })
  } catch (err) {
    console.error('[maxes] removeLiftSelection:', err.message)
    sendError(res, err, 'Failed to remove lift selection.')
  }
})

router.put('/selections', verifyToken, async (req, res) => {
  const { lifts } = req.body
  if (!Array.isArray(lifts)) return res.status(400).json({ error: 'lifts must be an array' })
  try {
    await updateLiftSelections(req.user.id, lifts)
    res.json({ ok: true, lifts })
  } catch (err) {
    console.error('[maxes] updateLiftSelections:', err.message)
    if (err.message.includes('Invalid')) return res.status(400).json({ error: err.message })
    sendError(res, err, 'Failed to update lift selections.')
  }
})

// ── Core maxes ─────────────────────────────────────────────────────────────────

router.get('/', verifyToken, getMyMaxes)
router.post('/', verifyToken, addMax)
router.get('/:athleteId', verifyToken, getAthleteMaxes)

module.exports = router
