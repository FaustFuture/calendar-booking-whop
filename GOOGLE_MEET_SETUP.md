# Google Meet OAuth Setup Guide

This guide will help you set up Google Meet OAuth integration to fix the `redirect_uri_mismatch` error.

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name your project (e.g., "Calendar Booking App")
4. Click **Create**

## Step 2: Enable Required APIs

1. In your project, navigate to **APIs & Services** → **Library**
2. Search for and enable:
   - **Google Calendar API** (required for creating Google Meet links)
   - **Google+ API** or **People API** (for user info)

## Step 3: Configure OAuth Consent Screen

1. Navigate to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type (unless you have a Google Workspace)
3. Fill in required information:
   - **App name**: Your app name
   - **User support email**: Your email
   - **Developer contact**: Your email
4. Click **Save and Continue**
5. **Add Scopes**:
   - Click **Add or Remove Scopes**
   - Add these scopes:
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/userinfo.email`
   - Click **Update** → **Save and Continue**
6. **Add Test Users** (for development):
   - Add your email address(es) that will test the integration
   - Click **Save and Continue**
7. Review and click **Back to Dashboard**

## Step 4: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. If prompted, configure the OAuth consent screen first (you should have done this in Step 3)
4. Choose **Web application** as the application type
5. Configure:
   - **Name**: "Calendar App Web Client" (or any name you prefer)
   
   - **Authorized JavaScript origins**:
     - For development: `http://localhost:3000`
     - For production: `https://yourdomain.com` (add your actual domain)
   
   - **Authorized redirect URIs** (THIS IS CRITICAL - must match exactly):
     - For development: `http://localhost:3000/api/meetings/oauth/google/callback`
     - For production: `https://yourdomain.com/api/meetings/oauth/google/callback`
   
   ⚠️ **IMPORTANT**: 
   - The redirect URI must match EXACTLY (including http vs https, trailing slashes, etc.)
   - Copy the exact URI from your environment variable
   - No trailing slashes unless your env variable has one

6. Click **Create**
7. **Copy the Client ID and Client Secret** - you'll need these next

## Step 5: Set Environment Variables

Create or update your `.env.local` file in the project root:

```env
# Google Meet Integration
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/api/meetings/oauth/google/callback
```

**Important Notes:**
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID` must start with `NEXT_PUBLIC_` because it's used in client-side code
- `GOOGLE_CLIENT_SECRET` should NOT have `NEXT_PUBLIC_` prefix (keep it server-side only)
- The redirect URI must match EXACTLY what you configured in Google Cloud Console
- For production, use `https://yourdomain.com/api/meetings/oauth/google/callback`

## Step 6: Verify Configuration

### Check Your Current Setup

1. **Check your `.env.local` file**:
   ```bash
   # Make sure these are set:
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/meetings/oauth/google/callback
   ```

2. **Verify Google Cloud Console**:
   - Go to **APIs & Services** → **Credentials**
   - Click on your OAuth 2.0 Client ID
   - Check that the **Authorized redirect URIs** includes:
     - `http://localhost:3000/api/meetings/oauth/google/callback` (for dev)
     - `https://yourdomain.com/api/meetings/oauth/google/callback` (for prod)

3. **Restart your development server** after updating `.env.local`:
   ```bash
   npm run dev
   ```

## Step 7: Test the Connection

1. Navigate to your app's dashboard
2. Go to create a time slot or availability pattern
3. Select **Google Meet** as the meeting type
4. Click **Connect Google Account**
5. You should be redirected to Google's sign-in page
6. After authorizing, you should be redirected back to your app

## Common Issues & Solutions

### Error: "redirect_uri_mismatch"

**Cause**: The redirect URI in your `.env.local` doesn't match what's configured in Google Cloud Console.

**Solution**:
1. Check your `.env.local` file - copy the exact `GOOGLE_REDIRECT_URI` value
2. Go to Google Cloud Console → Credentials → Your OAuth Client
3. Make sure the **Authorized redirect URIs** includes the EXACT same URI
4. Common mistakes:
   - Missing `/callback` at the end
   - Using `https` instead of `http` (or vice versa) for localhost
   - Trailing slashes
   - Wrong port number
   - Wrong path (`/api/meetings/oauth/google/callback`)

### Error: "Access blocked: This app's request is invalid"

**Cause**: App is in testing mode and your email isn't in the test users list.

**Solution**:
1. Go to Google Cloud Console → OAuth consent screen
2. Scroll to **Test users**
3. Click **Add Users**
4. Add your email address
5. Try connecting again

### Error: "Invalid client"

**Cause**: Client ID or Client Secret is incorrect.

**Solution**:
1. Double-check your `.env.local` file
2. Make sure there are no extra spaces or quotes
3. Copy the Client ID and Secret directly from Google Cloud Console
4. Restart your dev server after updating

### Environment Variables Not Loading

**Solution**:
1. Make sure `.env.local` is in the project root (same level as `package.json`)
2. Restart your development server after changing `.env.local`
3. Never commit `.env.local` to git (it should be in `.gitignore`)

## Production Setup

For production deployment:

1. **Update Google Cloud Console**:
   - Add your production domain to **Authorized JavaScript origins**
   - Add your production redirect URI to **Authorized redirect URIs**:
     - `https://yourdomain.com/api/meetings/oauth/google/callback`

2. **Update Environment Variables** (in Vercel/Netlify/etc.):
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=https://yourdomain.com/api/meetings/oauth/google/callback
   ```

3. **Submit for Verification** (if needed):
   - If your app will be used by external users, you may need to submit for Google verification
   - For internal/testing use, you can keep it in testing mode with test users

## Quick Checklist

- [ ] Google Cloud Project created
- [ ] Google Calendar API enabled
- [ ] OAuth consent screen configured
- [ ] OAuth 2.0 credentials created
- [ ] Redirect URI added to Google Cloud Console (exact match)
- [ ] Environment variables set in `.env.local`
- [ ] Development server restarted
- [ ] Test user added (if in testing mode)
- [ ] Connection tested successfully

## Need Help?

If you're still having issues:

1. Check the browser console for any errors
2. Check your server logs for detailed error messages
3. Verify all environment variables are loaded (check server logs)
4. Double-check the redirect URI matches exactly in both places
5. Make sure you're using the correct Google account (test user)

The redirect URI format should be:
- Development: `http://localhost:3000/api/meetings/oauth/google/callback`
- Production: `https://yourdomain.com/api/meetings/oauth/google/callback`


