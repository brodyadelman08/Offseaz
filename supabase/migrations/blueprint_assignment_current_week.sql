-- Tracks the athlete's actual progress through an assigned plan as a stored,
-- distinct value — separate from the plan content (blueprint_weeks) and
-- separate from the elapsed-time guess the client used to compute previously
-- (Date.now() - starts_on). This is what lets survey retake regenerate only
-- the upcoming, not-yet-completed weeks while leaving history untouched, and
-- lets the UI resume the athlete exactly where they left off.
--
-- 1-based, defaults to 1 (the athlete hasn't completed any weeks yet).
-- Recomputed and persisted by the server (workoutService.js) every time a
-- workout is logged — see recomputeCurrentWeek(). Never written to by the
-- client directly.

ALTER TABLE blueprint_assignments
  ADD COLUMN IF NOT EXISTS current_week INTEGER NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_blueprint_assignments_current_week'
  ) THEN
    ALTER TABLE blueprint_assignments
      ADD CONSTRAINT chk_blueprint_assignments_current_week CHECK (current_week >= 1);
  END IF;
END $$;
