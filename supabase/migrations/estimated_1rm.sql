-- estimated_1rm: rep-max entries (3RM/5RM/10RM) now convert to an estimated
-- true 1RM under the hood (server/src/services/maxesService.js), so
-- percentage-based programming always keys off a true-max estimate instead
-- of whatever raw weight the athlete happened to enter for a sub-maximal
-- set. estimated_1rm is that derived value; is_estimated flags whether it
-- was converted (3/5/10RM, "estimated") or is a true 1RM as entered
-- (1RM, "tested"). weight_lbs/reps still record exactly what the athlete
-- entered — nothing about the historical PR record changes.

ALTER TABLE lifting_maxes
  ADD COLUMN IF NOT EXISTS estimated_1rm NUMERIC,
  ADD COLUMN IF NOT EXISTS is_estimated  BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill existing rows (logged before this migration, under the old
-- free-text reps field). We don't retroactively apply the 3/5/10RM
-- multiplier table to arbitrary historical rep counts — that would
-- silently change an athlete's percentage-based prescriptions the moment
-- this ships. Instead: estimated_1rm defaults to the raw weight_lbs
-- unconverted, and is_estimated reflects whether reps was already 1 (a
-- true max, "tested") or something else ("estimated", best-effort label
-- only — no conversion applied). An athlete can re-log through the new
-- dropdown any time to get a real converted estimate.
UPDATE lifting_maxes
  SET estimated_1rm = weight_lbs,
      is_estimated  = (reps IS DISTINCT FROM 1)
  WHERE estimated_1rm IS NULL;

ALTER TABLE lifting_maxes
  ALTER COLUMN estimated_1rm SET NOT NULL;
