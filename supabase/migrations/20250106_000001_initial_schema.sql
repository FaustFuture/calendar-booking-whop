-- Migration: Initial Schema
-- Created: 2025-01-06
-- Description: Base database schema with users, availability_slots, bookings, and recordings tables
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')) DEFAULT 'member',
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraint with exception for dev mode
-- This allows the dev UUID to exist without being in auth.users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_id_fkey'
  ) THEN
    ALTER TABLE public.users
    ADD CONSTRAINT users_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
    NOT VALID;
  END IF;
END $$;

-- Availability Slots table
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  title TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure end_time is after start_time
  CONSTRAINT valid_time_range CHECK (end_time > start_time)
);

-- Bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slot_id UUID REFERENCES public.availability_slots(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL CHECK (status IN ('upcoming', 'completed', 'cancelled')) DEFAULT 'upcoming',
  meeting_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recordings table
CREATE TABLE IF NOT EXISTS public.recordings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  title TEXT NOT NULL,
  duration INTEGER, -- Duration in seconds
  file_size BIGINT, -- File size in bytes
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_availability_slots_admin_id ON public.availability_slots(admin_id);
CREATE INDEX IF NOT EXISTS idx_availability_slots_start_time ON public.availability_slots(start_time);
CREATE INDEX IF NOT EXISTS idx_availability_slots_is_available ON public.availability_slots(is_available);

CREATE INDEX IF NOT EXISTS idx_bookings_member_id ON public.bookings(member_id);
CREATE INDEX IF NOT EXISTS idx_bookings_admin_id ON public.bookings(admin_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_slot_id ON public.bookings(slot_id);

CREATE INDEX IF NOT EXISTS idx_recordings_booking_id ON public.recordings(booking_id);

-- Row Level Security (RLS) Policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view all profiles" ON public.users
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (
    auth.uid() = id
    OR id = '00000000-0000-0000-0000-000000000001' -- Dev mode bypass
  );

-- Availability slots policies
CREATE POLICY "Everyone can view available slots" ON public.availability_slots
  FOR SELECT USING (is_available = true OR admin_id = auth.uid());

CREATE POLICY "Admins can create availability slots" ON public.availability_slots
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR admin_id = '00000000-0000-0000-0000-000000000001' -- Dev mode bypass
  );

CREATE POLICY "Admins can update own availability slots" ON public.availability_slots
  FOR UPDATE USING (
    admin_id = auth.uid()
    OR admin_id = '00000000-0000-0000-0000-000000000001' -- Dev mode bypass
  );

CREATE POLICY "Admins can delete own availability slots" ON public.availability_slots
  FOR DELETE USING (
    admin_id = auth.uid()
    OR admin_id = '00000000-0000-0000-0000-000000000001' -- Dev mode bypass
  );

-- Bookings policies
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT USING (
    member_id = auth.uid() OR
    admin_id = auth.uid() OR
    member_id = '00000000-0000-0000-0000-000000000001' OR -- Dev mode bypass
    admin_id = '00000000-0000-0000-0000-000000000001' OR -- Dev mode bypass
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can create bookings" ON public.bookings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR admin_id = '00000000-0000-0000-0000-000000000001' -- Dev mode bypass
  );

CREATE POLICY "Members can create own bookings" ON public.bookings
  FOR INSERT WITH CHECK (
    member_id = auth.uid()
    OR member_id = '00000000-0000-0000-0000-000000000001' -- Dev mode bypass
  );

CREATE POLICY "Admins and booking owners can update bookings" ON public.bookings
  FOR UPDATE USING (
    member_id = auth.uid() OR
    admin_id = auth.uid() OR
    member_id = '00000000-0000-0000-0000-000000000001' OR -- Dev mode bypass
    admin_id = '00000000-0000-0000-0000-000000000001' -- Dev mode bypass
  );

CREATE POLICY "Admins and booking owners can delete bookings" ON public.bookings
  FOR DELETE USING (
    member_id = auth.uid() OR
    admin_id = auth.uid() OR
    member_id = '00000000-0000-0000-0000-000000000001' OR -- Dev mode bypass
    admin_id = '00000000-0000-0000-0000-000000000001' -- Dev mode bypass
  );

-- Recordings policies
CREATE POLICY "Users can view recordings for their bookings" ON public.recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id AND (
        member_id = auth.uid() OR
        admin_id = auth.uid() OR
        member_id = '00000000-0000-0000-0000-000000000001' OR -- Dev mode bypass
        admin_id = '00000000-0000-0000-0000-000000000001' -- Dev mode bypass
      )
    )
  );

CREATE POLICY "Admins can create recordings" ON public.recordings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.bookings
      WHERE id = booking_id AND admin_id = '00000000-0000-0000-0000-000000000001' -- Dev mode bypass
    )
  );

CREATE POLICY "Admins can update recordings" ON public.recordings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.users u ON b.admin_id = u.id
      WHERE b.id = booking_id AND u.id = auth.uid() AND u.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.admin_id = '00000000-0000-0000-0000-000000000001' -- Dev mode bypass
    )
  );

CREATE POLICY "Admins can delete recordings" ON public.recordings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.users u ON b.admin_id = u.id
      WHERE b.id = booking_id AND u.id = auth.uid() AND u.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id AND b.admin_id = '00000000-0000-0000-0000-000000000001' -- Dev mode bypass
    )
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_availability_slots_updated_at BEFORE UPDATE ON public.availability_slots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create a user profile automatically when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
