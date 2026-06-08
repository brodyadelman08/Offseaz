const express = require('express')
const router  = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { complete } = require('../controllers/programController')

router.post('/complete', verifyToken, complete)

module.exports = router
