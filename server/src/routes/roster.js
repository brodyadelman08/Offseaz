const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { roster, teammateProfle } = require('../controllers/rosterController')

router.get('/', verifyToken, roster)
router.get('/:athleteId', verifyToken, teammateProfle)

module.exports = router
