-- digest_enabled: coach preference for weekly digest emails.
-- Run this in the Supabase SQL editor or via supabase db push.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS digest_enabled BOOLEAN NOT NULL DEFAULT TRUE;
