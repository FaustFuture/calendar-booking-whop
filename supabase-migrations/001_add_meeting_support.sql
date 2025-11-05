-- Migration: Add Meeting Support for Google Meet & Zoom Integration
-- Created: 2025-11-06
-- Description: Adds meeting type tracking and OAuth connection management

-- ============================================================================
-- 1. Extend Availability Slots Table
-- ============================================================================

-- Add meeting type column to track which meeting provider is selected
ALTER TABLE public.availability_slots
ADD COLUMN IF NOT EXISTS meeting_type TEXT DEFAULT 'manual_link'
CHECK (meeting_type IN ('google_meet', 'zoom', 'manual_link', 'location'));

-- Add meeting configuration JSON for storing additional meeting settings
ALTER TABLE public.availability_slots
ADD COLUMN IF NOT EXISTS meeting_config JSONB DEFAULT '{}'::jsonb;

-- Add index for meeting type queries
CREATE INDEX IF NOT EXISTS idx_availability_slots_meeting_type
ON public.availability_slots(meeting_type);

-- ============================================================================
-- 2. Create OAuth Connections Table
-- ============================================================================

-- Stores encrypted OAuth tokens for Google and Zoom integrations
CREATE TABLE IF NOT EXISTS public.oauth_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google', 'zoom')),

  -- OAuth tokens (will be encrypted at application level)
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type TEXT DEFAULT 'Bearer',

  -- Token expiration tracking
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- OAuth scope information
  scope TEXT,

  -- Provider-specific user info
  provider_user_id TEXT,
  provider_email TEXT,

  -- Connection metadata
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one active connection per provider per user
  CONSTRAINT unique_user_provider UNIQUE (user_id, provider)
);

-- Create indexes for OAuth connections
CREATE INDEX IF NOT EXISTS idx_oauth_connections_user_id
ON public.oauth_connections(user_id);

CREATE INDEX IF NOT EXISTS idx_oauth_connections_provider
ON public.oauth_connections(provider);

CREATE INDEX IF NOT EXISTS idx_oauth_connections_expires_at
ON public.oauth_connections(expires_at);

-- ============================================================================
-- 3. Row Level Security for OAuth Connections
-- ============================================================================

ALTER TABLE public.oauth_connections ENABLE ROW LEVEL SECURITY;

-- Users can only view their own OAuth connections
CREATE POLICY "Users can view own OAuth connections" ON public.oauth_connections
  FOR SELECT USING (
    user_id = auth.uid()
    OR user_id = '00000000-0000-0000-0000-000000000001' -- Dev mode bypass
  );

-- Users can create their own OAuth connections
CREATE POLICY "Users can create own OAuth connections" ON public.oauth_connections
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    OR user_id = '00000000-0000-0000-0000-000000000001' -- Dev mode bypass
  );

-- Users can update their own OAuth connections
CREATE POLICY "Users can update own OAuth connections" ON public.oauth_connections
  FOR UPDATE USING (
    user_id = auth.uid()
    OR user_id = '00000000-0000-0000-0000-000000000001' -- Dev mode bypass
  );

-- Users can delete their own OAuth connections
CREATE POLICY "Users can delete own OAuth connections" ON public.oauth_connections
  FOR DELETE USING (
    user_id = auth.uid()
    OR user_id = '00000000-0000-0000-0000-000000000001' -- Dev mode bypass
  );

-- ============================================================================
-- 4. Triggers
-- ============================================================================

-- Automatically update updated_at timestamp for oauth_connections
CREATE TRIGGER update_oauth_connections_updated_at
BEFORE UPDATE ON public.oauth_connections
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- 5. Helper Functions
-- ============================================================================

-- Function to check if a user has an active OAuth connection for a provider
CREATE OR REPLACE FUNCTION public.has_active_oauth_connection(
  p_user_id UUID,
  p_provider TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.oauth_connections
    WHERE user_id = p_user_id
      AND provider = p_provider
      AND is_active = TRUE
      AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active OAuth connection for a user and provider
CREATE OR REPLACE FUNCTION public.get_oauth_connection(
  p_user_id UUID,
  p_provider TEXT
)
RETURNS TABLE (
  id UUID,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    oc.id,
    oc.access_token,
    oc.refresh_token,
    oc.expires_at
  FROM public.oauth_connections oc
  WHERE oc.user_id = p_user_id
    AND oc.provider = p_provider
    AND oc.is_active = TRUE
  ORDER BY oc.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 6. Comments for Documentation
-- ============================================================================

COMMENT ON TABLE public.oauth_connections IS 'Stores OAuth 2.0 tokens for Google Meet and Zoom integrations';
COMMENT ON COLUMN public.availability_slots.meeting_type IS 'Type of meeting: google_meet, zoom, manual_link, or location';
COMMENT ON COLUMN public.availability_slots.meeting_config IS 'Additional meeting configuration stored as JSON';
COMMENT ON COLUMN public.oauth_connections.access_token IS 'OAuth access token (encrypted at application level)';
COMMENT ON COLUMN public.oauth_connections.refresh_token IS 'OAuth refresh token (encrypted at application level)';
