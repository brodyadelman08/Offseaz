const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { roster, teammateProfile, removeAthleteFromTeam } = require('../controllers/rosterController')

router.get('/', verifyToken, roster)
router.delete('/:athleteId', verifyToken, removeAthleteFromTeam)
router.get('/:athleteId', verifyToken, teammateProfile)

module.exports = router
