const supabaseAdmin = require('../config/supabase')

// ageVerifiedAt is optional and null by default — most callers (the
// GET /api/auth/profile self-heal path) are creating a profile row for a
// user whose age was never actually checked, so it must NOT default to
// "now". Only pass a real value when the caller has just run the age gate
// itself (see POST /api/auth/register).
async function createProfile(userId, role, fullName, ageVerifiedAt = null) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .insert({ id: userId, role, full_name: fullName, age_verified_at: ageVerifiedAt })
    .select()
    .single()

  if (error) throw error
  return data
}

async function getProfile(userId) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

module.exports = { createProfile, getProfile }
