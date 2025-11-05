# Database Migrations

This folder contains all database schema migrations for the Calendar App. Each migration is numbered and timestamped to ensure they run in the correct order.

## Migration Files

### 📋 20250106_000001_initial_schema.sql
**Description:** Base database schema
**Tables Created:**
- `users` - User profiles (admin/member roles)
- `availability_slots` - Individual time slots (legacy, kept for backwards compatibility)
- `bookings` - Booking records
- `recordings` - Meeting recording metadata

**Features:**
- Row Level Security (RLS) policies
- Automatic triggers for `updated_at` timestamps
- Dev mode support (`00000000-0000-0000-0000-000000000001`)
- Auto-create user profile on auth signup

---

### 🔐 20250106_000002_oauth_connections.sql
**Description:** OAuth integration for Google Meet and Zoom
**Depends on:** `20250106_000001_initial_schema.sql`

**Tables Created:**
- `oauth_connections` - Store OAuth tokens and refresh tokens

**Additions:**
- `meeting_type` column to `availability_slots`
- `meeting_config` column to `availability_slots`

**Features:**
- Support for Google Meet and Zoom OAuth
- Token refresh functionality
- One connection per provider per user

---

### 📅 20250106_000003_availability_patterns.sql
**Description:** Recurring weekly availability patterns
**Depends on:** `20250106_000001_initial_schema.sql`

**Tables Created:**
- `availability_patterns` - Store recurring weekly schedules

**Additions:**
- `pattern_id` column to `bookings` table

**Features:**
- Store availability as weekly patterns (e.g., "Monday 9-5")
- Avoid creating hundreds of individual slot records
- Much more efficient database usage
- Dynamic slot generation

**Example Pattern:**
\`\`\`json
{
  "Mon": [{"start": "09:00", "end": "17:00"}],
  "Tue": [{"start": "10:00", "end": "14:00"}, {"start": "15:00", "end": "18:00"}],
  "Wed": [{"start": "09:00", "end": "17:00"}]
}
\`\`\`

---

## How to Run Migrations

### Option 1: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run migrations **in order**:
   ```sql
   -- Step 1: Run initial schema
   -- Copy and paste contents of 20250106_000001_initial_schema.sql

   -- Step 2: Run OAuth connections
   -- Copy and paste contents of 20250106_000002_oauth_connections.sql

   -- Step 3: Run availability patterns
   -- Copy and paste contents of 20250106_000003_availability_patterns.sql
   ```

### Option 2: Via Supabase CLI

\`\`\`bash
# Make sure you're in the project directory
cd calendar-app

# Run all migrations
supabase db push

# Or run individual migrations
supabase db push --file supabase/migrations/20250106_000001_initial_schema.sql
supabase db push --file supabase/migrations/20250106_000002_oauth_connections.sql
supabase db push --file supabase/migrations/20250106_000003_availability_patterns.sql
\`\`\`

---

## Migration Status Check

To verify which migrations have been applied:

\`\`\`sql
-- Check if tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check for specific columns (added in migrations)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('availability_slots', 'bookings', 'oauth_connections', 'availability_patterns')
ORDER BY table_name, ordinal_position;
\`\`\`

---

## Development Mode

All tables support a dev mode user ID for local development without authentication:

**Dev User ID:** `00000000-0000-0000-0000-000000000001`

This user bypasses all auth checks and can be used for testing.

---

## Important Notes

⚠️ **Always backup your database** before running migrations in production!

✅ Migrations use `IF NOT EXISTS` checks - safe to run multiple times

✅ All migrations are idempotent - running them multiple times won't cause errors

✅ RLS policies are enabled on all tables for security

---

## Table Relationships

\`\`\`
users (1) ─── (many) availability_patterns
users (1) ─── (many) availability_slots (legacy)
users (1) ─── (many) oauth_connections
users (1) ─── (many) bookings (as admin or member)

availability_patterns (1) ─── (many) bookings
availability_slots (1) ───── (many) bookings (legacy)
bookings (1) ─────────────── (many) recordings
\`\`\`

---

## Next Steps

After running migrations:

1. **Create a dev user** (optional):
   \`\`\`sql
   INSERT INTO public.users (id, email, name, role)
   VALUES (
     '00000000-0000-0000-0000-000000000001',
     'admin@dev.local',
     'Dev Admin',
     'admin'
   );
   \`\`\`

2. **Set up OAuth credentials** in your `.env.local`:
   - Google OAuth Client ID & Secret
   - Zoom OAuth Client ID & Secret

3. **Start creating availability patterns** instead of individual slots!

---

## Troubleshooting

### Error: "relation already exists"
✅ This is normal - the migration is idempotent and skips existing tables

### Error: "permission denied"
❌ Check your RLS policies and ensure dev mode user has proper permissions

### Error: "foreign key constraint"
❌ Ensure migrations are run in the correct order (dependencies matter!)

---

## Contact

For questions or issues with migrations, check:
- Supabase Documentation: https://supabase.com/docs
- Project README: `../README.md`
