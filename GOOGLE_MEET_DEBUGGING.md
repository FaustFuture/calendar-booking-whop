# Google Meet Link Generation Debugging Guide

If Google Meet links are showing as `❌` when bookings are created, follow this debugging guide.

## Common Issues

### 1. No OAuth Connection

**Symptom**: Meeting URL is `❌`, error in logs: "Google Meet not connected"

**Solution**:
1. Go to Settings → Integrations in your dashboard
2. Click "Connect Google Account"
3. Complete the OAuth flow
4. Verify the connection shows as "Connected"

**Check**:
```sql
-- Run in Supabase SQL Editor
SELECT * FROM oauth_connections 
WHERE provider = 'google' 
AND is_active = true;
```

### 2. OAuth Token Expired

**Symptom**: Connection exists but meeting generation fails

**Solution**:
1. Disconnect and reconnect your Google account
2. The system should auto-refresh tokens, but if it fails, reconnect

**Check logs for**:
- "Token expired"
- "Failed to refresh access token"
- "NO_REFRESH_TOKEN"

### 3. Admin User Not Found

**Symptom**: Error: "No admin found in company for meeting generation"

**Solution**:
- The system needs an admin user to generate meetings
- If you're creating a booking as a member/guest, it tries to find any admin
- Make sure at least one admin user exists in the system

**Check**:
```sql
-- Run in Supabase SQL Editor
SELECT id, email, role FROM users WHERE role = 'admin';
```

### 4. Google Calendar API Permissions

**Symptom**: Meeting creation fails with API error

**Possible causes**:
- Google Calendar API not enabled in Google Cloud Console
- OAuth scopes not granted
- Insufficient permissions

**Solution**:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Verify **Google Calendar API** is enabled
3. Check OAuth consent screen has these scopes:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/userinfo.email`
4. Re-authorize the connection to grant updated scopes

### 5. Missing Environment Variables

**Symptom**: Error: "Google OAuth is not configured"

**Solution**:
Check your `.env.local` has:
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/meetings/oauth/google/callback
```

**Important**: Restart your dev server after updating `.env.local`

## Debugging Steps

### Step 1: Check Server Logs

When creating a booking, check your server console for:
- `🚀 Starting meeting link generation...`
- `🔍 Checking Google Meet OAuth connection...`
- `✅ Google Meet OAuth connection verified`
- `🔗 Mapping meeting type to provider...`
- `❌ Failed to generate meeting link...`

### Step 2: Verify OAuth Connection

1. Check if connection exists:
   ```sql
   SELECT * FROM oauth_connections 
   WHERE provider = 'google' 
   AND is_active = true;
   ```

2. Check connection details:
   - `user_id` should match an admin user
   - `is_active` should be `true`
   - `expires_at` should be in the future

### Step 3: Test OAuth Connection

1. Go to Settings → Integrations
2. If Google shows as "Not Connected", click "Connect"
3. Complete the OAuth flow
4. Verify it shows as "Connected"

### Step 4: Check Pattern/Slot Configuration

Verify the availability pattern has:
- `meeting_type = 'google_meet'`
- `meeting_config.requiresGeneration = true`

```sql
-- Check pattern
SELECT id, title, meeting_type, meeting_config 
FROM availability_patterns 
WHERE id = 'your-pattern-id';
```

### Step 5: Test Meeting Generation Directly

You can test the meeting generation API directly:

```bash
curl -X POST http://localhost:3000/api/meetings/generate \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "google",
    "title": "Test Meeting",
    "startTime": "2025-01-15T10:00:00Z",
    "endTime": "2025-01-15T11:00:00Z",
    "attendeeEmails": ["your-email@example.com"],
    "companyId": "your-company-id"
  }'
```

## Quick Checklist

- [ ] Google OAuth connection exists and is active
- [ ] Admin user exists in the system
- [ ] Environment variables are set correctly
- [ ] Google Calendar API is enabled
- [ ] OAuth scopes are granted
- [ ] Pattern has `meeting_type = 'google_meet'`
- [ ] Pattern has `requiresGeneration = true`
- [ ] Server logs show no errors during booking creation

## Getting More Details

To see detailed error information:

1. **Check server console logs** when creating a booking
2. **Look for these log messages**:
   - `❌ Failed to generate meeting link:` - Shows the full error
   - `❌ Google Meet OAuth connection not found` - Connection issue
   - `❌ OAuth connection issue` - Token/connection problem
   - `❌ Meeting creation failed` - API call failed

3. **Check the error message** in the logs - it will tell you exactly what failed

## Common Error Messages

| Error Message | Cause | Solution |
|--------------|-------|----------|
| "Google Meet not connected" | No OAuth connection | Connect Google account in Settings |
| "No admin found" | No admin user exists | Ensure at least one admin user exists |
| "Token expired" | OAuth token expired | Reconnect Google account |
| "Failed to create Google Meet" | API call failed | Check Google Calendar API permissions |
| "Google OAuth is not configured" | Missing env vars | Set environment variables |

## Still Having Issues?

1. Check all server logs when creating a booking
2. Verify the OAuth connection in the database
3. Test the OAuth connection manually in Settings
4. Check Google Cloud Console for API errors
5. Verify environment variables are loaded (check server startup logs)

