-- Migration: Fix User Email Constraint
-- Created: 2025-01-08
-- Description: Remove UNIQUE constraint from email and make it nullable for Whop integration
-- Whop users may not have emails or may share emails

-- Drop the unique constraint on email
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;

-- Make email nullable (some Whop users don't have emails)
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;

-- Add a comment explaining the design decision
COMMENT ON COLUMN public.users.email IS 'User email from Whop. May be null or non-unique. Use id (Whop userId) as the unique identifier.';

-- Create an index on email for query performance (but not unique)
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email) WHERE email IS NOT NULL;
