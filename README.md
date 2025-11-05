# Calendar App

A modern calendar booking application built with Next.js 16, React 19, TypeScript, and Supabase. Features role-based access control for admins and members with availability management, booking system, and session recordings.

## Features

- **Role-Based Access Control**: Admin and member views with different permissions
- **4 Main Tabs**:
  - **Availability**: Manage available time slots (admins) or view/book slots (members)
  - **Upcoming**: View and manage future bookings
  - **Past**: Browse booking history (completed/cancelled)
  - **Recordings**: Upload and access session recordings
- **Real-Time Data**: Powered by Supabase with Row Level Security
- **Modern UI**: Dark theme with ruby accents, smooth animations

## Tech Stack

- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Supabase** - Database, authentication, and real-time subscriptions
- **Tailwind CSS 4** - Utility-first CSS framework
- **Lucide React** - Icon library
- **date-fns** - Date manipulation
- **React Hook Form + Zod** - Form handling and validation

## Getting Started

### Prerequisites

- Node.js 20+
- A Supabase account (free tier works fine)

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings > API** and copy:
   - Project URL
   - Anon/Public Key
   - Service Role Key (optional, for admin operations)

3. Update `.env.local` with your credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### 3. Create Database Tables

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase-schema.sql`
4. Paste and run it in the SQL Editor

This will create:
- `users` table with role-based access
- `availability_slots` table for time slot management
- `bookings` table for appointments
- `recordings` table for session recordings
- Row Level Security policies
- Automatic triggers and functions

### 4. Create Your First User

1. Go to **Authentication > Users** in Supabase dashboard
2. Click **Add User**
3. Enter email and password
4. After creation, note the user's UUID
5. Go to **SQL Editor** and run:

```sql
-- Make yourself an admin
UPDATE public.users
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

### 5. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with your created user.

## Project Structure

```
calendar-app/
├── app/
│   ├── dashboard/
│   │   ├── components/
│   │   │   ├── DashboardTabs.tsx    # Main tab navigation
│   │   │   └── tabs/
│   │   │       ├── AvailabilityTab.tsx
│   │   │       ├── UpcomingTab.tsx
│   │   │       ├── PastTab.tsx
│   │   │       └── RecordingsTab.tsx
│   │   └── page.tsx
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
├── lib/
│   ├── supabase/
│   │   ├── client.ts              # Client-side Supabase client
│   │   └── server.ts              # Server-side Supabase client
│   └── types/
│       └── database.ts            # TypeScript types
├── supabase-schema.sql            # Database schema
└── .env.local                     # Environment variables
```

## Database Schema

### Users
- Extends Supabase auth users
- Roles: `admin` or `member`
- Automatically created on signup via trigger

### Availability Slots
- Created by admins
- Contains start/end time, availability status
- Members can view and book available slots

### Bookings
- Links members with time slots
- Status: `upcoming`, `completed`, or `cancelled`
- Includes meeting URLs and notes

### Recordings
- Attached to bookings
- Contains video URL, title, duration, file size
- Access controlled by booking ownership

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Design System

- **Dark Theme**: Sophisticated Zinc palette (background: #18181b, cards: #27272a)
- **Primary Color**: Ruby (#f43f5e)
- **Tailwind CSS 4**: CSS-first configuration with design tokens
- **Typography**: Modular scale with system fonts
- **Components**: Reusable button variants, card styles, and input components
- **Animations**: Smooth fade-in effects

## Role Permissions

### Admin
- Create, edit, delete availability slots
- View all bookings (upcoming and past)
- Create bookings for members
- Upload and manage recordings
- Cancel any booking

### Member
- View available time slots
- Book available slots
- View their own bookings
- Access recordings for their bookings
- Cancel their own bookings

## Next Steps

- [ ] Add authentication pages (sign in/sign up)
- [ ] Create booking creation/edit forms
- [ ] Add API routes for CRUD operations
- [ ] Implement email notifications
- [ ] Add calendar view (monthly/weekly)
- [ ] File upload for recordings (Supabase Storage)
- [ ] Real-time updates with Supabase subscriptions
- [ ] Mobile responsive optimizations
