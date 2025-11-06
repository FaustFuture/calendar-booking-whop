-- Migration: Fix RLS policies for optional booking_id
-- Created: 2025-01-07
-- Description: Update RLS policies to handle standalone recordings (null booking_id)

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view recordings for their bookings" ON public.recordings;
DROP POLICY IF EXISTS "Admins can create recordings" ON public.recordings;
DROP POLICY IF EXISTS "Admins can update recordings" ON public.recordings;
DROP POLICY IF EXISTS "Admins can delete recordings" ON public.recordings;

-- SELECT policy: View recordings for bookings you're part of, OR all if admin
CREATE POLICY "Users can view recordings for their bookings" ON public.recordings
  FOR SELECT USING (
    -- View standalone recordings (no booking_id)
    booking_id IS NULL
    OR
    -- View recordings for bookings you're part of
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id AND (
        member_id = auth.uid() OR
        admin_id = auth.uid() OR
        member_id = '00000000-0000-0000-0000-000000000001' OR -- Dev mode bypass
        admin_id = '00000000-0000-0000-0000-000000000001' -- Dev mode bypass
      )
    )
    OR
    -- Admins can view all recordings
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- INSERT policy: Admins can create any recording
CREATE POLICY "Admins can create recordings" ON public.recordings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- Dev mode bypass
    '00000000-0000-0000-0000-000000000001' = auth.uid()
  );

-- UPDATE policy: Admins can update any recording
CREATE POLICY "Admins can update recordings" ON public.recordings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- Dev mode bypass
    '00000000-0000-0000-0000-000000000001' = auth.uid()
  );

-- DELETE policy: Admins can delete any recording
CREATE POLICY "Admins can delete recordings" ON public.recordings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR
    -- Dev mode bypass
    '00000000-0000-0000-0000-000000000001' = auth.uid()
  );

-- Add comment
COMMENT ON TABLE public.recordings IS 'Recordings can be standalone (booking_id NULL) or linked to specific bookings';
