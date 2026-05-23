const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { log, mine, teamLogs, accountability } = require('../controllers/workoutController')

router.post('/', verifyToken, log)
router.get('/mine', verifyToken, mine)
router.get('/team', verifyToken, teamLogs)
router.get('/accountability', verifyToken, accountability)

module.exports = router
