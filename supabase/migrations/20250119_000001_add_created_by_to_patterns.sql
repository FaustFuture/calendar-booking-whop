-- Add created_by field to availability_patterns table
-- This field tracks which admin user created the availability pattern
-- Used for Google Calendar conflict checking

-- Add the created_by column
ALTER TABLE availability_patterns
ADD COLUMN created_by text;

-- Add comment for documentation
COMMENT ON COLUMN availability_patterns.created_by IS 'Whop user ID of the admin who created this pattern. Used for Google Calendar conflict checking.';

-- Create index for better query performance
CREATE INDEX idx_availability_patterns_created_by ON availability_patterns(created_by);

-- Backfill existing patterns with a default admin user (optional - can be run separately)
-- UPDATE availability_patterns
-- SET created_by = (
--   SELECT user_id
--   FROM oauth_connections
--   WHERE provider = 'google'
--     AND is_active = true
--   LIMIT 1
-- )
-- WHERE created_by IS NULL;
