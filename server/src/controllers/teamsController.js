const {
  createTeam,
  getTeamByCoach,
  getTeamByInviteCode,
  joinTeam,
  getAthleteTeam,
} = require('../services/teamsService')

async function create(req, res) {
  const { name } = req.body
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Team name is required' })
  }

  try {
    const team = await createTeam(name.trim(), req.user.id)
    res.status(201).json({ team })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function mine(req, res) {
  try {
    const team = await getTeamByCoach(req.user.id)
    res.json({ team })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

async function join(req, res) {
  const { invite_code } = req.body
  if (!invite_code) {
    return res.status(400).json({ error: 'invite_code is required' })
  }

  try {
    const team = await getTeamByInviteCode(invite_code)
    const membership = await joinTeam(team.id, req.user.id)
    res.status(201).json({ team, membership })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Already a member of this team' })
    }
    if (err.code === 'PGRST116') {
      return res.status(404).json({ error: 'Invalid invite code' })
    }
    res.status(500).json({ error: err.message })
  }
}

async function athleteTeam(req, res) {
  try {
    const team = await getAthleteTeam(req.user.id)
    res.json({ team })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { create, mine, join, athleteTeam }
