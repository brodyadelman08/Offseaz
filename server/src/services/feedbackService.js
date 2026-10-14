const supabaseAdmin = require('../config/supabase')

async function createFeedbackResponse(data) {
  const { data: row, error } = await supabaseAdmin
    .from('feedback_responses')
    .insert({
      role: data.role,
      role_other: data.roleOther || null,
      sport: data.sport || null,
      level: data.level || null,
      level_other: data.levelOther || null,
      offseason: data.offseason || null,
      offseason_other: data.offseasonOther || null,
      has_coach: data.hasCoach || null,
      feedback: data.feedback || null,
      heard_about: data.heardAbout || null,
      heard_about_other: data.heardAboutOther || null,
      email: data.email || null,
    })
    .select()
    .single()

  if (error) throw error
  return row
}

async function listFeedbackResponses() {
  const { data, error } = await supabaseAdmin
    .from('feedback_responses')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

module.exports = { createFeedbackResponse, listFeedbackResponses }
