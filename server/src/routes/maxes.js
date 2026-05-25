const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { getMyMaxes, addMax, getAthleteMaxes } = require('../controllers/maxesController')

router.get('/', verifyToken, getMyMaxes)
router.post('/', verifyToken, addMax)
router.get('/:athleteId', verifyToken, getAthleteMaxes)

module.exports = router
