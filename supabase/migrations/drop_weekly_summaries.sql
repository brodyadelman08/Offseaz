-- weekly_summaries was written by summaryService.js's runWeeklySummary(), which
-- is dead code — nothing ever calls it (superseded by digestService.js's
-- runWeeklyDigest, which is the live Monday 8am cron job). summaryService.js
-- has been deleted from the codebase; this table can be dropped safely.
DROP TABLE IF EXISTS weekly_summaries;
