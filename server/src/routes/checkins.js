'use strict'
const express = require('express')
const router  = express.Router()
const verifyToken   = require('../middleware/verifyToken')
const { getProfile } = require('../services/authService')
const { getTodayCheckin, submitCheckin, getTeamCheckins } = require('../services/checkinService')
const supabaseAdmin = require('../config/supabase')

// GET /api/checkins/today — athlete gets their own today check-in (or null)
router.get('/today', verifyToken, async (req, res) => {
  try {
    const checkin = await getTodayCheckin(req.user.id)
    res.json({ checkin: checkin || null })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /api/checkins — athlete submits today's check-in
router.post('/', verifyToken, async (req, res) => {
  const { sleep_score, soreness_score, energy_score, is_rest_day } = req.body
  if (!sleep_score || !soreness_score || !energy_score) {
    return res.status(400).json({ error: 'sleep_score, soreness_score, energy_score required (1–5)' })
  }
  for (const v of [sleep_score, soreness_score, energy_score]) {
    if (v < 1 || v > 5) return res.status(400).json({ error: 'Scores must be 1–5' })
  }
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'athlete') return res.status(403).json({ error: 'Athletes only' })
    const checkin = await submitCheckin(req.user.id, { sleep_score, soreness_score, energy_score, is_rest_day })
    res.status(201).json({ checkin })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /api/checkins/team — coach gets today's check-ins for their team
router.get('/team', verifyToken, async (req, res) => {
  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'coach') return res.status(403).json({ error: 'Coaches only' })
    const teamId = req.query.team_id
    let resolvedTeamId = teamId
    if (!resolvedTeamId) {
      const { data: teams } = await supabaseAdmin.from('teams').select('id').eq('coach_id', req.user.id).limit(1)
      resolvedTeamId = teams?.[0]?.id
    }
    if (!resolvedTeamId) return res.json({ checkins: [] })
    const { data: members } = await supabaseAdmin
      .from('team_members').select('athlete_id').eq('team_id', resolvedTeamId).eq('access_level', 'athlete')
    const athleteIds = (members || []).map(m => m.athlete_id)
    const checkins   = await getTeamCheckins(athleteIds)
    res.json({ checkins })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
