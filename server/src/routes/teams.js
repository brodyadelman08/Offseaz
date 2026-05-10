const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { create, mine, join, athleteTeam } = require('../controllers/teamsController')

router.post('/', verifyToken, create)
router.get('/mine', verifyToken, mine)
router.post('/join', verifyToken, join)
router.get('/my-team', verifyToken, athleteTeam)

module.exports = router
