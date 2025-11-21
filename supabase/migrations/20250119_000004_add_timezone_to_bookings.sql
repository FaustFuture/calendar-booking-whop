-- Add timezone field to bookings table
-- This field stores the availability pattern's timezone when the booking was created
-- Critical for displaying booking times accurately in user's local timezone

-- Add the timezone column
ALTER TABLE bookings
ADD COLUMN timezone text DEFAULT 'UTC';

-- Add comment for documentation
COMMENT ON COLUMN bookings.timezone IS 'IANA timezone identifier (e.g., America/New_York) from the availability pattern. Used to display booking times in the correct timezone when converting to user''s local timezone.';

-- Create index for better query performance
CREATE INDEX idx_bookings_timezone ON bookings(timezone);

-- Backfill existing bookings with their pattern's timezone
UPDATE bookings
SET timezone = COALESCE(
  (SELECT timezone FROM availability_patterns WHERE availability_patterns.id = bookings.pattern_id),
  'UTC'
)
WHERE timezone IS NULL OR timezone = 'UTC';

-- Make the column NOT NULL after backfilling
ALTER TABLE bookings
ALTER COLUMN timezone SET NOT NULL;
