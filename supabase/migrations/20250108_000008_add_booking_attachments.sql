-- Migration: Add Booking Attachments Table
-- Created: 2025-01-08
-- Description: Creates a table to store file attachments for bookings, with support for up to 10MB files.

CREATE TABLE IF NOT EXISTS public.booking_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Path in Supabase Storage
  file_size BIGINT NOT NULL, -- Size in bytes
  mime_type TEXT,
  uploaded_by TEXT, -- Whop user ID (user_xxx format)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_booking_attachments_booking_id ON public.booking_attachments(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_attachments_uploaded_by ON public.booking_attachments(uploaded_by);

-- Enable RLS
ALTER TABLE public.booking_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for booking_attachments
-- Note: Since we're using Whop auth (not Supabase auth), RLS policies are limited
-- Authentication and authorization are handled at the API level via requireWhopAuth
-- These policies provide basic protection but API routes enforce the actual permissions

-- Allow authenticated users to view attachments for bookings in their company
-- (API routes enforce member/admin specific permissions)
CREATE POLICY "Allow viewing attachments for company bookings"
  ON public.booking_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE bookings.id = booking_attachments.booking_id
    )
  );

-- Allow inserting attachments (API routes enforce member/admin specific permissions)
CREATE POLICY "Allow inserting attachments"
  ON public.booking_attachments
  FOR INSERT
  WITH CHECK (true);

-- Allow deleting attachments (API routes enforce member/admin specific permissions)
CREATE POLICY "Allow deleting attachments"
  ON public.booking_attachments
  FOR DELETE
  USING (true);

