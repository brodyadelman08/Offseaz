'use strict'

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024 // 10 MB

/**
 * Rejects a base64 data-URL upload before any Buffer allocation if its
 * declared decoded size would exceed MAX_UPLOAD_BYTES. Checks the raw
 * Content-Length header first (cheapest — no string work at all), then the
 * base64 string's own length (base64 inflates size by ~4/3, so decoded
 * bytes ≈ base64Length * 3/4).
 *
 * Returns true if the request was rejected (a 413 response has already been
 * sent) — callers must `return` immediately when this returns true, before
 * calling Buffer.from() on the payload.
 */
function rejectIfOversized(req, res, base64) {
  const contentLength = Number(req.headers['content-length'])
  if (contentLength && contentLength > MAX_UPLOAD_BYTES) {
    res.status(413).json({ error: 'Upload is too large. Maximum size is 10 MB.' })
    return true
  }

  if (base64) {
    const estimatedBytes = Math.floor((base64.length * 3) / 4)
    if (estimatedBytes > MAX_UPLOAD_BYTES) {
      res.status(413).json({ error: 'Upload is too large. Maximum size is 10 MB.' })
      return true
    }
  }

  return false
}

module.exports = { rejectIfOversized, MAX_UPLOAD_BYTES }
