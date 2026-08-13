'use strict'

// ─── Regression test for the "Other requires a description" validation ─────
// otherInjuryDescriptionMissing is the server-side half of Survey.jsx's
// canAdvance() step-8 check — this covers the case a client-side check alone
// can't guarantee (a caller bypassing the UI, e.g. hitting the API directly).
//
// Dummy Supabase env vars so requiring surveyController.js (which pulls in
// several services that construct a client at module load time) doesn't
// throw when no real .env is loaded.
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key'

const { otherInjuryDescriptionMissing } = require('./surveyController')

describe('otherInjuryDescriptionMissing', () => {
  test('true when Other is selected with no description at all', () => {
    expect(otherInjuryDescriptionMissing(['Other'], undefined)).toBe(true)
    expect(otherInjuryDescriptionMissing(['Other'], null)).toBe(true)
    expect(otherInjuryDescriptionMissing(['Other'], '')).toBe(true)
  })

  test('true when Other is selected with a whitespace-only description', () => {
    expect(otherInjuryDescriptionMissing(['Other'], '   ')).toBe(true)
  })

  test('false when Other is selected with a real description', () => {
    expect(otherInjuryDescriptionMissing(['Other'], 'Tweaked my hip flexor in a game')).toBe(false)
  })

  test('false when Other is not selected at all, regardless of the description field', () => {
    expect(otherInjuryDescriptionMissing(['Shoulder', 'Knee'], '')).toBe(false)
    expect(otherInjuryDescriptionMissing([], '')).toBe(false)
    expect(otherInjuryDescriptionMissing(['None'], undefined)).toBe(false)
  })

  test('false when Other is selected alongside other real areas, as long as a description is present', () => {
    expect(otherInjuryDescriptionMissing(['Shoulder', 'Other'], 'Also my elbow clicks')).toBe(false)
  })

  test('handles a missing/undefined injury_areas array safely', () => {
    expect(otherInjuryDescriptionMissing(undefined, 'anything')).toBe(false)
    expect(otherInjuryDescriptionMissing(null, 'anything')).toBe(false)
  })
})
