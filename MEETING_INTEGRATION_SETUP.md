# Meeting Integration Setup Guide

This guide will help you set up Google Meet and Zoom integration for your calendar app.

## Overview

The calendar app supports automatic meeting link generation for:
- **Google Meet** - via Google Calendar API
- **Zoom** - via Zoom API
- Manual meeting links
- Physical location addresses

## Prerequisites

- Node.js and npm installed
- Supabase account and project
- Google Cloud Console account (for Google Meet)
- Zoom App Marketplace account (for Zoom)

---

## Database Setup

### 1. Run the Migration

Execute the migration SQL to add meeting support to your database:

```bash
# Connect to your Supabase SQL Editor
# Navigate to: https://app.supabase.com/project/YOUR_PROJECT/sql

# Run the migration file
supabase-migrations/001_add_meeting_support.sql
```

This will:
- Add `meeting_type` and `meeting_config` columns to `availability_slots` table
- Create `oauth_connections` table for storing OAuth tokens
- Add necessary indexes and RLS policies
- Create helper functions for connection management

### 2. Verify Database Schema

After running the migration, verify these tables exist:
- `availability_slots` (with new columns: `meeting_type`, `meeting_config`)
- `oauth_connections` (new table)

---

## Google Meet Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name your project (e.g., "Calendar App Meetings")
4. Click **Create**

### Step 2: Enable APIs

1. In your project, navigate to **APIs & Services** → **Library**
2. Search for and enable:
   - **Google Calendar API**
   - **Google+ API** (for user info)

