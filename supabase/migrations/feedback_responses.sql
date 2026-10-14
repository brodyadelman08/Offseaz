-- Public feedback survey (/feedback) — anonymous, no auth required to submit.
-- Unrelated to the authenticated athlete needs-analysis survey (survey_responses).
CREATE TABLE IF NOT EXISTS feedback_responses (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role               TEXT NOT NULL,
  role_other         TEXT,
  sport              TEXT,
  level              TEXT,
  level_other        TEXT,
  offseason          TEXT,
  offseason_other    TEXT,
  has_coach          TEXT,
  feedback           TEXT,
  heard_about        TEXT,
  heard_about_other  TEXT,
  email              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_responses_created_at ON feedback_responses(created_at DESC);
