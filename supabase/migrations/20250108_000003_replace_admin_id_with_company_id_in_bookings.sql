-- Migration: Replace admin_id with company_id in bookings
-- Created: 2025-01-08
-- Description: Change bookings to use company_id (Whop company ID) instead of admin_id for proper multi-tenant scoping
-- Depends on: 20250107_000004_whop_user_ids.sql

-- ============================================================================
-- STEP 1: Drop RLS policies (will recreate with company_id)
-- ============================================================================

DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'bookings'
    ) THEN
        FOR policy_record IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'bookings'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.bookings', policy_record.policyname);
        END LOOP;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Drop foreign key constraint and index on admin_id
-- ============================================================================

ALTER TABLE IF EXISTS public.bookings 
  DROP CONSTRAINT IF EXISTS bookings_admin_id_fkey;

DROP INDEX IF EXISTS idx_bookings_admin_id;

-- ============================================================================
-- STEP 3: Add company_id column
-- ============================================================================

-- Add company_id column (TEXT, NOT NULL)
ALTER TABLE IF EXISTS public.bookings
  ADD COLUMN IF NOT EXISTS company_id TEXT;

-- For existing records, we need to determine company_id from admin_id
-- Since we don't have a direct mapping in the database, we'll need to handle this carefully
-- In practice, if there are existing bookings, they should be updated via the application
-- or manually set based on the admin's company

-- Make company_id NOT NULL after we've populated it (or if table is empty)
DO $$
BEGIN
    -- Check if there are any existing records
    IF EXISTS (SELECT 1 FROM public.bookings LIMIT 1) THEN
        -- If there are existing records, we'll need to handle them
        -- For now, we'll allow NULL temporarily and let the application handle it
        -- Or you can manually update existing records before making it NOT NULL
        RAISE NOTICE 'Existing bookings found. Please update company_id manually or via application before making it NOT NULL.';
    ELSE
        -- If no records exist, we can make it NOT NULL immediately
        ALTER TABLE public.bookings
          ALTER COLUMN company_id SET NOT NULL;
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Drop admin_id column
-- ============================================================================

ALTER TABLE IF EXISTS public.bookings
  DROP COLUMN IF EXISTS admin_id;

-- ============================================================================
-- STEP 5: Create index on company_id
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_bookings_company_id 
  ON public.bookings(company_id);

-- Also create a composite index for company_id + member_id for efficient filtering
CREATE INDEX IF NOT EXISTS idx_bookings_company_member 
  ON public.bookings(company_id, member_id) 
  WHERE member_id IS NOT NULL;

-- ============================================================================
-- STEP 6: Recreate RLS policies (permissive - authorization handled in API)
-- ============================================================================

-- RLS policies are permissive since authorization is handled at the API level
-- with company_id validation
CREATE POLICY "Service role has full access to bookings" ON public.bookings
  FOR ALL USING (true);

-- ============================================================================
-- STEP 7: Add comments
-- ============================================================================

COMMENT ON COLUMN public.bookings.company_id IS 'Whop company ID in format: biz_xxx (for multi-tenant isolation)';
COMMENT ON TABLE public.bookings IS 'Stores bookings scoped by company_id instead of admin_id';

-- Migration complete!
SELECT 'Migration completed! bookings now uses company_id instead of admin_id.' AS status;

