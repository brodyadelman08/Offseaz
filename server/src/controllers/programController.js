const supabaseAdmin = require('../config/supabase')
const { getProfile } = require('../services/authService')
const { getAthleteTeam } = require('../services/teamsService')
const { createProgramCompletionNotification } = require('../services/notificationService')

/**
 * POST /api/programs/complete
 * Body: { blueprint_id, action: 'retest_maxes' | 'retake_survey' | 'wait_for_coach' }
 *
 * Stores the completion event and, when action = 'wait_for_coach', notifies
 * the coach that this athlete is ready for a new plan.
 *
 * SQL to run once in Supabase:
 *
 *   CREATE TABLE IF NOT EXISTS program_completions (
 *     id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 *     athlete_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
 *     blueprint_id UUID REFERENCES blueprints(id) ON DELETE SET NULL,
 *     team_id     UUID REFERENCES teams(id) ON DELETE SET NULL,
 *     action      TEXT NOT NULL
 *                   CHECK (action IN ('retest_maxes','retake_survey','wait_for_coach')),
 *     created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
 *   );
 *   CREATE INDEX ON program_completions (athlete_id);
 *   CREATE INDEX ON program_completions (team_id);
 */
async function complete(req, res) {
  const { blueprint_id, action } = req.body
  const VALID_ACTIONS = ['retest_maxes', 'retake_survey', 'wait_for_coach']

  if (!action || !VALID_ACTIONS.includes(action)) {
    return res.status(400).json({ error: `action must be one of: ${VALID_ACTIONS.join(', ')}` })
  }

  try {
    const profile = await getProfile(req.user.id)
    if (profile.role !== 'athlete') {
      return res.status(403).json({ error: 'Only athletes can complete programs' })
    }

    const team = await getAthleteTeam(req.user.id).catch(() => null)

    // Store the completion event
    const { error: insertErr } = await supabaseAdmin
      .from('program_completions')
      .insert({
        athlete_id:  req.user.id,
        blueprint_id: blueprint_id || null,
        team_id:     team?.id || null,
        action,
      })

    if (insertErr) throw insertErr

    // Notify coach when athlete is waiting for a new plan — only after the
    // completion event above is confirmed persisted.
    if (action === 'wait_for_coach' && team?.coach_id) {
      const athleteName = profile.full_name || 'An athlete'
      createProgramCompletionNotification(team.coach_id, req.user.id, athleteName).catch(e =>
        console.error('[programController/complete] notification failed:', e?.message)
      )
    }

    res.json({ ok: true, action })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

module.exports = { complete }
