-- Migration: OAuth Connections
-- Created: 2025-01-06
-- Description: Add OAuth connections table for Google Meet and Zoom integrations
-- Depends on: 20250106_000001_initial_schema.sql
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- OAuth Connections table for storing Google Meet and Zoom OAuth tokens
CREATE TABLE IF NOT EXISTS public.oauth_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'zoom')),
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  provider_user_id TEXT NOT NULL,
  provider_email TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one connection per provider per user
  CONSTRAINT unique_user_provider UNIQUE (user_id, provider)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_oauth_connections_user_id ON public.oauth_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_oauth_connections_provider ON public.oauth_connections(provider);
CREATE INDEX IF NOT EXISTS idx_oauth_connections_is_active ON public.oauth_connections(is_active);

-- Row Level Security (RLS)
ALTER TABLE public.oauth_connections ENABLE ROW LEVEL SECURITY;

-- OAuth connections policies
CREATE POLICY "Users can view own OAuth connections" ON public.oauth_connections
  FOR SELECT USING (
    user_id = auth.uid()
    OR user_id = '00000000-0000-0000-0000-000000000001' -- Dev mode bypass
  );

CREATE POLICY "Users can create own OAuth connections" ON public.oauth_connections
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR user_id = '00000000-0000-0000-0000-000000000001' -- Dev mode bypass
  );

CREATE POLICY "Users can update own OAuth connections" ON public.oauth_connections
  FOR UPDATE USING (
    user_id = auth.uid()
    OR user_id = '00000000-0000-0000-0000-000000000001' -- Dev mode bypass
  );

CREATE POLICY "Users can delete own OAuth connections" ON public.oauth_connections
  FOR DELETE USING (
    user_id = auth.uid()
    OR user_id = '00000000-0000-0000-0000-000000000001' -- Dev mode bypass
  );

-- Trigger for updated_at
CREATE TRIGGER update_oauth_connections_updated_at BEFORE UPDATE ON public.oauth_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add meeting_type and meeting_config to availability_slots if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='availability_slots' AND column_name='meeting_type') THEN
    ALTER TABLE public.availability_slots
    ADD COLUMN meeting_type TEXT CHECK (meeting_type IN ('google_meet', 'zoom', 'manual_link', 'location'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name='availability_slots' AND column_name='meeting_config') THEN
    ALTER TABLE public.availability_slots
    ADD COLUMN meeting_config JSONB;
  END IF;
END $$;
