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
    if (err.code === 'PGRST116') {
      // Profile row is missing — attempt to auto-create it from the
      // user_metadata stored in Supabase auth at sign-up time.
      const meta = req.user.user_metadata || {}
      const role = meta.role
      const full_name = meta.full_name || ''

      if (!role || !['coach', 'athlete'].includes(role)) {
        console.error('[authController] profile missing and no valid role in user_metadata | userId:', req.user.id)
        return res.status(404).json({ error: 'Profile not found' })
      }

      try {
        const created = await createProfile(req.user.id, role, full_name)
        console.log('[authController] auto-created missing profile | userId:', req.user.id, '| role:', role)
        return res.json({ profile: created })
      } catch (createErr) {
        console.error('[authController] auto-create profile failed:', createErr.message, '| userId:', req.user.id)
        return res.status(500).json({ error: createErr.message })
      }
    }

    console.error('[authController] getProfile error:', err.message, '| code:', err.code, '| userId:', req.user.id)
    res.status(500).json({ error: err.message })
  }
}

module.exports = { register, profile }
