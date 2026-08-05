const supabaseAdmin = require('../config/supabase')
const { createProfile, getProfile } = require('../services/authService')
const { sendError } = require('../utils/errorResponse')
const { rejectIfOversized } = require('../utils/uploadLimits')
const { validateMagicBytes, getImageDimensions } = require('../utils/imageValidation')
const { deleteAthleteAccount, deleteCoachAccount } = require('../services/accountDeletionService')
const { MIN_SIGNUP_AGE, calculateAge, ageGateMessage } = require('../config/ageGate')

// ── Where age-gate state lives ──────────────────────────────────────────────
// age_verified_at is written to TWO places on every successful check:
// Supabase auth `user_metadata` (the original design — see
// supabase/migrations/age_verified_at.sql for why this existed first) AND
// the `profiles.age_verified_at` column (added by that same migration, once
// it became clear "how many users still need to confirm" needed to be a
// plain SQL query, not a page-through of supabaseAdmin.auth.admin.listUsers()).
// Both are written from the server only, with the service role key, never
// from the client — same as `role`/`full_name`.
// `req.user.user_metadata` is populated fresh on every request by
// verifyToken's supabaseAdmin.auth.getUser(token) call, so it's never stale
// within a request; `profileRow.age_verified_at` comes from whatever was
// just read from `profiles`. withAgeVerified() prefers whichever of the two
// is actually set, so a partial failure in either write (metadata succeeds,
// DB update fails, or vice versa) can't wrongly re-trigger the one-time
// confirm-age prompt for someone who already cleared it.
function withAgeVerified(user, profileRow) {
  return { ...profileRow, age_verified_at: profileRow?.age_verified_at || user.user_metadata?.age_verified_at || null }
}

// COPPA safety gate — the client is expected to call this BEFORE calling
// supabase.auth.signUp(), so an underage signup never creates a Supabase
// auth user in the first place. date_of_birth is used only to compute an
// age in memory for this one response; it is never logged, stored, or
// passed along anywhere else.
async function checkAge(req, res) {
  const { date_of_birth } = req.body
  if (!date_of_birth) {
    return res.status(400).json({ error: 'date_of_birth is required' })
  }

  const age = calculateAge(date_of_birth)
  if (age === null) {
    return res.status(400).json({ error: 'Enter a valid date of birth.' })
  }

  if (age < MIN_SIGNUP_AGE) {
    return res.status(403).json({
      eligible: false,
      error: 'age_restricted',
      minAge: MIN_SIGNUP_AGE,
      message: ageGateMessage(),
    })
  }

  res.json({ eligible: true })
}

