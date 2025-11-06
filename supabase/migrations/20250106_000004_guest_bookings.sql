-- Migration: Guest Bookings Support
-- Created: 2025-01-06
-- Description: Allow guest bookings without authentication by making member_id nullable and adding guest fields
-- Also adds support for pattern-based bookings with specific time slots

-- Make member_id nullable and drop NOT NULL constraint
DO $$
BEGIN
  ALTER TABLE public.bookings
    ALTER COLUMN member_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL; -- Ignore if already nullable
END $$;

-- Make slot_id nullable (not needed for pattern-based bookings)
DO $$
BEGIN
  ALTER TABLE public.bookings
    ALTER COLUMN slot_id DROP NOT NULL;
EXCEPTION
  WHEN others THEN NULL; -- Ignore if already nullable
END $$;

-- Add guest information fields
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS guest_name TEXT,
  ADD COLUMN IF NOT EXISTS guest_email TEXT;

-- Add booking time fields for pattern-based bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_start_time TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS booking_end_time TIMESTAMP WITH TIME ZONE;

-- Add constraint to ensure either member_id OR guest info is provided
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'member_or_guest_required'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT member_or_guest_required
      CHECK (
        member_id IS NOT NULL OR
        (guest_name IS NOT NULL AND guest_email IS NOT NULL)
      );
  END IF;
END $$;

-- Add constraint to ensure either slot_id OR (pattern_id + booking times) is provided
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'slot_or_pattern_required'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT slot_or_pattern_required
      CHECK (
        slot_id IS NOT NULL OR
        (pattern_id IS NOT NULL AND booking_start_time IS NOT NULL AND booking_end_time IS NOT NULL)
      );
  END IF;
END $$;

-- Update RLS policy to allow guest bookings (anyone can create bookings)
DROP POLICY IF EXISTS "Members can create own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Anyone can create bookings" ON public.bookings;

CREATE POLICY "Anyone can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (
    -- Allow if it's their own booking
    member_id = auth.uid()
    -- Allow guest bookings (no auth required)
    OR member_id IS NULL
    -- Dev mode bypass
    OR member_id = '00000000-0000-0000-0000-000000000001'
  );

-- Update view policy to allow guests to view their bookings by email (optional for now)
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;

CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT USING (
    member_id = auth.uid() OR
    admin_id = auth.uid() OR
    member_id = '00000000-0000-0000-0000-000000000001' OR
    admin_id = '00000000-0000-0000-0000-000000000001' OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
