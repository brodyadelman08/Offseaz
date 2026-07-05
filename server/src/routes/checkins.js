'use strict'
const express = require('express')
const router  = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { getToday, submit, getTeam } = require('../controllers/checkinController')

router.get('/today', verifyToken, getToday)
router.post('/', verifyToken, submit)
router.get('/team', verifyToken, getTeam)

module.exports = router
