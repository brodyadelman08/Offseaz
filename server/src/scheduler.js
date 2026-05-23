const cron = require('node-cron')
const { runWeeklySummary } = require('./services/summaryService')

// Every Sunday at 8:00 PM server time
cron.schedule('0 20 * * 0', async () => {
  console.log('[Scheduler] Running weekly summary...')
  try {
    await runWeeklySummary()
    console.log('[Scheduler] Done')
  } catch (err) {
    console.error('[Scheduler] Fatal error:', err.message)
  }
})

console.log('[Scheduler] Weekly summary job registered (Sundays 8pm)')

module.exports = {}
