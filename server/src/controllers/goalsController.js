const { getProfile } = require('../services/authService')
const { getAthleteGoals, createGoal, updateGoal, deleteGoal } = require('../services/goalsService')
const { getAthleteProfile } = require('../services/athleteService')

async function getMyGoals(req, res) {
  try {
    const goals = await getAthleteGoals(req.user.id)
    res.json({ goals })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function createGoalHandler(req, res) {
  const { title, target, due_date, source } = req.body
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' })
  try {
    const goal = await createGoal(req.user.id, {
      title: title.trim(),
      target: target?.trim() || null,
      due_date: due_date || null,
      source: source || 'custom',
    })
    res.status(201).json({ goal })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

async function updateGoalHandler(req, res) {
  const { id } = req.params
  try {
    const goal = await updateGoal(id, req.user.id, req.body)
    res.json({ goal })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

async function deleteGoalHandler(req, res) {
  const { id } = req.params
  try {
    await deleteGoal(id, req.user.id)
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
}

async function getAthleteGoalsForCoach(req, res) {
  const { athleteId } = req.params
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') return res.status(403).json({ error: 'Coach only' })
    // Verify the athlete is on this coach's team
    await getAthleteProfile(athleteId, req.user.id)
    const goals = await getAthleteGoals(athleteId)
    res.json({ goals })
  } catch (err) {
    if (err.status === 403) return res.status(403).json({ error: err.message })
    res.status(500).json({ error: err.message })
  }
}

module.exports = { getMyGoals, createGoalHandler, updateGoalHandler, deleteGoalHandler, getAthleteGoalsForCoach }
