'use strict'

// ─── Regression test for buildMaxesMap's max resolution ────────────────────
// Confirms the coach roster / athlete roster views (getCoachRoster,
// getAthleteRoster — both built on buildMaxesMap) resolve "current max" the
// same way maxesService.js's getMaxesByAthlete does: highest ESTIMATED 1RM,
// not highest raw weight_lbs. Before this fix, buildMaxesMap had its own
// independent copy of the old raw-weight comparison, so a coach's roster
// view could disagree with an athlete's own profile about which logged
// entry was "current" for the exact same athlete/lift.
//
// Dummy Supabase env vars so requiring rosterService.js (which requires
// maxesService.js, which constructs a client at module load time) doesn't
// throw when no real .env is loaded — buildMaxesMap never makes a network
// call itself.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key'

const { buildMaxesMap } = require('./rosterService')

describe('buildMaxesMap', () => {
  test('picks the entry with the highest ESTIMATED 1RM, not the highest raw weight_lbs', () => {
    const rows = [
      { athlete_id: 'a1', lift: 'squat', weight_lbs: 185, reps: 5, estimated_1rm: 215 },
      { athlete_id: 'a1', lift: 'squat', weight_lbs: 300, reps: 1, estimated_1rm: 300 },
    ]
    const map = buildMaxesMap(rows)
    // Output shape unchanged — still just {weight_lbs, reps}, the raw PR
    // display never changes, only which entry wins that slot.
    expect(map.a1.squat).toEqual({ weight_lbs: 300, reps: 1 })
  })

  test('a lower-estimate entry logged after a higher one never displaces it, regardless of insertion order', () => {
    const rows = [
      { athlete_id: 'a1', lift: 'bench_press', weight_lbs: 300, reps: 1, estimated_1rm: 300 },
      { athlete_id: 'a1', lift: 'bench_press', weight_lbs: 185, reps: 5, estimated_1rm: 215 },
    ]
    expect(buildMaxesMap(rows).a1.bench_press).toEqual({ weight_lbs: 300, reps: 1 })
  })

  test('handles multiple athletes and multiple lifts independently', () => {
    const rows = [
      { athlete_id: 'a1', lift: 'squat', weight_lbs: 185, reps: 5, estimated_1rm: 215 },
      { athlete_id: 'a1', lift: 'bench_press', weight_lbs: 225, reps: 1, estimated_1rm: 225 },
      { athlete_id: 'a2', lift: 'squat', weight_lbs: 405, reps: 1, estimated_1rm: 405 },
    ]
    const map = buildMaxesMap(rows)
    expect(map.a1.squat).toEqual({ weight_lbs: 185, reps: 5 })
    expect(map.a1.bench_press).toEqual({ weight_lbs: 225, reps: 1 })
    expect(map.a2.squat).toEqual({ weight_lbs: 405, reps: 1 })
  })

  test('empty/undefined rows produce an empty map, not a crash', () => {
    expect(buildMaxesMap([])).toEqual({})
    expect(buildMaxesMap(undefined)).toEqual({})
  })
})

describe('coach roster and athlete profile agree on "current" for the same athlete', () => {
  test('same raw rows resolved through buildMaxesMap (roster) and pickCurrentEntry (profile) pick the identical winning entry', () => {
    const { pickCurrentEntry } = require('./maxesService')

    // A 5RM of 185 logged, then a true 1RM of 300 logged later.
    const rows = [
      { id: 'e1', athlete_id: 'a1', lift: 'squat', weight_lbs: 185, reps: 5, estimated_1rm: 215, is_estimated: true },
      { id: 'e2', athlete_id: 'a1', lift: 'squat', weight_lbs: 300, reps: 1, estimated_1rm: 300, is_estimated: false },
    ]

    // Roster path (coach view)
    const rosterCurrent = buildMaxesMap(rows).a1.squat

    // Profile path (athlete's own view / getMaxesByAthlete's resolution)
    const profileCurrent = pickCurrentEntry(rows)

    expect(rosterCurrent.weight_lbs).toBe(profileCurrent.weight_lbs)
    expect(rosterCurrent.reps).toBe(profileCurrent.reps)
    expect(rosterCurrent.weight_lbs).toBe(300) // both agree: the true 1RM wins
  })
})
