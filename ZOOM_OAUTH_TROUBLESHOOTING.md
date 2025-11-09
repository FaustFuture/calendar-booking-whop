# Zoom OAuth Troubleshooting Checklist

## Current Error
"Invalid scope. Edit on web portal"

## Step-by-Step Fix

### 1. Verify Zoom App Configuration

**In Zoom App Marketplace → Your App:**

- [ ] App Type: **General App** (User-managed) ✅
- [ ] App Status: **Activated** (not "In Development")
- [ ] Client ID matches: `NEXT_PUBLIC_ZOOM_CLIENT_ID` in your env
- [ ] Client Secret matches: `ZOOM_CLIENT_SECRET` in your env

### 2. Verify Scopes Tab

**Go to: Scopes Tab**

- [ ] `user:read:user` - **CHECKBOX MUST BE CHECKED** ✅
- [ ] `meeting:write:meeting` - **CHECKBOX MUST BE CHECKED** ✅
- [ ] Click **Save** after checking boxes
- [ ] Wait 5 minutes after saving (Zoom needs time to propagate)

### 3. Verify Redirect URI

**Go to: App Credentials Tab**

- [ ] Redirect URL for OAuth: `https://calendar-booking-whop.vercel.app/api/meetings/oauth/zoom/callback`
- [ ] Whitelist URL: `https://calendar-booking-whop.vercel.app`
- [ ] **EXACT MATCH** - no trailing slashes, correct https

### 4. Test Authorization URL

**Try this URL directly in browser (incognito mode):**
```
https://zoom.us/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=https%3A%2F%2Fcalendar-booking-whop.vercel.app%2Fapi%2Fmeetings%2Foauth%2Fzoom%2Fcallback&response_type=code&scope=user%3Aread%3Auser+meeting%3Awrite%3Ameeting&state=test123
```

Replace `YOUR_CLIENT_ID` with your actual Client ID.

### 5. Common Issues

**If still getting "Invalid scope":**

1. **Double-check scope names in Zoom app:**
   - Must be exactly: `user:read:user` (not `user:read`)
   - Must be exactly: `meeting:write:meeting` (not `meeting:write`)

2. **Try with just one scope:**
   - Test with only `user:read:user` first
   - If that works, add `meeting:write:meeting`

3. **Check if scopes are "Optional":**
   - Some scopes might be marked as optional
   - Make sure they're enabled/required, not optional

4. **Regenerate Client ID/Secret:**
   - Sometimes regenerating credentials helps
   - Update your env variables after regenerating

### 6. Alternative: Test with Zoom's OAuth Playground

Try using Zoom's OAuth testing tools to verify your app configuration is correct.

## Quick Test

1. Log out of Zoom completely
2. Open incognito window
3. Use the authorization URL
4. You should see Zoom's consent screen asking for permissions
5. If you see "Invalid scope", the scopes aren't enabled in your app

## Still Not Working?

The most common issue is that the **checkboxes in the Scopes tab are unchecked**. Even if the scopes are listed, they must be **checked/enabled** for the OAuth flow to work.

