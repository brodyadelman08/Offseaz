'use strict'
const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const ctrl = require('../controllers/performanceController')

// Public metric catalog
router.get('/definitions', ctrl.getDefinitions)

// Athlete: get own selections + current PRs
router.get('/mine', verifyToken, ctrl.getMine)

// Athlete: add a metric to their profile
router.post('/selections', verifyToken, ctrl.addSelectionHandler)

// Athlete: remove a metric from their profile
router.delete('/selections/:selectionId', verifyToken, ctrl.removeSelectionHandler)

// Athlete: log a new value for a metric
router.post('/log', verifyToken, ctrl.logValueHandler)

// Athlete or Coach: get log history for one selection
router.get('/selections/:selectionId/history', verifyToken, ctrl.getHistoryHandler)

// Coach: read an athlete's selections + current PRs
router.get('/athlete/:athleteId', verifyToken, ctrl.getAthleteSelectionsHandler)

// Coach: read log history for one of an athlete's selections
router.get('/athlete/:athleteId/selections/:selectionId/history', verifyToken, ctrl.getAthleteHistoryHandler)

module.exports = router
