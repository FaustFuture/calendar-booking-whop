-- Migration: Add Recording Fetch Tracking to Bookings
-- Created: 2025-01-08
-- Description: Add columns to track recording fetch attempts at different phases

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS recording_fetch_immediate BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recording_fetch_auto_complete BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS recording_fetch_15min BOOLEAN DEFAULT FALSE;

-- Create index for efficient querying of completed bookings needing recording fetch
CREATE INDEX IF NOT EXISTS idx_bookings_recording_fetch 
ON public.bookings(booking_end_time, status, recording_fetch_15min)
WHERE status = 'completed' AND booking_end_time IS NOT NULL;

COMMENT ON COLUMN public.bookings.recording_fetch_immediate IS 'Whether recording was fetched when user manually finished the meeting';
COMMENT ON COLUMN public.bookings.recording_fetch_auto_complete IS 'Whether recording was fetched when meeting auto-completed by time';
COMMENT ON COLUMN public.bookings.recording_fetch_15min IS 'Whether recording was fetched 15 minutes after meeting ended';

