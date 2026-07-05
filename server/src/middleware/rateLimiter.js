const { rateLimit } = require('express-rate-limit')

// All three limiters below use express-rate-limit's default in-memory store.
// That store is per-process and resets to zero on every server restart/deploy,
// and does NOT share counters across multiple instances. That's fine for a
// single Railway instance, but if this service is ever scaled horizontally
// (more than one Railway instance/replica behind the load balancer), these
// limits become easy to bypass since each instance tracks its own counts
// independently. Before scaling beyond one instance, swap the in-memory store
// for a shared store (e.g. `rate-limit-redis` backed by a Redis instance) so
// all instances share the same counters.

const jsonHandler = message => (req, res) => {
  res.status(429).json({ error: message })
}

// POST /api/auth/register — max 5 attempts per IP per 15 minutes.
// (There is no server-side login endpoint to limit — the client calls
// Supabase Auth directly for sign-in, so login attempts never reach this
// Express server. Only registration is applicable here.)
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler('Too many attempts, please try again in 15 minutes.'),
})

// POST /api/contact — max 3 submissions per IP per hour (~1 every 20 minutes).
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler('You can submit one message every 20 minutes.'),
})

// POST /api/teams/join and POST /api/teams/join-as-coach — max 10 attempts
// per IP per 15 minutes. Guards against brute-forcing the 8-char hex
// athlete invite_code or coach_code.
const inviteCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonHandler('Too many attempts, please try again in 15 minutes.'),
})

module.exports = { registrationLimiter, contactLimiter, inviteCodeLimiter }
