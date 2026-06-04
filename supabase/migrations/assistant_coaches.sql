-- ─── Assistant Coach Support Migration ───────────────────────────────────────
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Add coach_code column to teams (separate invite code for coaches)
ALTER TABLE teams ADD COLUMN IF NOT EXISTS coach_code TEXT UNIQUE;

-- 2. Add access_level column to team_members
--    'athlete'     → regular athlete (default, preserves existing rows)
--    'view_only'   → assistant coach: can see everything, no writes
--    'admin_coach' → assistant coach: can assign blueprints, message, edit plans
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS access_level TEXT NOT NULL DEFAULT 'athlete'
  CHECK (access_level IN ('athlete', 'view_only', 'admin_coach'));

-- 3. Fast index for coach_code lookups
CREATE INDEX IF NOT EXISTS idx_teams_coach_code ON teams(coach_code);

-- 4. Backfill coach_code for any existing teams that don't have one yet
--    Uses md5(id || random) to generate a unique 8-char hex code per team
WITH codes AS (
  SELECT id,
         left(md5(id::text || random()::text), 8) AS new_code
  FROM   teams
  WHERE  coach_code IS NULL
)
UPDATE teams
SET    coach_code = codes.new_code
FROM   codes
WHERE  teams.id = codes.id;
