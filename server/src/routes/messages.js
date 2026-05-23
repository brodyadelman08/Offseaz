const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { send, inbox, athletes } = require('../controllers/messageController')

// Static routes before any dynamic ones
router.get('/athletes', verifyToken, athletes)
router.get('/', verifyToken, inbox)
router.post('/', verifyToken, send)

module.exports = router
