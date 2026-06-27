'use strict'
const supabaseAdmin = require('../config/supabase')

function todayUTC() {
  return new Date().toISOString().slice(0, 10)
}

async function getTodayCheckin(athleteId) {
  const { data } = await supabaseAdmin
    .from('daily_checkins').select('*')
    .eq('athlete_id', athleteId).eq('date', todayUTC()).maybeSingle()
  return data
}

async function submitCheckin(athleteId, { sleep_score, soreness_score, energy_score, is_rest_day }) {
  const readiness_score = Math.round(((sleep_score + soreness_score + energy_score) / 3) * 20)
  const { data, error } = await supabaseAdmin
    .from('daily_checkins')
    .upsert(
      { athlete_id: athleteId, date: todayUTC(), sleep_score, soreness_score, energy_score,
        is_rest_day: !!is_rest_day, readiness_score },
      { onConflict: 'athlete_id,date' }
    )
    .select().single()
  if (error) throw error
  return data
}

// Returns today's check-in for every athlete in the given id list
async function getTeamCheckins(athleteIds) {
  if (!athleteIds?.length) return []
  const { data } = await supabaseAdmin
    .from('daily_checkins').select('athlete_id, readiness_score, is_rest_day, sleep_score, soreness_score, energy_score')
    .in('athlete_id', athleteIds).eq('date', todayUTC())
  return data || []
}

module.exports = { getTodayCheckin, submitCheckin, getTeamCheckins }
