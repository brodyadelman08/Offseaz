const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const {
  getMyGoals, createGoalHandler, updateGoalHandler,
  deleteGoalHandler, getAthleteGoalsForCoach,
} = require('../controllers/goalsController')

router.get('/',                          verifyToken, getMyGoals)
router.post('/',                         verifyToken, createGoalHandler)
router.patch('/:id',                     verifyToken, updateGoalHandler)
router.delete('/:id',                    verifyToken, deleteGoalHandler)
router.get('/athlete/:athleteId',        verifyToken, getAthleteGoalsForCoach)

module.exports = router
