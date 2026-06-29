-- Performance PR tracking: athlete-selected metrics, log entries, current PRs
-- Uses partial unique indexes instead of UNIQUE NULLS NOT DISTINCT for PG14 compatibility

CREATE TABLE IF NOT EXISTS athlete_metric_selections (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  metric_id   TEXT NOT NULL,
  sub_type_id TEXT DEFAULT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ams_athlete ON athlete_metric_selections(athlete_id);

-- Prevent duplicate non-subtype selections (sub_type_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ams_no_sub
  ON athlete_metric_selections(athlete_id, metric_id)
  WHERE sub_type_id IS NULL;

-- Prevent duplicate subtype selections (sub_type_id IS NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ams_with_sub
  ON athlete_metric_selections(athlete_id, metric_id, sub_type_id)
  WHERE sub_type_id IS NOT NULL;

-- Every logged value for a selected metric
-- value is stored in base unit: total seconds for time, total inches for feet/in
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
