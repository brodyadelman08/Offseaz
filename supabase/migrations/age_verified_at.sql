-- age_verified_at: server-recorded timestamp of when a user cleared the
-- COPPA minimum-age gate (MIN_SIGNUP_AGE, see server/src/config/ageGate.js).
-- NULL means "not yet confirmed" — either a new signup that hasn't reached
-- /api/auth/register yet, or an existing account created before this gate
-- existed that hasn't logged in since (see
-- client/src/components/AgeConfirmGate.jsx, which blocks until confirmed).
--
-- Intentionally NOT a date_of_birth column: only proof that the age check
-- passed, and when, is retained here — never the underlying birthdate.
-- This mirrors what's already written to Supabase Auth user_metadata by
-- POST /api/auth/register and PATCH /api/auth/confirm-age (see
-- server/src/controllers/authController.js) and is being promoted to a
-- real profiles column purely so it's queryable in bulk (e.g. "how many
-- users still need to confirm") without paging through
-- supabaseAdmin.auth.admin.listUsers(). user_metadata remains the field
-- verifyToken actually reads request-to-request; this column is kept in
-- sync alongside it, not instead of it.
-- Run this in the Supabase SQL editor or via supabase db push.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age_verified_at TIMESTAMPTZ;

-- Speeds up "who still needs to confirm" (age_verified_at IS NULL) without
-- indexing the (larger, always-populated once backfilled) confirmed rows.
CREATE INDEX IF NOT EXISTS idx_profiles_age_verified_at_pending
  ON profiles(id) WHERE age_verified_at IS NULL;
