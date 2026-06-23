'use strict'
// TODO: REMOVE BEFORE LAUNCH — test-only route for manually triggering the digest
const express = require('express')
const router = express.Router()
const { runWeeklyDigest } = require('../services/digestService')

// POST /api/digest/send-now
// Requires header: x-digest-secret matching DIGEST_TEST_SECRET env var.
router.post('/send-now', async (req, res) => {
  const secret = process.env.DIGEST_TEST_SECRET
  if (!secret || req.headers['x-digest-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    await runWeeklyDigest({ force: true })
    res.json({ ok: true, message: 'Digest sent successfully' })
  } catch (err) {
    console.error('[DigestRoute] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
