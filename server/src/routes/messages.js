const express = require('express')
const router  = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { send, reply, inbox, thread, athletes } = require('../controllers/messageController')

// Static routes before dynamic ones
router.get('/athletes',          verifyToken, athletes)
router.get('/',                  verifyToken, inbox)
router.post('/',                 verifyToken, send)

// Dynamic routes
router.post('/:messageId/reply', verifyToken, reply)
router.get('/:messageId/thread', verifyToken, thread)

module.exports = router
