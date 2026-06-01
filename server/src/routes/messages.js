const express    = require('express')
const router     = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { conversations, thread, send, athletes } = require('../controllers/messageController')

// Static routes first
router.get('/athletes',           verifyToken, athletes)
router.get('/conversations',      verifyToken, conversations)

// Dynamic routes
router.get('/thread/:convId',     verifyToken, thread)
router.post('/thread/:convId',    verifyToken, send)

module.exports = router
