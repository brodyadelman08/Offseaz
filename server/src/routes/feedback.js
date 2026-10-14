'use strict'
const express = require('express')
const router = express.Router()
const verifyToken = require('../middleware/verifyToken')
const { feedbackLimiter } = require('../middleware/rateLimiter')
const { submitFeedback, listFeedback } = require('../controllers/feedbackController')

// Intentionally public — no verifyToken. Anyone, logged in or not, can
// submit the feedback survey. Rate-limited here (not centrally in index.js
// like most limiters) because GET / below shares this same path and must
// NOT be rate-limited the same way — admins loading the responses page
// shouldn't trip a 5-per-hour limit meant for anonymous submissions.
router.post('/', feedbackLimiter, submitFeedback)

// Any authenticated user can reach this middleware; listFeedback itself
// restricts the actual response to the single ADMIN_EMAIL (no admin role
// exists in this app).
router.get('/', verifyToken, listFeedback)

module.exports = router
