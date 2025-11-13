# Permanent Fix: Publish Your Google OAuth App

This guide will help you publish your app so it works for **all users** without needing to add test users.

## Overview

By default, Google OAuth apps are in **"Testing"** mode, which restricts access to test users only. To make it work for everyone, you need to **publish** your app.

## Step-by-Step Guide

### Step 1: Go to OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Navigate to **APIs & Services** → **OAuth consent screen**

### Step 2: Complete Required Information

Make sure all required fields are filled:

1. **User Type**: Should be "External" (unless you have Google Workspace)
2. **App information**:
   - **App name**: Your app name (e.g., "Calendar Booking App")
   - **User support email**: Your email
   - **App logo** (optional but recommended)
   - **App domain**: `calendar-booking-whop.vercel.app`
   - **Application home page**: `https://calendar-booking-whop.vercel.app`
   - **Privacy policy link**: **REQUIRED** - You need to create a privacy policy page
   - **Terms of service link**: **REQUIRED** - You need to create a terms of service page
   - **Authorized domains**: Add `vercel.app` and your custom domain if you have one

3. **Scopes**: Should include:
   - `https://www.googleapis.com/auth/calendar.events`
   - `https://www.googleapis.com/auth/userinfo.email`

4. **Test users**: You can remove test users after publishing (optional)

### Step 3: Create Privacy Policy & Terms of Service Pages

**You MUST have these pages** before you can publish:

#### Option A: Create Simple Pages in Your App

Create these pages in your Next.js app:

1. **Create `app/privacy/page.tsx`**:
```tsx
export default function PrivacyPage() {
  return (
    <div className="container mx-auto p-8">
      <h1>Privacy Policy</h1>
      <p>Last updated: {new Date().toLocaleDateString()}</p>
      <p>
        This app uses Google Calendar API to create meeting links. 
        We only access calendar events and user email information.
        We do not store or share your personal information.
      </p>
      {/* Add your full privacy policy here */}
    </div>
  )
}
```

2. **Create `app/terms/page.tsx`**:
```tsx
export default function TermsPage() {
  return (
    <div className="container mx-auto p-8">
      <h1>Terms of Service</h1>
      <p>Last updated: {new Date().toLocaleDateString()}</p>
      <p>
        By using this service, you agree to our terms of service.
        {/* Add your full terms here */}
      </p>
    </div>
  )
}
```

#### Option B: Use External Services

You can also host these on external services:
- [Privacy Policy Generator](https://www.privacypolicygenerator.info/)
- [Terms of Service Generator](https://www.termsofservicegenerator.net/)

Then add the URLs to your Google Cloud Console.

### Step 4: Publish Your App

1. In **OAuth consent screen**, scroll to the bottom
2. You should see a section showing your app status (likely "Testing")
3. Click **"PUBLISH APP"** button
4. Confirm the action

### Step 5: Verification Requirements

After publishing, Google may require verification if you're using:
- **Sensitive scopes** (like accessing user data)
- **Restricted scopes** (like `drive.meet.readonly` for recordings)

For basic Google Calendar access, verification is usually **not required** for:
- Apps with fewer than 100 users
- Apps using only non-sensitive scopes
- Internal/private apps

### Step 6: Update Environment Variables

Make sure your production environment variables are set in Vercel:

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Ensure these are set:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret
   GOOGLE_REDIRECT_URI=https://calendar-booking-whop.vercel.app/api/meetings/oauth/google/callback
   ```

### Step 7: Verify Redirect URI

1. Go to **APIs & Services** → **Credentials**
2. Click your OAuth 2.0 Client ID
3. Under **Authorized redirect URIs**, ensure you have:
   - `https://calendar-booking-whop.vercel.app/api/meetings/oauth/google/callback`
4. Click **SAVE**

## What Happens After Publishing

✅ **Anyone can use your app** - No need to add test users
✅ **No verification needed** - For basic scopes (Calendar API)
⚠️ **May need verification** - If using sensitive/restricted scopes or >100 users

## If Verification is Required

If Google asks for verification:

1. **Complete the verification form**:
   - Explain how you use the scopes
   - Provide privacy policy and terms links
   - Answer security questions

2. **Provide required documentation**:
   - Privacy policy
   - Terms of service
   - Video demonstration (sometimes required)
   - Security practices

3. **Wait for review** (can take 1-4 weeks)

## Quick Checklist

- [ ] OAuth consent screen fully filled out
- [ ] Privacy policy page created and accessible
- [ ] Terms of service page created and accessible
- [ ] App domain and authorized domains configured
- [ ] Scopes are correct
- [ ] Production redirect URI added
- [ ] Environment variables set in Vercel
- [ ] Click "PUBLISH APP" button
- [ ] Test with a new Google account (not in test users)

## Testing After Publishing

1. Remove your email from test users (optional)
2. Try connecting with a Google account that was NOT a test user
3. It should work without any restrictions!

## Troubleshooting

### "App is still in testing mode"
- Make sure you clicked "PUBLISH APP" and confirmed
- Wait a few minutes for changes to propagate
- Check the status at the top of OAuth consent screen

### "Verification required"
- For basic Calendar API access, this shouldn't be needed
- If prompted, complete the verification form
- This is normal for apps with many users or sensitive scopes

### "Still getting access denied"
- Make sure redirect URI matches exactly
- Check environment variables are set correctly
- Verify the app is actually published (not just saved)

## Summary

**Permanent Fix**: Publish your app in Google Cloud Console → OAuth consent screen → Click "PUBLISH APP"

**Requirements**:
- Privacy policy URL
- Terms of service URL
- All required fields filled
- Production redirect URI configured

Once published, anyone can use your app without being added as a test user!

