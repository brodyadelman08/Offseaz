-- Athlete-selected lifts for their Strength PRs profile section
-- Replaces the "show all lifts" default with explicit per-athlete selection

CREATE TABLE IF NOT EXISTS athlete_lift_selections (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lift_key   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_athlete_lift UNIQUE (athlete_id, lift_key)
);

CREATE INDEX IF NOT EXISTS idx_als_athlete ON athlete_lift_selections(athlete_id);
