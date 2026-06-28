-- Performance PR tracking: athlete-selected metrics, log entries, current PRs
-- Run in Supabase SQL Editor

-- Athlete's selected performance metrics
-- metric_id references the hardcoded METRIC_DEFS in performanceService.js
-- sub_type_id is used only for throwing_velocity (picks the specific throw type)
-- UNIQUE NULLS NOT DISTINCT: two NULLs are equal, preventing duplicate non-subtype selections
CREATE TABLE IF NOT EXISTS athlete_metric_selections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  metric_id   TEXT NOT NULL,
  sub_type_id TEXT DEFAULT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_athlete_metric_subtype UNIQUE NULLS NOT DISTINCT (athlete_id, metric_id, sub_type_id)
);

CREATE INDEX IF NOT EXISTS idx_ams_athlete ON athlete_metric_selections(athlete_id);

-- Every logged value for a selected metric
-- value is always stored in base unit: seconds for time, total inches for feet/in, etc.
CREATE TABLE IF NOT EXISTS performance_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  selection_id UUID NOT NULL REFERENCES athlete_metric_selections(id) ON DELETE CASCADE,
  value        NUMERIC(12,3) NOT NULL,
  logged_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pl_selection ON performance_logs(selection_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_pl_athlete   ON performance_logs(athlete_id);

-- Denormalized current-best per selection for O(1) reads
CREATE TABLE IF NOT EXISTS performance_prs (
  selection_id   UUID PRIMARY KEY REFERENCES athlete_metric_selections(id) ON DELETE CASCADE,
  best_value     NUMERIC(12,3) NOT NULL,
  previous_value NUMERIC(12,3),
  log_id         UUID REFERENCES performance_logs(id),
  updated_at     TIMESTAMPTZ DEFAULT now()
);
