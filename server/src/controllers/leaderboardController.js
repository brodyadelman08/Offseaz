const supabaseAdmin = require('../config/supabase')
const { getProfile } = require('../services/authService')
const { getLeaderboard } = require('../services/leaderboardService')
const { sendError } = require('../utils/errorResponse')

// GET /api/leaderboard?team_id=xxx — athletes and coaches
async function getLeaderboardHandler(req, res) {
  try {
    const profile = await getProfile(req.user.id)
    let teamId = req.query.team_id

    if (!teamId) {
      if (profile.role === 'coach') {
        const { data: teams } = await supabaseAdmin.from('teams').select('id').eq('coach_id', req.user.id).limit(1)
        teamId = teams?.[0]?.id
      } else {
        // Athlete — find their team
        const { data: memberships } = await supabaseAdmin
          .from('team_members').select('team_id').eq('athlete_id', req.user.id).limit(1)
        teamId = memberships?.[0]?.team_id
      }
    }

    if (!teamId) return res.json({ streak: [], completion_rate: [], sessions_total: [] })

    const data = await getLeaderboard(teamId)
    res.json(data)
  } catch (err) {
    sendError(res, err, 'Failed to load leaderboard.')
  }
}

module.exports = { getLeaderboardHandler }
