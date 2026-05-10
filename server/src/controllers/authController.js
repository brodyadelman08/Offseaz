const { createProfile, getProfile } = require('../services/authService')

async function register(req, res) {
  const { role, full_name } = req.body
  const userId = req.user.id

  if (!role || !['coach', 'athlete'].includes(role)) {
    return res.status(400).json({ error: 'Role must be coach or athlete' })
  }

  try {
    const profile = await createProfile(userId, role, full_name || '')
    res.status(201).json({ profile })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Profile already exists' })
    }
    res.status(500).json({ error: err.message })
  }
}

async function profile(req, res) {
  try {
    const data = await getProfile(req.user.id)
    res.json({ profile: data })
  } catch (err) {
    res.status(404).json({ error: 'Profile not found' })
  }
}

module.exports = { register, profile }
