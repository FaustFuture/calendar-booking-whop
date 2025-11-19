-- Add timezone field to availability_patterns table
-- This field stores the admin's timezone when creating the pattern
-- Critical for preventing timezone conflicts when members from different timezones book slots

-- Add the timezone column
ALTER TABLE availability_patterns
ADD COLUMN timezone text DEFAULT 'UTC';

-- Add comment for documentation
COMMENT ON COLUMN availability_patterns.timezone IS 'IANA timezone identifier (e.g., America/New_York) of the admin who created this pattern. All slots are generated in this timezone to prevent booking conflicts across timezones.';

-- Create index for better query performance
CREATE INDEX idx_availability_patterns_timezone ON availability_patterns(timezone);

-- Backfill existing patterns with UTC (safe default)
UPDATE availability_patterns
SET timezone = 'UTC'
WHERE timezone IS NULL;

-- Make the column NOT NULL after backfilling
ALTER TABLE availability_patterns
ALTER COLUMN timezone SET NOT NULL;
