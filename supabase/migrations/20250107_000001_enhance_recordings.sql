-- Migration: Enhance Recordings for Provider Integration
-- Created: 2025-01-07
-- Description: Add fields for Google Meet and Zoom recording integration

-- Add new columns to recordings table
ALTER TABLE public.recordings
ADD COLUMN IF NOT EXISTS provider TEXT CHECK (provider IN ('google', 'zoom', 'manual')) DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS external_id TEXT, -- Provider's recording ID
ADD COLUMN IF NOT EXISTS meeting_provider_id TEXT, -- Link to meeting ID in provider
ADD COLUMN IF NOT EXISTS playback_url TEXT, -- Streaming/playback URL
ADD COLUMN IF NOT EXISTS download_url TEXT, -- Download URL (may expire)
ADD COLUMN IF NOT EXISTS download_expires_at TIMESTAMP WITH TIME ZONE, -- Expiration for download URL
ADD COLUMN IF NOT EXISTS transcript_url TEXT, -- Transcript/caption file URL
ADD COLUMN IF NOT EXISTS transcript_vtt_url TEXT, -- VTT format transcript
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('processing', 'available', 'failed', 'deleted')) DEFAULT 'available',
ADD COLUMN IF NOT EXISTS recording_type TEXT CHECK (recording_type IN ('cloud', 'local')) DEFAULT 'cloud',
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb, -- Provider-specific metadata
ADD COLUMN IF NOT EXISTS auto_fetched BOOLEAN DEFAULT false, -- Distinguish auto from manual
ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMP WITH TIME ZONE, -- When recording was fetched
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE; -- Last metadata sync

-- Create unique constraint for provider recordings to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_recordings_provider_external_id
ON public.recordings(provider, external_id)
WHERE external_id IS NOT NULL AND provider IS NOT NULL;

-- Create indexes for new query patterns
CREATE INDEX IF NOT EXISTS idx_recordings_provider ON public.recordings(provider);
CREATE INDEX IF NOT EXISTS idx_recordings_status ON public.recordings(status);
CREATE INDEX IF NOT EXISTS idx_recordings_auto_fetched ON public.recordings(auto_fetched);
CREATE INDEX IF NOT EXISTS idx_recordings_meeting_provider_id ON public.recordings(meeting_provider_id);
CREATE INDEX IF NOT EXISTS idx_recordings_download_expires_at ON public.recordings(download_expires_at)
WHERE download_expires_at IS NOT NULL;

-- Add metadata index for JSON queries (useful for provider-specific queries)
CREATE INDEX IF NOT EXISTS idx_recordings_metadata ON public.recordings USING gin(metadata);

-- Update existing recordings to mark them as manual
UPDATE public.recordings
SET provider = 'manual',
    auto_fetched = false,
    status = 'available'
WHERE provider IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.recordings.provider IS 'Recording source: google (Meet), zoom, or manual upload';
COMMENT ON COLUMN public.recordings.external_id IS 'Provider''s unique recording identifier';
COMMENT ON COLUMN public.recordings.meeting_provider_id IS 'Provider''s meeting/conference ID';
COMMENT ON COLUMN public.recordings.playback_url IS 'Streaming URL (usually permanent)';
COMMENT ON COLUMN public.recordings.download_url IS 'Download URL (may have expiration)';
COMMENT ON COLUMN public.recordings.download_expires_at IS 'When download_url expires (Zoom: 24h)';
COMMENT ON COLUMN public.recordings.status IS 'Processing status: processing, available, failed, deleted';
COMMENT ON COLUMN public.recordings.metadata IS 'Provider-specific data (file types, participants, etc.)';
COMMENT ON COLUMN public.recordings.auto_fetched IS 'True if automatically fetched from provider';
