-- Migration: Allow Bookings Without Slot or Pattern
-- Created: 2025-01-08
-- Description: Remove the constraint that requires slot_id or pattern_id, allowing standalone bookings

-- Drop the existing constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'slot_or_pattern_required'
  ) THEN
    ALTER TABLE public.bookings
      DROP CONSTRAINT slot_or_pattern_required;
  END IF;
END $$;

-- The constraint is now removed, allowing bookings without slot_id or pattern_id
-- Bookings can now be created with just member_id, title, description, etc.

