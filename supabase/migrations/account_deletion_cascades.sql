-- Account/team self-service deletion (server/src/services/accountDeletionService.js)
-- explicitly deletes rows in dependency order before removing the owning
-- profile/team, so these constraints are a defensive backstop rather than
-- the primary mechanism. Several of these tables were created directly in
-- the Supabase dashboard and have no prior migration file in this repo, so
-- we can't be sure a foreign key exists yet — each block below cleans up any
-- orphaned rows first (so the constraint doesn't fail to attach), then drops
-- and re-adds the constraint with ON DELETE CASCADE.
-- Run this in the Supabase SQL editor or via supabase db push.

-- ── Athlete-owned tables → profiles(id) ────────────────────────────────────────

DELETE FROM workout_logs WHERE athlete_id NOT IN (SELECT id FROM profiles);
DO $$ BEGIN
  ALTER TABLE workout_logs DROP CONSTRAINT IF EXISTS workout_logs_athlete_id_fkey;
  ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_athlete_id_fkey
    FOREIGN KEY (athlete_id) REFERENCES profiles(id) ON DELETE CASCADE;
END $$;

DELETE FROM daily_checkins WHERE athlete_id NOT IN (SELECT id FROM profiles);
DO $$ BEGIN
  ALTER TABLE daily_checkins DROP CONSTRAINT IF EXISTS daily_checkins_athlete_id_fkey;
  ALTER TABLE daily_checkins ADD CONSTRAINT daily_checkins_athlete_id_fkey
    FOREIGN KEY (athlete_id) REFERENCES profiles(id) ON DELETE CASCADE;
END $$;

DELETE FROM athlete_goals WHERE athlete_id NOT IN (SELECT id FROM profiles);
DO $$ BEGIN
  ALTER TABLE athlete_goals DROP CONSTRAINT IF EXISTS athlete_goals_athlete_id_fkey;
  ALTER TABLE athlete_goals ADD CONSTRAINT athlete_goals_athlete_id_fkey
    FOREIGN KEY (athlete_id) REFERENCES profiles(id) ON DELETE CASCADE;
END $$;

DELETE FROM survey_responses WHERE athlete_id NOT IN (SELECT id FROM profiles);
DO $$ BEGIN
  ALTER TABLE survey_responses DROP CONSTRAINT IF EXISTS survey_responses_athlete_id_fkey;
  ALTER TABLE survey_responses ADD CONSTRAINT survey_responses_athlete_id_fkey
    FOREIGN KEY (athlete_id) REFERENCES profiles(id) ON DELETE CASCADE;
END $$;

DELETE FROM lifting_maxes WHERE athlete_id NOT IN (SELECT id FROM profiles);
DO $$ BEGIN
  ALTER TABLE lifting_maxes DROP CONSTRAINT IF EXISTS lifting_maxes_athlete_id_fkey;
  ALTER TABLE lifting_maxes ADD CONSTRAINT lifting_maxes_athlete_id_fkey
    FOREIGN KEY (athlete_id) REFERENCES profiles(id) ON DELETE CASCADE;
END $$;

DELETE FROM pr_celebrations WHERE athlete_id NOT IN (SELECT id FROM profiles);
DO $$ BEGIN
  ALTER TABLE pr_celebrations DROP CONSTRAINT IF EXISTS pr_celebrations_athlete_id_fkey;
  ALTER TABLE pr_celebrations ADD CONSTRAINT pr_celebrations_athlete_id_fkey
    FOREIGN KEY (athlete_id) REFERENCES profiles(id) ON DELETE CASCADE;
END $$;

-- team_members.athlete_id also stores assistant-coach ids, so this cascades
-- whenever any profile (athlete or coach) is deleted.
DELETE FROM team_members WHERE athlete_id NOT IN (SELECT id FROM profiles);
DO $$ BEGIN
  ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_athlete_id_fkey;
  ALTER TABLE team_members ADD CONSTRAINT team_members_athlete_id_fkey
    FOREIGN KEY (athlete_id) REFERENCES profiles(id) ON DELETE CASCADE;
END $$;

-- blueprint_assignments.athlete_id is nullable (team-wide assignments have it NULL)
DELETE FROM blueprint_assignments
  WHERE athlete_id IS NOT NULL AND athlete_id NOT IN (SELECT id FROM profiles);
DO $$ BEGIN
  ALTER TABLE blueprint_assignments DROP CONSTRAINT IF EXISTS blueprint_assignments_athlete_id_fkey;
  ALTER TABLE blueprint_assignments ADD CONSTRAINT blueprint_assignments_athlete_id_fkey
    FOREIGN KEY (athlete_id) REFERENCES profiles(id) ON DELETE CASCADE;
END $$;

-- ── Team-owned tables → teams(id) ───────────────────────────────────────────────

DELETE FROM team_members WHERE team_id NOT IN (SELECT id FROM teams);
DO $$ BEGIN
  ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_team_id_fkey;
  ALTER TABLE team_members ADD CONSTRAINT team_members_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
END $$;

DELETE FROM blueprints WHERE team_id NOT IN (SELECT id FROM teams);
DO $$ BEGIN
  ALTER TABLE blueprints DROP CONSTRAINT IF EXISTS blueprints_team_id_fkey;
  ALTER TABLE blueprints ADD CONSTRAINT blueprints_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
END $$;

DELETE FROM team_messages WHERE team_id NOT IN (SELECT id FROM teams);
DO $$ BEGIN
  ALTER TABLE team_messages DROP CONSTRAINT IF EXISTS team_messages_team_id_fkey;
  ALTER TABLE team_messages ADD CONSTRAINT team_messages_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
END $$;

-- blueprint_assignments.team_id is nullable (per-athlete assignments have it NULL)
DELETE FROM blueprint_assignments
  WHERE team_id IS NOT NULL AND team_id NOT IN (SELECT id FROM teams);
DO $$ BEGIN
  ALTER TABLE blueprint_assignments DROP CONSTRAINT IF EXISTS blueprint_assignments_team_id_fkey;
  ALTER TABLE blueprint_assignments ADD CONSTRAINT blueprint_assignments_team_id_fkey
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;
END $$;

-- ── Blueprint-owned tables → blueprints(id) ─────────────────────────────────────

DELETE FROM blueprint_weeks WHERE blueprint_id NOT IN (SELECT id FROM blueprints);
DO $$ BEGIN
  ALTER TABLE blueprint_weeks DROP CONSTRAINT IF EXISTS blueprint_weeks_blueprint_id_fkey;
  ALTER TABLE blueprint_weeks ADD CONSTRAINT blueprint_weeks_blueprint_id_fkey
    FOREIGN KEY (blueprint_id) REFERENCES blueprints(id) ON DELETE CASCADE;
END $$;

DELETE FROM blueprint_assignments WHERE blueprint_id NOT IN (SELECT id FROM blueprints);
DO $$ BEGIN
  ALTER TABLE blueprint_assignments DROP CONSTRAINT IF EXISTS blueprint_assignments_blueprint_id_fkey;
  ALTER TABLE blueprint_assignments ADD CONSTRAINT blueprint_assignments_blueprint_id_fkey
    FOREIGN KEY (blueprint_id) REFERENCES blueprints(id) ON DELETE CASCADE;
END $$;

-- ── Coach-scoped tables → profiles(id) ──────────────────────────────────────────
-- coach_notes/coach_notifications have no team_id column — they're tied to
-- the coach, not any one team, so they only clean up on account deletion.

DELETE FROM coach_notes WHERE coach_id NOT IN (SELECT id FROM profiles);
DO $$ BEGIN
  ALTER TABLE coach_notes DROP CONSTRAINT IF EXISTS coach_notes_coach_id_fkey;
  ALTER TABLE coach_notes ADD CONSTRAINT coach_notes_coach_id_fkey
    FOREIGN KEY (coach_id) REFERENCES profiles(id) ON DELETE CASCADE;
END $$;

DELETE FROM coach_notifications WHERE coach_id NOT IN (SELECT id FROM profiles);
DO $$ BEGIN
  ALTER TABLE coach_notifications DROP CONSTRAINT IF EXISTS coach_notifications_coach_id_fkey;
  ALTER TABLE coach_notifications ADD CONSTRAINT coach_notifications_coach_id_fkey
    FOREIGN KEY (coach_id) REFERENCES profiles(id) ON DELETE CASCADE;
END $$;
