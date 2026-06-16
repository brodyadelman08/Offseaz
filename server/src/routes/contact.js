const express = require('express')
const { Resend } = require('resend')
const router = express.Router()

const TO_EMAIL = 'brody@offseaz.com'
const ROLE_LABELS = { coach: 'Coach', athlete: 'Athlete', other: 'Other' }

router.post('/', async (req, res) => {
  const { name, email, role, message } = req.body || {}

  if (!name?.trim() || !email?.trim() || !role || !message?.trim()) {
    return res.status(400).json({ error: 'All fields are required.' })
  }

  const key = process.env.RESEND_API_KEY
  if (!key) {
    console.error('[Contact] RESEND_API_KEY is not set')
    return res.status(500).json({ error: 'Email service is not configured.' })
  }

  const resend    = new Resend(key)
  const from      = 'Offseaz <brody@offseaz.com>'
  const roleLabel = ROLE_LABELS[role] || role
  const safeMsg   = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')

  const html = `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:10px;overflow:hidden;border:1px solid #e5e5e5;">
        <tr><td style="background:#1a1a1a;padding:24px 28px;">
          <p style="margin:0;font-size:20px;font-weight:700;color:#fff;letter-spacing:-0.5px;">Offseaz</p>
          <p style="margin:6px 0 0;font-size:13px;color:#aaa;">New contact form submission</p>
        </td></tr>
        <tr><td style="padding:28px;">
          <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#888;width:80px;vertical-align:top;">Name</td>
              <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:15px;font-weight:600;color:#111;">${name}</td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#888;vertical-align:top;">Email</td>
              <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:15px;color:#111;">
                <a href="mailto:${email}" style="color:#308EBD;text-decoration:none;">${email}</a>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:13px;color:#888;vertical-align:top;">Role</td>
              <td style="padding:10px 0;border-bottom:1px solid #f0f0f0;font-size:15px;color:#111;">${roleLabel}</td>
            </tr>
            <tr>
              <td style="padding:14px 0 0;font-size:13px;color:#888;vertical-align:top;">Message</td>
              <td style="padding:14px 0 0;font-size:15px;color:#111;line-height:1.7;">${safeMsg}</td>
            </tr>
          </table>
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #f0f0f0;background:#f9f9f9;">
          <p style="margin:0;font-size:12px;color:#aaa;">Sent from the contact form at offseaz.com</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

  try {
    const { error } = await resend.emails.send({
      from,
      to:       TO_EMAIL,
      replyTo:  email,
      subject:  `Contact: ${name} (${roleLabel})`,
      html,
    })

    if (error) {
      console.error('[Contact] Resend error:', JSON.stringify(error))
      return res.status(500).json({ error: error.message || 'Failed to send message. Please try again.' })
    }

    return res.json({ ok: true })
  } catch (err) {
    console.error('[Contact] Unexpected error:', err.message, err.stack)
    return res.status(500).json({ error: 'Failed to send message. Please try again.' })
  }
})

module.exports = router
