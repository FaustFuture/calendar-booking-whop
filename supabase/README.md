# Supabase Configuration

This folder contains all Supabase-related configuration and database migrations for the Calendar App.

## 📁 Folder Structure

\`\`\`
supabase/
├── migrations/           # Database schema migrations (timestamped)
│   ├── README.md        # Detailed migration documentation
│   ├── 20250106_000001_initial_schema.sql
│   ├── 20250106_000002_oauth_connections.sql
│   └── 20250106_000003_availability_patterns.sql
└── README.md            # This file
\`\`\`

## 🚀 Quick Start

### 1. Set Up Supabase Project

1. Create a project at [supabase.com](https://supabase.com)
2. Note your project URL and anon key
3. Add to `.env.local`:
   \`\`\`env
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   \`\`\`

### 2. Run Database Migrations

Navigate to your Supabase dashboard → SQL Editor, then run each migration file in order:

1. ✅ `20250106_000001_initial_schema.sql` - Core tables
2. ✅ `20250106_000002_oauth_connections.sql` - OAuth support
3. ✅ `20250106_000003_availability_patterns.sql` - Patterns (recommended)

**See `migrations/README.md` for detailed instructions.**

### 3. Create Dev User (Optional)

For local development without authentication:

\`\`\`sql
INSERT INTO public.users (id, email, name, role)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin@dev.local',
  'Dev Admin',
  'admin'
);
\`\`\`

## 📊 Database Schema Overview

### Core Tables

| Table | Purpose | Records |
|-------|---------|---------|
| `users` | User profiles (admin/member) | One per user |
| `availability_patterns` | Weekly recurring schedules | Few (recommended) |
| `availability_slots` | Individual time slots | Many (legacy) |
| `bookings` | Booking records | One per booking |
| `recordings` | Meeting recordings | One per recording |
| `oauth_connections` | Google/Zoom tokens | Max 2 per user |

### Recommended Approach

**Use `availability_patterns`** instead of creating hundreds of `availability_slots`:

- ❌ Old way: Create 416 slot records for 4 weeks
- ✅ New way: Create 1 pattern record that generates slots dynamically

## 🔒 Security Features

- **Row Level Security (RLS)** enabled on all tables
- **Dev mode support** for local development
- **OAuth token encryption** (handled by Supabase)
- **Automatic user profile creation** on signup

## 🛠️ Maintenance

### Check Migration Status

\`\`\`sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
\`\`\`

### Backup Database

\`\`\`bash
# Via Supabase CLI
supabase db dump > backup.sql

# Or use Supabase dashboard → Database → Backups
\`\`\`

### Reset Database (Development Only!)

⚠️ **WARNING: This deletes all data!**

\`\`\`sql
-- Drop all tables
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then re-run all migrations
\`\`\`

## 📚 Documentation

- **Detailed Migration Guide**: See `migrations/README.md`
- **Supabase Docs**: https://supabase.com/docs
- **RLS Policies**: https://supabase.com/docs/guides/auth/row-level-security

## 🤝 Contributing

When adding new migrations:

1. Use timestamp format: `YYYYMMDD_HHMMSS_description.sql`
2. Add to `migrations/` folder
3. Update `migrations/README.md`
4. Test on a dev database first!
5. Use `IF NOT EXISTS` for idempotency

## 📞 Support

For issues related to:
- **Migrations**: Check `migrations/README.md`
- **Authentication**: Supabase Auth docs
- **RLS Policies**: Supabase RLS docs
- **General**: Project root `README.md`