async function register(req, res) {
  const { userId, role, full_name, date_of_birth } = req.body

  if (!userId) {
    return res.status(400).json({ error: 'userId is required' })
  }
  if (!role || !['coach', 'athlete'].includes(role)) {
    return res.status(400).json({ error: 'Role must be coach or athlete' })
  }
  if (!date_of_birth) {
    return res.status(400).json({ error: 'date_of_birth is required' })
  }

  // Defense in depth: the client should already have called /check-age
  // before ever calling supabase.auth.signUp(), so this branch should only
  // be reachable if that pre-check was bypassed (e.g. a hand-crafted API
  // call). By this point signUp() has already created the Supabase auth
  // user client-side — delete it immediately so no account survives an
  // underage signup attempt, and never create the profile row.
  const age = calculateAge(date_of_birth)
  if (age === null) {
    return res.status(400).json({ error: 'Enter a valid date of birth.' })
  }
  if (age < MIN_SIGNUP_AGE) {
    try {
      await supabaseAdmin.auth.admin.deleteUser(userId)
    } catch (cleanupErr) {
      console.error('[register] failed to delete underage auth user:', cleanupErr.message)
    }
    console.log('[register] blocked underage signup attempt (age below minimum)')
    return res.status(403).json({
      error: 'age_restricted',
      minAge: MIN_SIGNUP_AGE,
      message: ageGateMessage(),
    })
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

  // Age was already verified above (this request wouldn't have reached here
  // otherwise) — record that on the auth user now, merged with whatever
  // signUp() already set (full_name/role), so this account is never asked
  // the existing-user age-confirmation prompt (see confirmAge below).
  const ageVerifiedAt = new Date().toISOString()
  try {
    await supabaseAdmin.auth.admin.updateUserById(userId, {
      user_metadata: { ...authData.user.user_metadata, age_verified_at: ageVerifiedAt },
    })
  } catch (metaErr) {
    // Not fatal — the age gate itself already ran and passed. Worst case,
    // this brand-new user sees the harmless one-time confirm-age prompt
    // once on their next login instead of never.
    console.error('[register] failed to record age_verified_at on user_metadata:', metaErr.message)
  }

  try {
    // Passed straight into the insert now that profiles.age_verified_at
    // exists (supabase/migrations/age_verified_at.sql) — see authService.js.
    const profile = await createProfile(userId, role, full_name || '', ageVerifiedAt)
    res.status(201).json({ profile })
  } catch (err) {
    if (err.code === '23505') {
      // The profile row already exists — the GET /api/auth/profile self-heal
      // path won a race against this insert (see comment on that route).
      // user_metadata.age_verified_at was already set above regardless of
      // this race, but the self-heal path's own createProfile call doesn't
      // know that value, so its inserted row's column is still null — patch
      // it here so both stores end up in sync despite the race.
      try {
        const { data: patched, error: patchErr } = await supabaseAdmin
          .from('profiles')
          .update({ age_verified_at: ageVerifiedAt })
          .eq('id', userId)
          .is('age_verified_at', null)
          .select()
          .maybeSingle()
        if (patchErr) throw patchErr
        // maybeSingle() returns null if the row's age_verified_at was
        // already non-null (the .is() filter matched nothing) — re-fetch
        // in that case rather than treat it as a failure.
        const existing = patched || await getProfile(userId)
        return res.status(409).json({ error: 'Profile already exists', profile: existing })
      } catch (fetchErr) {
        console.error('[register] failed to sync existing profile after duplicate-key race:', fetchErr.message)
        return res.status(409).json({ error: 'Profile already exists', age_verified_at: ageVerifiedAt })
      }
    }
    console.error('[register] createProfile error:', err.message)
    sendError(res, err, 'Failed to create profile.')
  }
}

async function profile(req, res) {
  try {
    const data = await getProfile(req.user.id)
    res.json({ profile: withAgeVerified(req.user, data) })
  } catch (err) {
    if (err.code === 'PGRST116') {
      // Profile row is missing — attempt to auto-create it from the
      // user_metadata stored in Supabase auth at sign-up time.
      const meta = req.user.user_metadata || {}
      const role = meta.role
      const full_name = meta.full_name || ''
      // Usually null here (this branch exists precisely because /register
      // hasn't run yet), but if metadata already has it for any edge-case
      // reason, don't create a row that then falsely re-triggers the
      // confirm-age prompt.
      const ageVerifiedAt = meta.age_verified_at || null

      if (!role || !['coach', 'athlete'].includes(role)) {
        console.error('[authController] profile missing and no valid role in user_metadata | userId:', req.user.id)
        return res.status(404).json({ error: 'Profile not found' })
      }

      try {
        const created = await createProfile(req.user.id, role, full_name, ageVerifiedAt)
        console.log('[authController] auto-created missing profile | userId:', req.user.id, '| role:', role)
        return res.json({ profile: withAgeVerified(req.user, created) })
      } catch (createErr) {
        if (createErr.code === '23505') {
          // Profile was already created (e.g. by /register moments earlier) —
          // this is not a failure, just a race with the read above.
          try {
            const existing = await getProfile(req.user.id)
            console.log('[authController] self-heal race resolved, profile already existed | userId:', req.user.id)
            return res.json({ profile: withAgeVerified(req.user, existing) })
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

// ── Existing-user, one-time age confirmation ────────────────────────────────
// Triggered client-side by ProtectedRoute whenever a logged-in user's
// profile has no age_verified_at yet (accounts created before this gate
// existed, or edge cases like the self-heal path above, which never sets
// it). Same MIN_SIGNUP_AGE / calculateAge / ageGateMessage as the new-signup
// gate — this is not a second, parallel age system.
async function confirmAge(req, res) {
  const { date_of_birth } = req.body
  if (!date_of_birth) {
    return res.status(400).json({ error: 'date_of_birth is required' })
  }

  const age = calculateAge(date_of_birth)
  if (age === null) {
    return res.status(400).json({ error: 'Enter a valid date of birth.' })
  }

  if (age < MIN_SIGNUP_AGE) {
    // Same hard-block rule as new signup: no exception, no parental-consent
    // path. Unlike a fresh signup attempt, this account has real data
    // (profile row, possibly team memberships, logs, etc.), so it's removed
    // via the same full cascade DELETE /api/auth/account uses — not a bare
    // deleteUser() call — so nothing is left orphaned in other tables.
    try {
      const profileData = await getProfile(req.user.id)
      if (profileData.role === 'coach') {
        await deleteCoachAccount(req.user.id)
      } else {
        await deleteAthleteAccount(req.user.id)
      }
    } catch (cleanupErr) {
      console.error('[confirmAge] failed to remove underage account:', cleanupErr.message, '| userId:', req.user.id)
    }
    console.log('[confirmAge] blocked underage existing-user account (age below minimum)')
    return res.status(403).json({
      error: 'age_restricted',
      minAge: MIN_SIGNUP_AGE,
      message: ageGateMessage(),
    })
  }

  try {
    const ageVerifiedAt = new Date().toISOString()

    // Written to both stores — user_metadata (what verifyToken reads
    // request-to-request) and the profiles column (supabase/migrations/
    // age_verified_at.sql, so this stays queryable in bulk). If the
    // metadata write succeeds but the DB update below fails, or vice versa,
    // withAgeVerified()'s read-time merge (see top of file) still resolves
    // correctly on the next fetch either way.
    const { error: metaErr } = await supabaseAdmin.auth.admin.updateUserById(req.user.id, {
      user_metadata: { ...req.user.user_metadata, age_verified_at: ageVerifiedAt },
    })
    if (metaErr) throw metaErr

    const { data: profileData, error: dbErr } = await supabaseAdmin
      .from('profiles')
      .update({ age_verified_at: ageVerifiedAt })
      .eq('id', req.user.id)
      .select()
      .single()
    if (dbErr) throw dbErr

    res.json({ profile: profileData })
  } catch (err) {
    console.error('[confirmAge] error:', err.message, '| userId:', req.user.id)
    sendError(res, err, 'Failed to confirm age.')
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

    // Magic-byte check — the decoded buffer must actually start with the
    // header bytes for the declared MIME type, not just match by extension.
    if (!validateMagicBytes(buffer, mimeType)) {
      return res.status(400).json({ error: 'Invalid image file' })
    }

    // Minimum dimension check (JPEG/PNG only — WEBP dimensions require full
    // chunk parsing we don't implement). Skips the check if dimensions can't
    // be read rather than rejecting a structurally unusual but valid image.
    const dims = getImageDimensions(buffer, mimeType)
    if (dims && (dims.width < 100 || dims.height < 100)) {
      return res.status(400).json({ error: 'Image too small, minimum 100x100 pixels' })
    }

    // A valid cropped avatar should never compress down this small — catches
    // corrupt or empty payloads that still passed the checks above.
    if (buffer.length < 1000) {
      return res.status(400).json({ error: 'Image appears to be corrupt or empty' })
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

module.exports = { checkAge, register, profile, confirmAge, updateAvatar, updateName, updatePrivacy, updateDigestPreference, deleteAccount }
