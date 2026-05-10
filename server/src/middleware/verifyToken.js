const supabaseAdmin = require('../config/supabase')

async function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' })
  }

  const token = authHeader.split(' ')[1]
  const { data, error } = await supabaseAdmin.auth.getUser(token)

  if (error || !data.user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  req.user = data.user
  next()
}

module.exports = verifyToken
