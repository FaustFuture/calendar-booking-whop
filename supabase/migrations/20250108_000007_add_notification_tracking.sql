-- Migration: Add Notification Tracking to Bookings
-- Created: 2025-01-08
-- Description: Add columns to track whether 15-minute and 2-minute reminder notifications have been sent

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS notification_15min_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS notification_2min_sent BOOLEAN DEFAULT FALSE;

-- Create index for efficient querying of upcoming bookings
CREATE INDEX IF NOT EXISTS idx_bookings_upcoming_notifications 
ON public.bookings(booking_start_time, status, notification_15min_sent, notification_2min_sent)
WHERE status = 'upcoming' AND booking_start_time IS NOT NULL;

COMMENT ON COLUMN public.bookings.notification_15min_sent IS 'Whether the 15-minute reminder notification has been sent';
COMMENT ON COLUMN public.bookings.notification_2min_sent IS 'Whether the 2-minute reminder notification has been sent';

