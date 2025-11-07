-- Migration: Support Whop User IDs (TEXT instead of UUID)
-- Created: 2025-01-07
-- Description: Changes user ID columns from UUID to TEXT to support Whop's user ID format (user_xxx)
-- This is required for Whop integration where user IDs are strings, not UUIDs

-- ============================================================================
-- STEP 1: Drop ALL RLS policies from affected tables (dynamic approach)
-- ============================================================================

-- Drop all policies from users table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'users'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', policy_record.policyname);
    END LOOP;
END $$;

-- Drop all policies from bookings table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'bookings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.bookings', policy_record.policyname);
    END LOOP;
END $$;

-- Drop all policies from availability_slots table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'availability_slots'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.availability_slots', policy_record.policyname);
    END LOOP;
END $$;

-- Drop all policies from recordings table
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT policyname
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'recordings'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.recordings', policy_record.policyname);
    END LOOP;
END $$;

-- Drop all policies from availability_patterns table (if exists)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'availability_patterns'
    ) THEN
        FOR policy_record IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'availability_patterns'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.availability_patterns', policy_record.policyname);
        END LOOP;
    END IF;
END $$;

-- Drop all policies from oauth_connections table (if exists)
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'oauth_connections'
    ) THEN
        FOR policy_record IN
            SELECT policyname
            FROM pg_policies
            WHERE schemaname = 'public' AND tablename = 'oauth_connections'
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON public.oauth_connections', policy_record.policyname);
        END LOOP;
    END IF;
END $$;

-- ============================================================================
-- STEP 2: Drop foreign key constraints
-- ============================================================================

ALTER TABLE IF EXISTS public.bookings DROP CONSTRAINT IF EXISTS bookings_member_id_fkey;
ALTER TABLE IF EXISTS public.bookings DROP CONSTRAINT IF EXISTS bookings_admin_id_fkey;
ALTER TABLE IF EXISTS public.availability_slots DROP CONSTRAINT IF EXISTS availability_slots_admin_id_fkey;
ALTER TABLE IF EXISTS public.availability_patterns DROP CONSTRAINT IF EXISTS availability_patterns_admin_id_fkey;
ALTER TABLE IF EXISTS public.oauth_connections DROP CONSTRAINT IF EXISTS oauth_connections_user_id_fkey;
ALTER TABLE IF EXISTS public.users DROP CONSTRAINT IF EXISTS users_id_fkey;

-- ============================================================================
-- STEP 3: Change column types from UUID to TEXT
-- ============================================================================

-- Change users.id (the primary key)
ALTER TABLE public.users ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Change bookings columns
ALTER TABLE public.bookings ALTER COLUMN member_id TYPE TEXT USING member_id::TEXT;
ALTER TABLE public.bookings ALTER COLUMN admin_id TYPE TEXT USING admin_id::TEXT;

-- Change availability_slots columns
ALTER TABLE public.availability_slots ALTER COLUMN admin_id TYPE TEXT USING admin_id::TEXT;

-- Change availability_patterns.admin_id if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'availability_patterns'
        AND column_name = 'admin_id'
    ) THEN
        ALTER TABLE public.availability_patterns ALTER COLUMN admin_id TYPE TEXT USING admin_id::TEXT;
    END IF;
END $$;

-- Change oauth_connections.user_id if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'oauth_connections'
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.oauth_connections ALTER COLUMN user_id TYPE TEXT USING user_id::TEXT;
    END IF;
END $$;

-- ============================================================================
-- STEP 4: Recreate foreign key constraints
-- ============================================================================

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_member_id_fkey
  FOREIGN KEY (member_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.bookings
  ADD CONSTRAINT bookings_admin_id_fkey
  FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.availability_slots
  ADD CONSTRAINT availability_slots_admin_id_fkey
  FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- Add foreign key for availability_patterns if table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'availability_patterns'
    ) THEN
        ALTER TABLE public.availability_patterns
          ADD CONSTRAINT availability_patterns_admin_id_fkey
          FOREIGN KEY (admin_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key for oauth_connections if table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'oauth_connections'
    ) THEN
        ALTER TABLE public.oauth_connections
          ADD CONSTRAINT oauth_connections_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- ============================================================================
-- STEP 5: Recreate RLS policies (permissive for Whop authentication)
-- ============================================================================

-- Users table policies
CREATE POLICY "Service role has full access to users" ON public.users
  FOR ALL USING (true);

-- Availability slots policies
CREATE POLICY "Service role has full access to slots" ON public.availability_slots
  FOR ALL USING (true);

-- Bookings policies
CREATE POLICY "Service role has full access to bookings" ON public.bookings
  FOR ALL USING (true);

-- Recordings policies
CREATE POLICY "Service role has full access to recordings" ON public.recordings
  FOR ALL USING (true);

-- Availability patterns policies (if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'availability_patterns'
    ) THEN
        CREATE POLICY "Service role has full access to patterns" ON public.availability_patterns
          FOR ALL USING (true);
    END IF;
END $$;

-- OAuth connections policies (if table exists)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'oauth_connections'
    ) THEN
        CREATE POLICY "Service role has full access to oauth" ON public.oauth_connections
          FOR ALL USING (true);
    END IF;
END $$;

-- ============================================================================
-- STEP 6: Optimize indexes for TEXT columns
-- ============================================================================

-- Drop and recreate indexes for better TEXT performance
DROP INDEX IF EXISTS idx_bookings_member_id;
DROP INDEX IF EXISTS idx_bookings_admin_id;
DROP INDEX IF EXISTS idx_availability_slots_admin_id;
DROP INDEX IF EXISTS idx_users_id;

CREATE INDEX idx_bookings_member_id ON public.bookings(member_id);
CREATE INDEX idx_bookings_admin_id ON public.bookings(admin_id);
CREATE INDEX idx_availability_slots_admin_id ON public.availability_slots(admin_id);
CREATE INDEX idx_users_id ON public.users(id);

-- Add index for availability_patterns if table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'availability_patterns'
    ) THEN
        DROP INDEX IF EXISTS idx_availability_patterns_admin_id;
        CREATE INDEX idx_availability_patterns_admin_id ON public.availability_patterns(admin_id);
    END IF;
END $$;

-- Add index for oauth_connections if table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'oauth_connections'
    ) THEN
        DROP INDEX IF EXISTS idx_oauth_connections_user_id;
        CREATE INDEX idx_oauth_connections_user_id ON public.oauth_connections(user_id);
    END IF;
END $$;

-- ============================================================================
-- STEP 7: Drop Supabase auth trigger (not needed for Whop auth)
-- ============================================================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ============================================================================
-- STEP 8: Add helpful comments
-- ============================================================================

COMMENT ON COLUMN public.users.id IS 'Whop user ID in format: user_xxx (TEXT, not UUID)';
COMMENT ON COLUMN public.bookings.member_id IS 'References users.id (Whop user ID)';
COMMENT ON COLUMN public.bookings.admin_id IS 'References users.id (Whop user ID)';
COMMENT ON TABLE public.users IS 'User profiles synced from Whop authentication';

-- Migration complete!
SELECT 'Migration completed successfully! User IDs are now TEXT to support Whop format.' AS status;
