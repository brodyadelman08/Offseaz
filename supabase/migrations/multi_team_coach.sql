-- Allow coaches to own multiple teams (drop unique constraint on coach_id if it exists)
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_coach_id_key;
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_coach_id_unique;
-- Performance index for multi-team queries
CREATE INDEX IF NOT EXISTS idx_teams_coach_id ON teams(coach_id);
