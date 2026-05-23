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

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

require('./scheduler')
