-- weekly_digests.coach_id has no foreign key today, so a deleted coach profile
-- leaves orphaned digest rows behind indefinitely. Add the missing FK with
-- ON DELETE CASCADE so digest history is cleaned up along with the profile.
-- Run this in the Supabase SQL editor or via supabase db push.

-- Guard against orphaned coach_id values that predate this constraint —
-- without this, the ALTER TABLE below would fail on any row whose coach_id
-- no longer matches a profiles.id.
DELETE FROM weekly_digests
WHERE coach_id IS NOT NULL
  AND coach_id NOT IN (SELECT id FROM profiles);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'weekly_digests_coach_id_fkey'
  ) THEN
    ALTER TABLE weekly_digests
      ADD CONSTRAINT weekly_digests_coach_id_fkey
      FOREIGN KEY (coach_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;