### Step 3: Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in required information:
   - **App name**: Your calendar app name
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click **Save and Continue**
5. Add scopes:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/userinfo.email`
6. Click **Save and Continue**
7. Add test users (your email addresses for testing)
8. Click **Save and Continue**

### Step 4: Create OAuth Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Choose **Web application**
4. Configure:
   - **Name**: "Calendar App Web Client"
   - **Authorized JavaScript origins**:
     - `http://localhost:3000` (for development)
     - `https://yourdomain.com` (for production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/meetings/oauth/google/callback` (development)
     - `https://yourdomain.com/api/meetings/oauth/google/callback` (production)
5. Click **Create**
6. **Save the Client ID and Client Secret** - you'll need these for your `.env.local`

---

## Zoom Setup

### Step 1: Create Zoom App

1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Click **Develop** → **Build App**
3. Choose **OAuth** app type
4. **IMPORTANT**: Choose **User-managed** app type (not Account-level)
   - User-managed apps allow individual users to authorize the app
   - Account-level apps require admin/owner approval and may have different scope requirements
5. Click **Create**
6. Fill in basic information:
   - **App name**: Your calendar app name
   - **Short description**: Brief description
   - **Developer contact**: Your information
7. Click **Continue**

### Step 2: Configure App Credentials

1. In the **App Credentials** tab, note:
   - **Client ID**
   - **Client Secret** (reveal and copy)
2. Add **Redirect URL for OAuth**:
   - Development: `http://localhost:3000/api/meetings/oauth/zoom/callback`
   - Production: `https://yourdomain.com/api/meetings/oauth/zoom/callback`
3. Add **Whitelist URL**:
   - Development: `http://localhost:3000`
   - Production: `https://yourdomain.com`

### Step 3: Configure Scopes

1. Navigate to the **Scopes** tab
2. **Enable** (check the boxes for) the following scopes:
   - `meeting:write:meeting` - Create a meeting for a user
   - `user:read:user` - View a user
   - (Optional) `cloud_recording:read:recording` - View recordings (if you need recording access)
3. **Important**: Make sure the checkboxes are **checked/enabled**, not just added to the list
4. Click **Continue**

**Note**: These are user-level scopes that work with any Zoom account role (Owner, Admin, or Member). If you're using an Account-level app, you may need additional permissions or admin approval.

### Step 4: Activation

1. Complete all required sections
2. Click **Activate** when ready
3. For development, your app is automatically in development mode

**Important Notes:**
- **User Role**: Any Zoom user (Owner, Admin, or Member) can authorize a User-managed OAuth app
- **Account Restrictions**: Some Zoom accounts may have restrictions on installing apps - check with your Zoom account admin if you encounter authorization issues
- **Scope Permissions**: The scopes `meeting:write:meeting` and `user:read:user` are user-level scopes and don't require special account permissions

---

## Environment Variables Setup

### 1. Create/Update `.env.local`

Add the following environment variables to your `.env.local` file:

```env
# Existing Supabase variables
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Google Meet Integration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/meetings/oauth/google/callback

# Zoom Integration
NEXT_PUBLIC_ZOOM_CLIENT_ID=your-zoom-client-id
ZOOM_CLIENT_SECRET=your-zoom-client-secret
ZOOM_REDIRECT_URI=http://localhost:3000/api/meetings/oauth/zoom/callback
```

### 2. Production Environment Variables

For production (Vercel/Netlify/etc.), add these same variables to your hosting platform:

**Important Notes:**
- Update redirect URIs to use your production domain
- Keep Client Secrets secure - never commit them to version control
- Use your hosting platform's environment variable management

---

## Testing the Integration

### 1. Start Development Server

```bash
npm run dev
```

### 2. Navigate to Integrations Page

Go to: `http://localhost:3000/dashboard/settings/integrations`

### 3. Connect Google Account

1. Click **Connect Google Account**
2. Sign in with your Google account
3. Authorize the requested permissions
4. You should be redirected back with a success message

### 4. Connect Zoom Account

1. Click **Connect Zoom Account**
2. Sign in with your Zoom account
3. Authorize the requested permissions
4. You should be redirected back with a success message

### 5. Create a Time Slot with Meeting Link

1. Navigate to the dashboard
2. Click **Create Time Slot**
3. In Step 1, select **Google Meet** or **Zoom** as the meeting type
4. You should see "Google Account Connected" or "Zoom Account Connected"
5. Complete the rest of the form
6. Create the slot

### 6. Test Booking Creation

1. Create a booking for one of your slots
2. Check the booking details
3. The `meeting_url` field should contain a generated meeting link

---

## Troubleshooting

### Google OAuth Issues

**Error: "Access blocked: Calendar App has not completed verification"**
- This is normal for apps in development
- Add test users in Google Cloud Console → OAuth consent screen
- For production, submit your app for verification

**Error: "redirect_uri_mismatch"**
- Verify your redirect URI in `.env.local` matches exactly what's in Google Cloud Console
- Check for trailing slashes and http vs https

### Zoom OAuth Issues

**Error: "Invalid redirect_uri"**
- Verify the redirect URI in `.env.local` matches the Zoom App configuration
- Make sure the domain is whitelisted in Zoom App settings

**Error: "Invalid client"**
- Double-check your Client ID and Client Secret
- Ensure there are no extra spaces or newlines

### Meeting Generation Issues

**Error: "No active connection"**
- User needs to connect their account in Settings → Integrations
- Check if the OAuth token has expired (reconnect the account)

**Error: "Failed to create meeting"**
- Check API permissions/scopes
- Verify the user's account has access to create meetings
- Check server logs for detailed error messages

### Database Issues

**Error: Column does not exist**
- Ensure you ran the migration script
- Verify columns exist: `meeting_type`, `meeting_config` in `availability_slots`
- Verify `oauth_connections` table exists

---

## Security Best Practices

1. **Never commit secrets**: Use `.env.local` for local development, never commit to Git
2. **Use environment variables**: Store all sensitive data in environment variables
3. **Rotate tokens**: Implement token refresh logic (already included)
4. **Limit scopes**: Only request necessary OAuth scopes
5. **Validate inputs**: API routes validate all inputs before processing
6. **Use HTTPS**: Always use HTTPS in production for OAuth callbacks
7. **Implement RLS**: Row Level Security policies are in place for `oauth_connections`

---

## OAuth Token Management

### Token Storage

Tokens are stored in the `oauth_connections` table with:
- `access_token` - Current access token
- `refresh_token` - Used to get new access tokens
- `expires_at` - Token expiration timestamp
- `is_active` - Connection status

### Token Refresh

The system automatically refreshes tokens when:
- Token expires within 5 minutes
- Before making API calls

This is handled in `lib/services/meetingService.ts` in the `ensureValidToken()` method.

### Revoking Access

Users can disconnect their accounts at any time via Settings → Integrations. This will:
1. Revoke the token with the provider (Google/Zoom)
2. Mark the connection as inactive in the database

---

## Architecture Overview

```
Frontend (UI)
├── ConditionalSelect Component (Step 1 in wizard)
│   └── Shows OAuth connection status
│   └── Handles OAuth popup flow
│
├── Settings/Integrations Page
│   └── Manage OAuth connections
│   └── Connect/Disconnect accounts
│
Backend (API Routes)
├── /api/meetings/oauth/google
│   └── Initiate Google OAuth flow
├── /api/meetings/oauth/google/callback
│   └── Handle OAuth callback
├── /api/meetings/oauth/zoom
│   └── Initiate Zoom OAuth flow
├── /api/meetings/oauth/zoom/callback
│   └── Handle OAuth callback
├── /api/meetings/generate
│   └── Generate meeting links
├── /api/meetings/connections
│   └── Get user's OAuth connections
├── /api/meetings/disconnect
│   └── Disconnect OAuth provider
│
Services Layer
├── googleMeetService.ts
│   └── Google OAuth & Calendar API
├── zoomService.ts
│   └── Zoom OAuth & Meetings API
├── meetingService.ts (Facade)
│   └── Unified interface
│   └── Token management
│   └── Database integration
│
Database
├── availability_slots
│   └── meeting_type
│   └── meeting_config
├── oauth_connections
│   └── OAuth tokens & metadata
└── bookings
    └── meeting_url (generated link)
```

---

## API Reference

### Generate Meeting Link

```typescript
POST /api/meetings/generate
Content-Type: application/json

{
  "provider": "google" | "zoom",
  "title": "Meeting Title",
  "description": "Optional description",
  "startTime": "2024-01-01T10:00:00Z",
  "endTime": "2024-01-01T11:00:00Z",
  "attendeeEmails": ["user1@example.com", "user2@example.com"],
  "timezone": "America/New_York" // optional
}

Response:
{
  "success": true,
  "meetingUrl": "https://meet.google.com/abc-defg-hij",
  "meetingId": "unique-meeting-id",
  "provider": "google",
  "hostUrl": "https://zoom.us/s/123456789?pwd=abc", // Zoom only
  "password": "123456" // Zoom only
}
```

### Check Connection Status

```typescript
GET /api/meetings/generate?provider=google

Response:
{
  "provider": "google",
  "connected": true
}
```

### Get All Connections

```typescript
GET /api/meetings/connections

Response:
{
  "connections": [
    {
      "id": "uuid",
      "provider": "google",
      "provider_email": "user@gmail.com",
      "is_active": true,
      "created_at": "2024-01-01T00:00:00Z",
      "last_used_at": "2024-01-02T00:00:00Z"
    }
  ]
}
```

### Disconnect Provider

```typescript
POST /api/meetings/disconnect
Content-Type: application/json

{
  "provider": "google" | "zoom"
}

Response:
{
  "success": true
}
```

---

## Next Steps

1. **Test in development**: Verify everything works locally
2. **Add production URLs**: Update OAuth settings with production domains
3. **Deploy**: Deploy to your hosting platform
4. **Add environment variables**: Configure production environment variables
5. **Verify Google App**: Submit for verification if needed (for production)
6. **Monitor**: Check logs for any OAuth or API issues

---

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review server logs for detailed error messages
3. Verify all environment variables are set correctly
4. Ensure OAuth configurations match exactly
5. Check that database migrations ran successfully

For Google Meet issues:
- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [Google OAuth Documentation](https://developers.google.com/identity/protocols/oauth2)

For Zoom issues:
- [Zoom API Documentation](https://developers.zoom.us/docs/api/)
- [Zoom OAuth Documentation](https://developers.zoom.us/docs/integrations/oauth/)
