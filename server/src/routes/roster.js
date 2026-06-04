const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { roster, teammateProfle, removeAthleteFromTeam } = require('../controllers/rosterController')

router.get('/', verifyToken, roster)
router.delete('/:athleteId', verifyToken, removeAthleteFromTeam)
router.get('/:athleteId', verifyToken, teammateProfle)

module.exports = router
