-- Migration: Fix Pattern Deletion Constraint
-- Created: 2025-01-06
-- Description: Change pattern_id foreign key to CASCADE delete instead of SET NULL
-- This prevents constraint violations when deleting patterns with bookings

-- Drop the existing foreign key constraint for pattern_id
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS bookings_pattern_id_fkey;

-- Recreate the foreign key with CASCADE delete
ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_pattern_id_fkey
  FOREIGN KEY (pattern_id)
  REFERENCES public.availability_patterns(id)
  ON DELETE CASCADE;

-- Comment
COMMENT ON CONSTRAINT bookings_pattern_id_fkey ON public.bookings IS 'Cascade delete bookings when pattern is deleted';

-- Note: member_id keeps its original CASCADE delete behavior
-- Guest bookings (where member_id is NULL) are preserved since they don't have this foreign key set
