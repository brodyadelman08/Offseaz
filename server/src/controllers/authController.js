const supabaseAdmin = require('../config/supabase')
const { createProfile, getProfile } = require('../services/authService')

async function register(req, res) {
  const { userId, role, full_name } = req.body

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }
  if (!role || !['coach', 'athlete'].includes(role)) {
    return res.status(400).json({ error: 'Role must be coach or athlete' })
  }

  // Verify the userId belongs to a real Supabase auth user before touching the DB
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId)
  if (authError || !authData?.user) {
    console.error('[register] getUserById failed:', authError?.message)
    return res.status(400).json({ error: 'Invalid user ID' })
  }

  try {
    const profile = await createProfile(userId, role, full_name || '')
    res.status(201).json({ profile })
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Profile already exists' })
    }
    console.error('[register] createProfile error:', err.message)
    res.status(500).json({ error: err.message })
  }
}

async function profile(req, res) {
  try {
    const data = await getProfile(req.user.id)
    res.json({ profile: data })
  } catch (err) {
    console.error('[authController] getProfile error:', err.message, '| code:', err.code, '| userId:', req.user.id)
    if (err.code === 'PGRST116') return res.status(404).json({ error: 'Profile not found' })
    res.status(500).json({ error: err.message })
  }
}

module.exports = { register, profile }
