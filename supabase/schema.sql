-- ============================================================================
-- Offseaz — Reference Schema
-- ============================================================================
-- This file is a DOCUMENTATION ARTIFACT, not an executable migration.
--
-- DO NOT run this against the production database — it already exists and
-- was built incrementally via the dashboard and the files in
-- supabase/migrations/. Running this file against production is unnecessary
-- (every statement is IF NOT EXISTS / additive) but it is not how the schema
-- is maintained going forward, and it will drift out of sync with prod.
--
-- Purpose: let a fresh environment be stood up from the repo alone, and give
-- a single place to read the full shape of every table. It was assembled by
-- reading OFFSEAZ_CODEBASE_MASTER_CONTEXT.md §6 and every query in
-- server/src/services/*.js — see that doc for provenance notes on which
-- columns are DB-confirmed (via supabase/migrations/*.sql) vs. inferred from
-- code usage only.
--
-- Excluded on purpose:
--   - weekly_summaries: dead table, written by an unused function, dropped
--     this session via supabase/migrations/drop_weekly_summaries.sql.
--   - the `avatars` Storage bucket: not a database table.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── profiles ─────────────────────────────────────────────────────────────────
-- One row per Supabase auth user. id mirrors auth.users.id (see CLAUDE.md
-- Auth flow — created by the /api/auth/register self-heal path).
CREATE TABLE IF NOT EXISTS profiles (
  id             UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role           TEXT NOT NULL CHECK (role IN ('coach', 'athlete')),
  full_name      TEXT,
  avatar_url     TEXT,
  privacy_team   TEXT NOT NULL DEFAULT 'public' CHECK (privacy_team IN ('public', 'private')),
  streak_days    INTEGER NOT NULL DEFAULT 0,
  digest_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── teams ────────────────────────────────────────────────────────────────────
-- One row per coach-owned team. A coach may own multiple teams (see
-- supabase/migrations/multi_team_coach.sql).
CREATE TABLE IF NOT EXISTS teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE, -- 8-char lowercase hex, athlete join code
  coach_code  TEXT UNIQUE,          -- 8-char lowercase hex, assistant-coach join code
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teams_coach_id   ON teams(coach_id);
CREATE INDEX IF NOT EXISTS idx_teams_coach_code ON teams(coach_code);

-- ── team_members ─────────────────────────────────────────────────────────────
-- Join table between teams and profiles. athlete_id also stores assistant
-- coach ids — access_level distinguishes the role within the team.
CREATE TABLE IF NOT EXISTS team_members (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  athlete_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  access_level TEXT NOT NULL DEFAULT 'athlete'
                 CHECK (access_level IN ('athlete', 'view_only', 'admin_coach')),
  joined_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_team_members_team_athlete UNIQUE (team_id, athlete_id)
);

-- ── survey_responses ─────────────────────────────────────────────────────────
-- One per athlete (team_id nullable — an athlete can complete the survey and
-- get a preview blueprint before joining a team; see teamless_athlete_preview.sql).
CREATE TABLE IF NOT EXISTS survey_responses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id       UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  team_id          UUID REFERENCES teams(id) ON DELETE CASCADE,
  sport            TEXT,
  position         TEXT,
  goals            TEXT,
  weaknesses       TEXT,
  injury_history   TEXT,
  equipment        JSONB NOT NULL DEFAULT '[]'::jsonb,
  time_per_week    TEXT,
  age              INTEGER,
  height_feet      INTEGER,
  height_inches    INTEGER,
  weight_lbs       NUMERIC,
  grade            TEXT,
  primary_goal     TEXT,
  experience_level TEXT,
  equipment_tier   TEXT,
  injury_areas     JSONB NOT NULL DEFAULT '[]'::jsonb,
  injury_other     TEXT,
  injury_notes     TEXT,
  weakness_areas   JSONB NOT NULL DEFAULT '[]'::jsonb,
  offseason_goals  JSONB NOT NULL DEFAULT '[]'::jsonb,
  completed_at     TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── blueprints ───────────────────────────────────────────────────────────────
-- coach_id and team_id are both nullable to support the teamless-athlete
-- preview flow (auto-generated blueprint with no coach/team yet).
CREATE TABLE IF NOT EXISTS blueprints (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  team_id     UUID REFERENCES teams(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT,
  num_weeks   INTEGER NOT NULL,
  locked      BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── blueprint_weeks ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blueprint_weeks (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
  week_number  INTEGER NOT NULL,
  objective    TEXT,
  -- Array of { day, focus, description, injury_modified? } objects
  sessions     JSONB NOT NULL DEFAULT '[]'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_blueprint_weeks_blueprint_id ON blueprint_weeks(blueprint_id);

-- ── blueprint_assignments ────────────────────────────────────────────────────
-- athlete_id XOR team_id is populated depending on whether the blueprint was
-- assigned to one athlete or broadcast to a whole team.
CREATE TABLE IF NOT EXISTS blueprint_assignments (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blueprint_id UUID NOT NULL REFERENCES blueprints(id) ON DELETE CASCADE,
  athlete_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  team_id      UUID REFERENCES teams(id) ON DELETE CASCADE,
  starts_on    DATE NOT NULL,
  assigned_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blueprint_assignments_athlete_id ON blueprint_assignments(athlete_id);
CREATE INDEX IF NOT EXISTS idx_blueprint_assignments_team_id    ON blueprint_assignments(team_id);

-- ── athlete_plan_overrides ───────────────────────────────────────────────────
-- Per-athlete overrides (e.g. injury substitutions) layered on top of a
-- team-wide blueprint_assignment. Upsert conflict target is the composite PK.
CREATE TABLE IF NOT EXISTS athlete_plan_overrides (
  assignment_id UUID NOT NULL REFERENCES blueprint_assignments(id) ON DELETE CASCADE,
  athlete_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  overrides     JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (assignment_id, athlete_id)
);

-- ── workout_logs ─────────────────────────────────────────────────────────────
-- No team_id column — scoped to athlete + the specific session logged.
-- Upsert conflict target is (athlete_id, blueprint_week_id, session_index).
CREATE TABLE IF NOT EXISTS workout_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blueprint_week_id UUID NOT NULL REFERENCES blueprint_weeks(id) ON DELETE CASCADE,
  session_index     INTEGER NOT NULL,
  status            TEXT NOT NULL CHECK (status IN ('completed', 'partial', 'skipped', 'skipped_injury')),
  effort            INTEGER CHECK (effort BETWEEN 1 AND 10),
  note              TEXT,
  logged_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_workout_logs_athlete_week_session UNIQUE (athlete_id, blueprint_week_id, session_index)
);

-- ── lifting_maxes ────────────────────────────────────────────────────────────
-- `lift` is validated against an app-level VALID_LIFTS list
-- (server/src/services/maxesService.js), not a DB constraint, so new lift
-- types can be added without a migration.
CREATE TABLE IF NOT EXISTS lifting_maxes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lift       TEXT NOT NULL,
  weight_lbs NUMERIC NOT NULL,
  reps       INTEGER NOT NULL DEFAULT 1,
  notes      TEXT,
  logged_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lifting_maxes_athlete_id ON lifting_maxes(athlete_id);

-- ── athlete_lift_selections ──────────────────────────────────────────────────
-- Which lifts an athlete has chosen to display on their Strength PRs profile section.
CREATE TABLE IF NOT EXISTS athlete_lift_selections (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lift_key   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT uq_athlete_lift UNIQUE (athlete_id, lift_key)
);

CREATE INDEX IF NOT EXISTS idx_als_athlete ON athlete_lift_selections(athlete_id);

-- ── athlete_goals ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS athlete_goals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  target       TEXT,
  due_date     DATE,
  source       TEXT NOT NULL DEFAULT 'custom',
  completed    BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_athlete_goals_athlete_id ON athlete_goals(athlete_id);

-- ── daily_checkins ───────────────────────────────────────────────────────────
-- Upsert conflict target is (athlete_id, date) — one check-in per athlete per day.
CREATE TABLE IF NOT EXISTS daily_checkins (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  sleep_score      INTEGER,
  soreness_score   INTEGER,
  energy_score     INTEGER,
  is_rest_day      BOOLEAN NOT NULL DEFAULT false,
  readiness_score  INTEGER,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_daily_checkins_athlete_date UNIQUE (athlete_id, date)
);

-- ── coach_notes ──────────────────────────────────────────────────────────────
-- One free-text note per (coach, athlete) pair. No team_id — tied to the
-- coach relationship, not any specific team.
CREATE TABLE IF NOT EXISTS coach_notes (
  coach_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  note       TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (coach_id, athlete_id)
);

-- ── coach_notifications ──────────────────────────────────────────────────────
-- athlete_id is repurposed for non-athlete subjects: for type 'coach_joined'
-- it holds the new assistant coach's id; for 'ownership_transfer' it holds
-- the coach's own id (self-notification). Upsert conflict target is
-- (coach_id, athlete_id, type).
CREATE TABLE IF NOT EXISTS coach_notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  athlete_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN
                 ('injury_flag', 'blueprint_assigned', 'coach_joined', 'program_complete', 'ownership_transfer')),
  message      TEXT,
  dismissed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_coach_notifications_coach_athlete_type UNIQUE (coach_id, athlete_id, type)
);

-- ── team_messages ────────────────────────────────────────────────────────────
-- recipient_id NULL = team-wide group message. parent_id is write-only
-- (always inserted as NULL, never read by any query) — vestigial today, kept
-- for a potential future threaded-replies feature.
CREATE TABLE IF NOT EXISTS team_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  sender_id    UUID NOT NULL,
  recipient_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content      TEXT NOT NULL,
  parent_id    UUID REFERENCES team_messages(id) ON DELETE SET NULL,
  is_read      BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT team_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_team_messages_team_id ON team_messages(team_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_sender_id ON team_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_team_messages_recipient_id ON team_messages(recipient_id);

-- ── team_posts ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS team_posts (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT,
  photo_url  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_posts_team_id ON team_posts(team_id);

-- ── post_likes ───────────────────────────────────────────────────────────────
-- One like per (post, user). Today this is only enforced in application code
-- via a pre-insert .maybeSingle() check — the PK below documents the
-- load-bearing constraint the app already assumes.
CREATE TABLE IF NOT EXISTS post_likes (
  post_id    UUID NOT NULL REFERENCES team_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

-- ── post_comments ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_comments (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    UUID NOT NULL REFERENCES team_posts(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON post_comments(post_id);

-- ── pr_celebrations ──────────────────────────────────────────────────────────
-- Write-only, fire-and-forget insert whenever logMax() detects a new PR.
CREATE TABLE IF NOT EXISTS pr_celebrations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lift                TEXT NOT NULL,
  new_weight_lbs      NUMERIC NOT NULL,
  previous_weight_lbs NUMERIC,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── athlete_metric_selections / performance_logs / performance_prs ──────────
-- Combine tracking for combine-style metrics (40-yard dash, vertical jump,
-- exit velocity, etc). Uses partial unique indexes instead of
-- UNIQUE NULLS NOT DISTINCT for PG14 compatibility.
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

-- Every logged value for a selected metric. Values are normalized to base
-- units (seconds, inches) — see server/src/services/performanceService.js.
CREATE TABLE IF NOT EXISTS performance_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  selection_id UUID NOT NULL REFERENCES athlete_metric_selections(id) ON DELETE CASCADE,
  value        NUMERIC(12,3) NOT NULL,
  logged_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pl_selection ON performance_logs(selection_id, logged_at DESC);
CREATE INDEX IF NOT EXISTS idx_pl_athlete   ON performance_logs(athlete_id);

-- Denormalized current-best per selection for O(1) reads.
CREATE TABLE IF NOT EXISTS performance_prs (
  selection_id   UUID PRIMARY KEY REFERENCES athlete_metric_selections(id) ON DELETE CASCADE,
  best_value     NUMERIC(12,3) NOT NULL,
  previous_value NUMERIC(12,3),
  log_id         UUID REFERENCES performance_logs(id),
  updated_at     TIMESTAMPTZ DEFAULT now()
);

-- ── weekly_digests ───────────────────────────────────────────────────────────
-- Audit log of every Sunday-cron digest attempt. The unique index on
-- (coach_id, week_start_date) is the dedup guard that gives a coach with
-- several teams exactly one email per week regardless of cron parallelism.
CREATE TABLE IF NOT EXISTS weekly_digests (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id         UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  coach_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  week_start_date DATE        NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'sent'
                              CHECK (status IN ('sent', 'failed')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weekly_digests_team_id    ON weekly_digests(team_id);
CREATE INDEX IF NOT EXISTS idx_weekly_digests_coach_id   ON weekly_digests(coach_id);
CREATE INDEX IF NOT EXISTS idx_weekly_digests_week_start ON weekly_digests(week_start_date);

CREATE UNIQUE INDEX IF NOT EXISTS idx_weekly_digests_coach_week
  ON weekly_digests(coach_id, week_start_date);

-- ── program_completions ──────────────────────────────────────────────────────
-- Fires when an athlete finishes their assigned blueprint; inserts here are
-- treated as non-fatal by the controller, implying this table has been added
-- more recently than most and may not exist in every environment yet.
CREATE TABLE IF NOT EXISTS program_completions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  athlete_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blueprint_id UUID REFERENCES blueprints(id) ON DELETE SET NULL,
  team_id      UUID REFERENCES teams(id) ON DELETE SET NULL,
  action       TEXT NOT NULL
                 CHECK (action IN ('retest_maxes', 'retake_survey', 'wait_for_coach')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_program_completions_athlete_id ON program_completions(athlete_id);
CREATE INDEX IF NOT EXISTS idx_program_completions_team_id    ON program_completions(team_id);
