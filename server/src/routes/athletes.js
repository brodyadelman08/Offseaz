const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { profile } = require('../controllers/athleteController')

router.get('/:id', verifyToken, profile)

module.exports = router
