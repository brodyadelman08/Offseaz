'use strict'
const express = require('express')
const router = express.Router()
const { submitContactForm } = require('../controllers/contactController')

// Intentionally public — no verifyToken. Anyone (including logged-out
// visitors) can submit the contact form. Rate-limited in index.js.
router.post('/', submitContactForm)

module.exports = router
