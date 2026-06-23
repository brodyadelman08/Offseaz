'use strict'
const cron = require('node-cron')
const { runWeeklyDigest } = require('./services/digestService')

// Monday at 08:00 AM server time — covers the previous Mon–Sun window
cron.schedule('0 8 * * 1', async () => {
  console.log('[Scheduler] Firing weekly coach digest...')
  try {
    await runWeeklyDigest()
    console.log('[Scheduler] Digest complete')
  } catch (err) {
    console.error('[Scheduler] Fatal error:', err.message)
  }
})

console.log('[Scheduler] Weekly digest job registered (Mondays 08:00)')

module.exports = {}
