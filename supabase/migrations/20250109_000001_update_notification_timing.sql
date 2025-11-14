-- Migration: Update Notification Timing
-- Created: 2025-01-09
-- Description: Replace 15min/2min notification columns with 24h/2h/30min columns

-- Drop old columns
ALTER TABLE public.bookings
DROP COLUMN IF EXISTS notification_15min_sent,
DROP COLUMN IF EXISTS notification_2min_sent;

-- Add new columns
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS notification_24h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notification_2h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notification_30min_sent BOOLEAN DEFAULT FALSE;

-- Drop old index
DROP INDEX IF EXISTS idx_bookings_upcoming_notifications;

-- Create new index with updated column names
CREATE INDEX IF NOT EXISTS idx_bookings_upcoming_notifications 
ON public.bookings(booking_start_time, status, notification_24h_sent, notification_2h_sent, notification_30min_sent)
WHERE status = 'upcoming' AND booking_start_time IS NOT NULL;

-- Add comments for new columns
COMMENT ON COLUMN public.bookings.notification_24h_sent IS 'Whether the 24-hour reminder notification has been sent';
COMMENT ON COLUMN public.bookings.notification_2h_sent IS 'Whether the 2-hour reminder notification has been sent';
COMMENT ON COLUMN public.bookings.notification_30min_sent IS 'Whether the 30-minute reminder notification has been sent';

