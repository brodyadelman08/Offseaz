const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { getReport } = require('../controllers/reportController')

router.get('/:athleteId', verifyToken, getReport)

module.exports = router
