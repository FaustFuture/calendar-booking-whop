# Zoom Server-to-Server OAuth Setup

## Overview

Zoom integration now uses **Server-to-Server OAuth**, which means:
- ✅ No user interaction required
- ✅ No "Connect Zoom Account" button needed
- ✅ Tokens generated automatically using account credentials
- ✅ Works immediately after configuration

## Setup Steps

### 1. Create Server-to-Server OAuth App in Zoom

1. Go to [Zoom App Marketplace](https://marketplace.zoom.us/)
2. Click **Develop** → **Build App**
3. Choose **Server-to-Server OAuth App** (NOT General App)
4. Click **Create**
5. Fill in app information and click **Continue**

### 2. Configure Scopes

In the **Scopes** tab, enable (check the boxes for):
- `meeting:write:admin` - Create meetings (admin-level)
- `user:read:admin` - Read user information (admin-level)

**Note**: Server-to-Server uses admin-level scopes, not user-level scopes.

### 3. Get Credentials

After activating the app, go to **App Credentials** tab:
- **Account ID** - Copy this
- **Client ID** - Copy this  
- **Client Secret** - Reveal and copy this

### 4. Set Environment Variables

Add these to your `.env.local` (and Vercel environment variables):

```env
# Zoom Server-to-Server OAuth
ZOOM_ACCOUNT_ID=your-account-id
ZOOM_CLIENT_ID=your-client-id
ZOOM_CLIENT_SECRET=your-client-secret
```

**Important**: 
- Remove `NEXT_PUBLIC_ZOOM_CLIENT_ID` (not needed for Server-to-Server)
- Remove `ZOOM_REDIRECT_URI` (not needed for Server-to-Server)
- Use `ZOOM_CLIENT_ID` (not `NEXT_PUBLIC_ZOOM_CLIENT_ID`)

### 5. Test

1. Go to your dashboard
2. Create a new availability pattern
3. Select "Zoom" as meeting type
4. You should see "Zoom Server-to-Server OAuth Configured" (no connection button needed)
5. Create a booking - Zoom meeting links will be generated automatically!

## Differences from User OAuth

| Feature | User OAuth (Old) | Server-to-Server (New) |
|---------|------------------|----------------------|
| User Interaction | Required | Not required |
| Connection Button | Yes | No |
| Token Storage | Per-user in database | Generated on-demand |
| Scopes | `user:read:user`, `meeting:write:meeting` | `user:read:admin`, `meeting:write:admin` |
| Setup Complexity | High | Low |

## Troubleshooting

**Error: "Zoom Server-to-Server OAuth not configured"**
- Check that all 3 environment variables are set: `ZOOM_ACCOUNT_ID`, `ZOOM_CLIENT_ID`, `ZOOM_CLIENT_SECRET`
- Verify in Vercel dashboard that variables are set correctly

**Error: "Failed to generate Server-to-Server token"**
- Verify Account ID, Client ID, and Client Secret are correct
- Check that the app is activated in Zoom Marketplace
- Ensure scopes are enabled in the app

## API Changes

- `generateAccessToken()` - Generates tokens on-demand (no user connection needed)
- `hasActiveConnection()` - Returns `true` for Zoom if env vars are set
- No OAuth callback needed
- No user connection storage needed

