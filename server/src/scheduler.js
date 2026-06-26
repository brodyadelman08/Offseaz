'use strict'
const cron = require('node-cron')
const { runWeeklyDigest }   = require('./services/digestService')
const { runNightlyStreakReset } = require('./services/streakService')

// Monday at 08:00 AM server time — covers the previous Mon–Sun window
cron.schedule('0 8 * * 1', async () => {
  console.log('[Scheduler] Firing weekly coach digest...')
  try {
    await runWeeklyDigest()
    console.log('[Scheduler] Digest complete')
  } catch (err) {
    console.error('[Scheduler] Digest fatal error:', err.message)
  }
})

// Every day at midnight UTC — reset streaks for athletes who missed 2+ consecutive days
cron.schedule('0 0 * * *', async () => {
  console.log('[Scheduler] Running nightly streak reset...')
  try {
    await runNightlyStreakReset()
    console.log('[Scheduler] Streak reset complete')
  } catch (err) {
    console.error('[Scheduler] Streak reset fatal error:', err.message)
  }
})

console.log('[Scheduler] Weekly digest (Mon 08:00) and nightly streak reset (00:00 UTC) registered')

module.exports = {}
