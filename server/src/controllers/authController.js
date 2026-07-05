const supabaseAdmin = require('../config/supabase')
const { createProfile, getProfile } = require('../services/authService')
const { sendError } = require('../utils/errorResponse')
const { rejectIfOversized } = require('../utils/uploadLimits')
const { deleteAthleteAccount, deleteCoachAccount } = require('../services/accountDeletionService')

async function register(req, res) {
  const { userId, role, full_name } = req.body

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }
  if (!role || !['coach', 'athlete'].includes(role)) {
    return res.status(400).json({ error: 'Role must be coach or athlete' })
  }

  // Verify the userId belongs to a real Supabase auth user before touching the DB.
  // getUserById throws synchronously (not just returning an error) for a
  // malformed userId, so this must be inside a try/catch or a bad value
  // crashes the handler with an unhandled rejection instead of a clean 400.
  let authData, authError
  try {
    ;({ data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(userId))
  } catch (err) {
    console.error('[register] getUserById threw:', err.message)
    return res.status(400).json({ error: 'Invalid user ID' })
  }
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
    sendError(res, err, 'Failed to create profile.')
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
        if (createErr.code === '23505') {
          // Profile was already created (e.g. by /register moments earlier) —
          // this is not a failure, just a race with the read above.
          try {
            const existing = await getProfile(req.user.id)
            console.log('[authController] self-heal race resolved, profile already existed | userId:', req.user.id)
            return res.json({ profile: existing })
          } catch (fetchErr) {
            console.error('[authController] failed to fetch existing profile after duplicate-key race:', fetchErr.message, '| userId:', req.user.id)
            return sendError(res, fetchErr, 'Failed to load profile.')
          }
        }
        console.error('[authController] auto-create profile failed:', createErr.message, '| userId:', req.user.id)
        return sendError(res, createErr, 'Failed to load profile.')
      }
    }

    console.error('[authController] getProfile error:', err.message, '| code:', err.code, '| userId:', req.user.id)
    sendError(res, err, 'Failed to load profile.')
  }
}

const ALLOWED_MIME = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
}

async function updateAvatar(req, res) {
  const { dataUrl, mimeType } = req.body

  if (!dataUrl || !mimeType) {
    return res.status(400).json({ error: 'dataUrl and mimeType are required' })
  }
  if (!ALLOWED_MIME[mimeType]) {
    return res.status(400).json({ error: 'Only JPEG, PNG, and WebP images are allowed' })
  }

  try {
    const base64 = dataUrl.split(',')[1]
    if (!base64) return res.status(400).json({ error: 'Invalid dataUrl format' })

    // Reject oversized payloads by declared size BEFORE decoding to binary —
    // avoids allocating a large Buffer for a request we're going to reject anyway.
    if (rejectIfOversized(req, res, base64)) return

    const buffer = Buffer.from(base64, 'base64')

    if (buffer.length > 4 * 1024 * 1024) {
      return res.status(400).json({ error: 'Image must be under 4 MB' })
    }

    // Upload via service-role client — bypasses storage RLS entirely
    const ext = ALLOWED_MIME[mimeType]
    const path = `${req.user.id}/avatar.${ext}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('avatars')
      .upload(path, buffer, { upsert: true, contentType: mimeType })

    if (uploadError) {
      console.error('[updateAvatar] storage upload failed:', uploadError.message)
      throw uploadError
    }

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('avatars')
      .getPublicUrl(path)

    // Append a cache-buster so browsers fetch the new image immediately
    const avatar_url = `${publicUrl}?cb=${Date.now()}`

    const { data, error: dbError } = await supabaseAdmin
      .from('profiles')
      .update({ avatar_url })
      .eq('id', req.user.id)
      .select()
      .single()

    if (dbError) throw dbError
    res.json({ profile: data })
  } catch (err) {
    console.error('[updateAvatar] error:', err.message)
    sendError(res, err, 'Failed to update avatar.')
  }
}

async function updateName(req, res) {
  const { full_name } = req.body
  if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
    return res.status(400).json({ error: 'full_name is required' })
  }
  const trimmed = full_name.trim().slice(0, 100)
  try {
    const { data, error: dbError } = await supabaseAdmin
      .from('profiles')
      .update({ full_name: trimmed })
      .eq('id', req.user.id)
      .select()
      .single()
    if (dbError) throw dbError
    res.json({ profile: data })
  } catch (err) {
    console.error('[updateName] error:', err.message)
    sendError(res, err, 'Failed to update name.')
  }
}

async function updatePrivacy(req, res) {
  const { privacy_team } = req.body
  if (!['public', 'private'].includes(privacy_team)) {
    return res.status(400).json({ error: 'privacy_team must be "public" or "private"' })
  }
  try {
    const { updatePrivacy: svcUpdate } = require('../services/rosterService')
    const data = await svcUpdate(req.user.id, privacy_team)
    res.json({ profile: data })
  } catch (err) {
    console.error('[updatePrivacy] error:', err.message)
    sendError(res, err, 'Failed to update privacy setting.')
  }
}

async function updateDigestPreference(req, res) {
  const { digest_enabled } = req.body
  if (typeof digest_enabled !== 'boolean') {
    return res.status(400).json({ error: 'digest_enabled must be a boolean' })
  }
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({ digest_enabled })
      .eq('id', req.user.id)
      .select()
      .single()
    if (error) throw error
    res.json({ profile: data })
  } catch (err) {
    console.error('[updateDigestPreference] error:', err.message)
    sendError(res, err, 'Failed to update digest preference.')
  }
}

async function deleteAccount(req, res) {
  try {
    const profileData = await getProfile(req.user.id)
    if (profileData.role === 'coach') {
      await deleteCoachAccount(req.user.id)
    } else {
      await deleteAthleteAccount(req.user.id)
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('[deleteAccount] error:', err.message, '| userId:', req.user.id)
    sendError(res, err, 'Failed to delete account.')
  }
}

module.exports = { register, profile, updateAvatar, updateName, updatePrivacy, updateDigestPreference, deleteAccount }
