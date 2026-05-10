const supabaseAdmin = require('../config/supabase')

async function createProfile(userId, role, fullName) {
  const { data, error } = await supabaseAdmin
    .from('profiles')
    .insert({ id: userId, role, full_name: fullName })
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
