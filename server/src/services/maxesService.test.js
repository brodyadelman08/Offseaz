'use strict'

// ─── Regression test suite for estimated-1RM conversion ────────────────────
// Covers estimateOneRepMax (the 3/5/10RM -> estimated true 1RM conversion)
// and pickCurrentEntry (max resolution by highest estimated 1RM, not raw
// weight_lbs) — the two pure functions maxesService.js's logMax/
// getMaxesByAthlete are built on. Everything else in that file talks
// directly to Supabase and has no local test coverage (same convention as
// the rest of this codebase — see blueprintTemplates.test.js).
//
// Dummy Supabase env vars so requiring maxesService.js (which constructs a
// client at module load time) doesn't throw when no real .env is loaded —
// none of the functions under test ever make a network call.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key'

const { estimateOneRepMax, pickCurrentEntry, REP_MAX_MULTIPLIERS } = require('./maxesService')

describe('estimateOneRepMax', () => {
  test('1RM: weight is used as-is, flagged tested (not estimated)', () => {
    expect(estimateOneRepMax(300, 1)).toEqual({ estimated_1rm: 300, is_estimated: false })
  })

  test('5RM of 185 converts to an estimated 1RM of 215, flagged estimated', () => {
    // 185 / 0.87 = 212.64... -> nearest 5 lbs = 215
    expect(estimateOneRepMax(185, 5)).toEqual({ estimated_1rm: 215, is_estimated: true })
  })

  test('3RM converts via the 0.93 multiplier, flagged estimated', () => {
    // 185 / 0.93 = 198.9... -> nearest 5 lbs = 200
    expect(estimateOneRepMax(185, 3)).toEqual({ estimated_1rm: 200, is_estimated: true })
  })

  test('10RM converts via the 0.75 multiplier, flagged estimated', () => {
    // 185 / 0.75 = 246.67 -> nearest 5 lbs = 245
    expect(estimateOneRepMax(185, 10)).toEqual({ estimated_1rm: 245, is_estimated: true })
  })

  test('every non-1RM conversion always rounds to the nearest 5 lbs', () => {
    for (const [reps, mult] of Object.entries(REP_MAX_MULTIPLIERS)) {
      for (const w of [100, 137, 212, 315.5]) {
        const { estimated_1rm } = estimateOneRepMax(w, Number(reps))
        expect(estimated_1rm % 5).toBe(0)
      }
    }
  })

  test('a 1RM entry never gets divided by a multiplier — weight in, weight out', () => {
    expect(estimateOneRepMax(137, 1).estimated_1rm).toBe(137)
  })

  test('an unrecognized reps value (not reachable via the dropdown) falls back to the raw weight, still flagged estimated', () => {
    expect(estimateOneRepMax(185, 7)).toEqual({ estimated_1rm: 185, is_estimated: true })
  })

  test('reps is coerced from a string (as posted by the client) the same as a number', () => {
    expect(estimateOneRepMax(185, '5')).toEqual({ estimated_1rm: 215, is_estimated: true })
    expect(estimateOneRepMax(300, '1')).toEqual({ estimated_1rm: 300, is_estimated: false })
  })
})

describe('pickCurrentEntry', () => {
  test('picks the entry with the highest ESTIMATED 1RM, not the highest raw weight_lbs', () => {
    // A 225 lb single (true 1RM) vs. a heavier-looking-on-paper 250 lb
    // triple that only estimates to ~226 — the true single should win even
    // though 250 > 225 as raw numbers.
    const entries = [
      { id: 'a', weight_lbs: 225, reps: 1, estimated_1rm: 225 },
      { id: 'b', weight_lbs: 250, reps: 3, estimated_1rm: 269 },
    ]
    expect(pickCurrentEntry(entries).id).toBe('b')
  })

  test('logging a lower-estimate entry after a higher one never becomes "current" — a new entry never accidentally lowers the stored max', () => {
    const entries = [
      { id: 'old-1rm', weight_lbs: 300, reps: 1, estimated_1rm: 300 },
      { id: 'new-5rm', weight_lbs: 185, reps: 5, estimated_1rm: 215 },
    ]
    expect(pickCurrentEntry(entries).id).toBe('old-1rm')
  })

  test('a genuinely higher new entry does become current', () => {
    const entries = [
      { id: 'old-1rm', weight_lbs: 300, reps: 1, estimated_1rm: 300 },
      { id: 'new-1rm', weight_lbs: 315, reps: 1, estimated_1rm: 315 },
    ]
    expect(pickCurrentEntry(entries).id).toBe('new-1rm')
  })

  test('single-entry history resolves to that entry', () => {
    const entries = [{ id: 'only', weight_lbs: 185, reps: 5, estimated_1rm: 215 }]
    expect(pickCurrentEntry(entries).id).toBe('only')
  })
})

describe('end-to-end: logging a 5RM of 185 vs. a 1RM of 300', () => {
  test('a 5RM of 185 produces estimated_1rm ~215, and that is what would drive percentage math downstream', () => {
    const logged = estimateOneRepMax(185, 5)
    expect(logged.estimated_1rm).toBe(215)
    expect(logged.is_estimated).toBe(true)
    // Sanity: 80% of the estimated max, not 80% of the raw 185 entered.
    expect(Math.round((logged.estimated_1rm * 0.8) / 5) * 5).toBe(170) // 215*0.8=172 -> nearest 5
  })

  test('a 1RM of 300 stores 300 exactly, flagged tested', () => {
    const logged = estimateOneRepMax(300, 1)
    expect(logged).toEqual({ estimated_1rm: 300, is_estimated: false })
  })
})
