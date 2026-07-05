'use strict'
const express = require('express')
const router  = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { getLeaderboardHandler } = require('../controllers/leaderboardController')

router.get('/', verifyToken, getLeaderboardHandler)

module.exports = router
