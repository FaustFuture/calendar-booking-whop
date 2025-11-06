-- Migration: Make booking_id optional for recordings
-- Created: 2025-01-07
-- Description: Allow recordings without specific booking association

-- Make booking_id nullable
ALTER TABLE public.recordings
ALTER COLUMN booking_id DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN public.recordings.booking_id IS 'Optional booking reference. Null for general/standalone recordings.';
