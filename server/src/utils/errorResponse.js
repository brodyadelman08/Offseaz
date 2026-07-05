'use strict'

const isProduction = process.env.NODE_ENV === 'production'

/**
 * Sends a clean, consistent JSON error response for a caught error.
 *
 * - A custom app error with an integer `.status` (e.g.
 *   `Object.assign(new Error('Not on your team'), { status: 403 })`) is
 *   passed straight through with its own message — those are already safe,
 *   human-authored messages, not raw Supabase output.
 * - Supabase's PGRST116 ("no rows found") maps to 404.
 * - Postgres 23505 (unique constraint violation) maps to 409 with a fixed,
 *   generic message.
 * - Anything else falls back to `defaultStatus` (500 by default). In
 *   production only `genericMessage` and the numeric status code are
 *   returned — the real `err.message` / `err.details` (which can leak
 *   column/table names straight from Postgres) never reach the client. In
 *   development the underlying error is included under `detail` to keep
 *   debugging fast.
 */
function sendError(res, err, genericMessage = 'Something went wrong. Please try again.', defaultStatus = 500) {
  if (err?.status && Number.isInteger(err.status)) {
    return res.status(err.status).json({ error: err.message })
  }

  if (err?.code === 'PGRST116') {
    return res.status(404).json({ error: 'Not found' })
  }

  if (err?.code === '23505') {
    return res.status(409).json({ error: 'This record already exists.' })
  }

  if (isProduction) {
    return res.status(defaultStatus).json({ error: genericMessage, code: defaultStatus })
  }

  return res.status(defaultStatus).json({
    error: genericMessage,
    code: defaultStatus,
    detail: err?.message || err?.details || String(err),
  })
}

module.exports = { sendError }
