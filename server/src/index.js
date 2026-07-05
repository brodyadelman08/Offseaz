require('dotenv').config()
const express = require('express')
const cors = require('cors')

const authRoutes = require('./routes/auth')
const teamsRoutes = require('./routes/teams')
const surveyRoutes = require('./routes/survey')
const blueprintRoutes = require('./routes/blueprints')
const workoutRoutes = require('./routes/workouts')
const messageRoutes = require('./routes/messages')
const athleteRoutes = require('./routes/athletes')
const maxesRoutes = require('./routes/maxes')
const rosterRoutes = require('./routes/roster')
const notificationRoutes = require('./routes/notifications')
const feedRoutes = require('./routes/feed')
const goalsRoutes = require('./routes/goals')
const reportRoutes   = require('./routes/report')
const programRoutes  = require('./routes/programs')
const contactRoutes  = require('./routes/contact')
const checkinsRoutes     = require('./routes/checkins')
const leaderboardRoutes  = require('./routes/leaderboard')
const performanceRoutes  = require('./routes/performance')

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}))
app.use(express.json({ limit: '15mb' })) // avatar base64 uploads compressed client-side; raw files up to 10 MB

app.get('/', (req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api/auth', authRoutes)
app.use('/api/teams', teamsRoutes)
app.use('/api/survey', surveyRoutes)
app.use('/api/blueprints', blueprintRoutes)
app.use('/api/workouts', workoutRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/athletes', athleteRoutes)
app.use('/api/maxes', maxesRoutes)
app.use('/api/roster', rosterRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/feed', feedRoutes)
app.use('/api/goals', goalsRoutes)
app.use('/api/report', reportRoutes)
app.use('/api/programs', programRoutes)
app.use('/api/contact', contactRoutes)
app.use('/api/checkins',     checkinsRoutes)
app.use('/api/leaderboard',  leaderboardRoutes)
app.use('/api/performance',  performanceRoutes)

// Startup probe: attempt to force a PostgREST schema cache reload via pg_notify,
// then verify athlete_lift_selections is visible. Runs after the server is up
// to give PostgREST a moment to finish its own initialization first.
async function probeSchemaCache() {
  const supabaseAdmin = require('./config/supabase')

  // Try to trigger PostgREST schema reload via the pg_notify built-in.
  // This may 404 if PostgREST doesn't expose pg_catalog functions — that's expected.
  const { error: notifyErr } = await supabaseAdmin.rpc('pg_notify', {
    channel: 'pgrst',
    payload: 'reload schema',
  })
  if (notifyErr) {
    console.log('[startup] pg_notify RPC unavailable (normal on Supabase cloud):', notifyErr.message)
  } else {
    console.log('[startup] PostgREST schema reload triggered — waiting 2s for cache refresh')
    await new Promise(r => setTimeout(r, 2000))
  }

  // Short delay to allow PostgREST to finish any in-progress cache reload
  await new Promise(r => setTimeout(r, 1500))

  // Probe the table — logs success or the exact PostgREST error so Railway logs are diagnostic
  const { error: probeErr } = await supabaseAdmin
    .from('athlete_lift_selections')
    .select('id')
    .limit(1)
  if (probeErr) {
    console.error('[startup] athlete_lift_selections NOT visible to PostgREST:', {
      code: probeErr.code, message: probeErr.message, hint: probeErr.hint,
    })
    console.error('[startup] Fix: run `NOTIFY pgrst, \'reload schema\';` in Supabase SQL editor, or ensure GRANT SELECT,INSERT,UPDATE,DELETE ON athlete_lift_selections TO service_role,anon,authenticated;')
  } else {
    console.log('[startup] athlete_lift_selections probe OK — table is visible to PostgREST')
  }
}

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  probeSchemaCache().catch(err => console.error('[startup] probe threw:', err.message))
})

require('./scheduler')
