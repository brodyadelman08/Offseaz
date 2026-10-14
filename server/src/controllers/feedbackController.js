const { createFeedbackResponse, listFeedbackResponses } = require('../services/feedbackService')
const { sendError } = require('../utils/errorResponse')

// Hardcoded, matching the existing pattern used for the single-owner contact
// address elsewhere (contactController.js, digestService.js) — there is no
// admin role in this app (see CLAUDE.md: "Two roles only: coach and
// athlete"), so admin access to responses is gated by this specific email
// rather than a role column.
const ADMIN_EMAIL = 'brody@offseaz.com'

const ROLE_OPTIONS       = ['Athlete', 'Coach', 'Parent', 'Trainer', 'Just interested', 'Other']
const LEVEL_OPTIONS      = ['High school', 'College', 'Club', 'Other']
const OFFSEASON_OPTIONS  = ['On my own', 'With my team', 'A trainer writes it', "I don't really train", 'Other']
const COACH_OPTIONS      = ['Yes', 'No', 'Not sure']
const HEARD_OPTIONS      = ['Instagram', 'Friend or teammate', 'A coach', 'Other']

function otherMissing(value, otherValue) {
  return value === 'Other' && !(otherValue && otherValue.trim())
}

async function submitFeedback(req, res) {
  const {
    role, roleOther, sport, level, levelOther,
    offseason, offseasonOther, hasCoach,
    feedback, heardAbout, heardAboutOther, email,
  } = req.body || {}

  if (!role || !ROLE_OPTIONS.includes(role)) {
    return res.status(400).json({ error: 'Please tell us which best describes you.' })
  }
  if (otherMissing(role, roleOther)) {
    return res.status(400).json({ error: 'Please tell us more in the "Other" box.' })
  }
  if (level && !LEVEL_OPTIONS.includes(level)) {
    return res.status(400).json({ error: 'Invalid level.' })
  }
  if (otherMissing(level, levelOther)) {
    return res.status(400).json({ error: 'Please tell us more in the "Other" box.' })
  }
  if (offseason && !OFFSEASON_OPTIONS.includes(offseason)) {
    return res.status(400).json({ error: 'Invalid offseason training answer.' })
  }
  if (otherMissing(offseason, offseasonOther)) {
    return res.status(400).json({ error: 'Please tell us more in the "Other" box.' })
  }
  if (hasCoach && !COACH_OPTIONS.includes(hasCoach)) {
    return res.status(400).json({ error: 'Invalid answer.' })
  }
  if (heardAbout && !HEARD_OPTIONS.includes(heardAbout)) {
    return res.status(400).json({ error: 'Invalid answer.' })
  }
  if (otherMissing(heardAbout, heardAboutOther)) {
    return res.status(400).json({ error: 'Please tell us more in the "Other" box.' })
  }

  try {
    await createFeedbackResponse({
      role,
      roleOther: role === 'Other' ? String(roleOther || '').trim().slice(0, 300) : '',
      sport: String(sport || '').trim().slice(0, 200),
      level,
      levelOther: level === 'Other' ? String(levelOther || '').trim().slice(0, 300) : '',
      offseason,
      offseasonOther: offseason === 'Other' ? String(offseasonOther || '').trim().slice(0, 300) : '',
      hasCoach,
      feedback: String(feedback || '').trim().slice(0, 5000),
      heardAbout,
      heardAboutOther: heardAbout === 'Other' ? String(heardAboutOther || '').trim().slice(0, 300) : '',
      email: String(email || '').trim().slice(0, 300),
    })
    return res.json({ ok: true })
  } catch (err) {
    console.error('[Feedback] Unexpected error submitting:', err.message, err.stack)
    return sendError(res, err, 'Failed to submit. Please try again.')
  }
}

async function listFeedback(req, res) {
  if (req.user.email !== ADMIN_EMAIL) {
    return res.status(403).json({ error: 'Not authorized.' })
  }

  try {
    const responses = await listFeedbackResponses()
    return res.json({ responses })
  } catch (err) {
    console.error('[Feedback] Unexpected error listing:', err.message, err.stack)
    return sendError(res, err, 'Failed to load responses.')
  }
}

module.exports = { submitFeedback, listFeedback }
