-- Migration: Availability Patterns
-- Created: 2025-01-06
-- Description: Add availability_patterns table to store recurring weekly schedules instead of individual slots
-- Depends on: 20250106_000001_initial_schema.sql
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- Availability Patterns table
-- This replaces creating hundreds of individual slots
-- Instead, we store availability patterns and generate slots dynamically
CREATE TABLE IF NOT EXISTS public.availability_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL, -- e.g., 30, 60
  price DECIMAL(10, 2) DEFAULT 0,
  meeting_type TEXT CHECK (meeting_type IN ('google_meet', 'zoom', 'manual_link', 'location')),
  meeting_config JSONB,

  -- Date range for this pattern
  start_date DATE NOT NULL,
  end_date DATE, -- NULL means indefinite

  -- Weekly pattern stored as JSONB
  -- Example: {"Mon": [{"start": "09:00", "end": "17:00"}], "Tue": [{"start": "10:00", "end": "14:00"}]}
  weekly_schedule JSONB NOT NULL,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_availability_patterns_admin_id ON public.availability_patterns(admin_id);
CREATE INDEX IF NOT EXISTS idx_availability_patterns_dates ON public.availability_patterns(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_availability_patterns_is_active ON public.availability_patterns(is_active);

-- Row Level Security
ALTER TABLE public.availability_patterns ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Everyone can view active patterns" ON public.availability_patterns
  FOR SELECT USING (is_active = true OR admin_id = auth.uid() OR admin_id = '00000000-0000-0000-0000-000000000001');

CREATE POLICY "Admins can create patterns" ON public.availability_patterns
  FOR INSERT WITH CHECK (
    admin_id = auth.uid()
    OR admin_id = '00000000-0000-0000-0000-000000000001' -- Dev mode
  );

CREATE POLICY "Admins can update own patterns" ON public.availability_patterns
  FOR UPDATE USING (
    admin_id = auth.uid()
    OR admin_id = '00000000-0000-0000-0000-000000000001' -- Dev mode
  );

CREATE POLICY "Admins can delete own patterns" ON public.availability_patterns
  FOR DELETE USING (
    admin_id = auth.uid()
    OR admin_id = '00000000-0000-0000-0000-000000000001' -- Dev mode
  );

-- Trigger for updated_at
CREATE TRIGGER update_availability_patterns_updated_at BEFORE UPDATE ON public.availability_patterns
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Update bookings table to reference patterns instead of slots (optional migration)
-- You can keep the existing bookings table structure, but add pattern_id for future bookings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='bookings' AND column_name='pattern_id') THEN
    ALTER TABLE public.bookings
    ADD COLUMN pattern_id UUID REFERENCES public.availability_patterns(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add index for pattern_id
CREATE INDEX IF NOT EXISTS idx_bookings_pattern_id ON public.bookings(pattern_id);

-- Comments for documentation
COMMENT ON TABLE public.availability_patterns IS 'Stores recurring weekly availability patterns to avoid creating hundreds of individual slot records';
COMMENT ON COLUMN public.availability_patterns.weekly_schedule IS 'JSON object with day keys (Mon, Tue, etc.) and array of time ranges: {"Mon": [{"start": "09:00", "end": "17:00"}]}';
COMMENT ON COLUMN public.availability_patterns.duration_minutes IS 'Duration in minutes for each booking slot (e.g., 30, 60)';
