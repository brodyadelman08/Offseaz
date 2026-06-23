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
const digestRoutes   = require('./routes/digest') // TODO: REMOVE BEFORE LAUNCH

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
app.use('/api/digest', digestRoutes) // TODO: REMOVE BEFORE LAUNCH

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

require('./scheduler')
