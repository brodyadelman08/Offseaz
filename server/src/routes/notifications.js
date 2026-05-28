const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { list, dismissByAthlete } = require('../controllers/notificationController')

router.get('/', verifyToken, list)
router.patch('/dismiss-athlete/:athleteId', verifyToken, dismissByAthlete)

module.exports = router
