-- Migration: Add company_id to recordings for multi-tenant isolation
-- Created: 2025-01-07
-- Description: Adds company_id column to recordings table to properly scope recordings by Whop company

-- ============================================================================
-- STEP 1: Add company_id column (nullable initially for existing data)
-- ============================================================================

ALTER TABLE public.recordings
ADD COLUMN IF NOT EXISTS company_id TEXT;

-- ============================================================================
-- STEP 2: Create index for company_id queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_recordings_company_id ON public.recordings(company_id);

-- ============================================================================
-- STEP 3: Add comments for documentation
-- ============================================================================

COMMENT ON COLUMN public.recordings.company_id IS 'Whop company ID in format: biz_xxx (for multi-tenant isolation)';

-- ============================================================================
-- NOTE: Existing recordings will have NULL company_id
-- ============================================================================
-- Existing recordings without company_id should be handled by the application:
-- - Option 1: Show only to super admins
-- - Option 2: Assign to first admin who views them
-- - Option 3: Delete them during migration
--
-- For now, we keep them as NULL and let the application decide.
-- New recordings MUST include company_id.

SELECT 'Migration completed! company_id column added to recordings table.' AS status;
