# Fix: "Access blocked: App has not completed Google verification"

## Problem

You're seeing this error:
- **Error 403: access_denied**
- "Access blocked: calendar-booking-whop.vercel.app has not completed the Google verification process"
- "This app is currently being tested and can only be accessed by developer-approved testers"

## Why This Happens

Google requires apps to be verified before they can be used by anyone. For apps in **testing mode**, you must add test users who can access the app.

## Solution: Add Test Users (Quick Fix)

### Step 1: Go to Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **OAuth consent screen**

### Step 2: Add Test Users

1. Scroll down to the **Test users** section
2. Click **+ ADD USERS**
3. Add the email addresses that will use the app:
   - Your admin email (the one you'll use to connect Google)
   - Any other emails that need to create bookings
4. Click **ADD**

### Step 3: Try Again

1. Go back to your app
2. Click "Connect Google Account"
3. Sign in with one of the test users you added
4. It should work now!

## Important Notes

### For Development/Testing
- **Test users only**: Only emails you add as test users can connect
- **No verification needed**: You can use the app immediately with test users
- **Limited to 100 test users**: Google allows up to 100 test users

### For Production (Public Use)
If you need anyone to be able to use your app:

1. **Submit for Verification**:
   - Go to OAuth consent screen
   - Click "PUBLISH APP" or "Submit for verification"
   - Complete Google's verification process (can take days/weeks)
   - Requires privacy policy, terms of service, etc.

2. **Or Keep in Testing Mode**:
   - Add all users as test users (up to 100)
   - Works fine for small teams/internal use

## Quick Checklist

- [ ] Go to Google Cloud Console
- [ ] Navigate to OAuth consent screen
- [ ] Add test users (your email + any other users)
- [ ] Try connecting again with a test user email
- [ ] Should work now!

## Alternative: Use Different Google Account

If you can't add test users immediately:
1. Use a Google account that's already added as a test user
2. Or add your current email as a test user first

## Still Not Working?

1. **Check the email**: Make sure you're signing in with an email that's in the test users list
2. **Wait a few minutes**: Changes to test users can take a minute to propagate
3. **Check OAuth consent screen status**: Should show "Testing" or "In production"
4. **Verify redirect URI**: Make sure your production redirect URI is added in Google Cloud Console:
   - `https://calendar-booking-whop.vercel.app/api/meetings/oauth/google/callback`

## Production Redirect URI

Make sure you've added your Vercel domain to Google Cloud Console:

1. Go to **APIs & Services** → **Credentials**
2. Click your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, add:
   - `https://calendar-booking-whop.vercel.app/api/meetings/oauth/google/callback`
4. Click **SAVE**

## Summary

**Quick Fix**: Add your email (and any other users) as test users in Google Cloud Console → OAuth consent screen → Test users.

**Long-term**: Submit for verification if you need public access, or keep adding test users for internal use.


