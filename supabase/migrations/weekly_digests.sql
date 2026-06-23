-- weekly_digests: tracks every coach digest email sent
-- Run this in the Supabase SQL editor or via supabase db push.

CREATE TABLE IF NOT EXISTS weekly_digests (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id         UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  coach_id        UUID        NOT NULL,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  week_start_date DATE        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'sent'
                              CHECK (status IN ('sent', 'failed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_digests_team_id    ON weekly_digests(team_id);
CREATE INDEX IF NOT EXISTS idx_weekly_digests_coach_id   ON weekly_digests(coach_id);
CREATE INDEX IF NOT EXISTS idx_weekly_digests_week_start ON weekly_digests(week_start_date);

-- Unique constraint prevents duplicate sends for the same coach + week
-- even if the cron fires twice (server restart protection).
CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_digests_coach_week
  ON weekly_digests(coach_id, week_start_date);
