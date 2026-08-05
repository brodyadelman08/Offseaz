// ── Minimum signup age (COPPA safety gate) ──────────────────────────────────
// Single source of truth for the platform's minimum age to create an
// account. Override via the MIN_SIGNUP_AGE environment variable (e.g. to
// raise it to 14) without touching any code — see server/.env.example.
//
// This is the server-side authority for the age gate. The client calls
// POST /api/auth/check-age (and POST /api/auth/register re-checks) so the
// actual pass/fail decision always happens here, never only in the browser.
const MIN_SIGNUP_AGE = parseInt(process.env.MIN_SIGNUP_AGE, 10) || 13

const DOB_FORMAT = /^\d{4}-\d{2}-\d{2}$/

/**
 * Computes whole-years age from a 'YYYY-MM-DD' date-of-birth string as of
 * today (UTC). Returns null if the string isn't a valid, non-future date —
 * callers should treat null as a 400 (bad input), not an age-restriction.
 */
function calculateAge(dobString) {
  if (typeof dobString !== 'string' || !DOB_FORMAT.test(dobString)) return null

  const dob = new Date(`${dobString}T00:00:00Z`)
  if (Number.isNaN(dob.getTime())) return null

  const now = new Date()
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  if (dob.getTime() > today.getTime()) return null // future DOB is invalid input

  let age = today.getUTCFullYear() - dob.getUTCFullYear()
  const monthDiff = today.getUTCMonth() - dob.getUTCMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < dob.getUTCDate())) {
    age -= 1
  }
  return age
}

function ageGateMessage() {
  return `You do not meet the minimum age requirement to use Offseaz. You must be at least ${MIN_SIGNUP_AGE} years old to create an account.`
}

module.exports = { MIN_SIGNUP_AGE, calculateAge, ageGateMessage }
