'use strict'
// TODO: REMOVE BEFORE LAUNCH — test-only route for manually triggering the digest
const express = require('express')
const router = express.Router()
const supabaseAdmin = require('../config/supabase')
const { runWeeklyDigest } = require('../services/digestService')

// POST /api/digest/send-now
// Requires header: x-digest-secret matching DIGEST_TEST_SECRET env var.
// Always clears this week's weekly_digests records first so dedup never blocks a test send.
router.post('/send-now', async (req, res) => {
  const secret = process.env.DIGEST_TEST_SECRET
  if (!secret || req.headers['x-digest-secret'] !== secret) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Clear this week's digest records so the send is never blocked by dedup
    const now    = new Date()
    const dow    = now.getUTCDay()
    const thisMon = new Date(now)
    thisMon.setUTCHours(0, 0, 0, 0)
    thisMon.setUTCDate(now.getUTCDate() - (dow === 0 ? 6 : dow - 1))
    const weekStart = thisMon.toISOString().split('T')[0]

    const { error: delErr, count } = await supabaseAdmin
      .from('weekly_digests')
      .delete()
      .gte('week_start_date', weekStart)
      .select('id', { count: 'exact', head: true })

    if (delErr) {
      console.warn('[DigestRoute] Could not clear weekly_digests (table may not exist yet):', delErr.message)
    } else {
      console.log(`[DigestRoute] Cleared weekly_digests for week ${weekStart} (${count ?? '?'} rows removed)`)
    }

    await runWeeklyDigest({ force: true })
    res.json({ ok: true, message: 'Digest sent successfully', weekStart })
  } catch (err) {
    console.error('[DigestRoute] Error:', err.message)
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
