-- Add calendar_event_id field to bookings table
-- This field stores the Google Calendar event ID for syncing cancellations/deletions

-- Add the calendar_event_id column
ALTER TABLE bookings
ADD COLUMN calendar_event_id text;

-- Add comment for documentation
COMMENT ON COLUMN bookings.calendar_event_id IS 'Google Calendar event ID. Used to sync booking cancellations and deletions with Google Calendar.';

-- Create index for better query performance when looking up by calendar event ID
CREATE INDEX idx_bookings_calendar_event_id ON bookings(calendar_event_id);
