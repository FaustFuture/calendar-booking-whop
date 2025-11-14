# Meeting Notification Setup

This application sends push notifications to users and admins 24 hours, 2 hours, and 30 minutes before scheduled meetings using Whop's notification system.

## How It Works

1. **Cron Job**: A cron job runs every minute to check for upcoming meetings
2. **Time Windows**: The system checks if any meetings are starting in 24 hours, 2 hours, or 30 minutes
3. **Notifications**: Sends push notifications to both the member and company admins simultaneously
4. **Tracking**: Marks notifications as sent to prevent duplicates

## Setup Instructions

### 1. Database Migration

Run the migration to add notification tracking columns:

```sql
-- Run this in your Supabase SQL Editor
-- File: supabase/migrations/20250109_000001_update_notification_timing.sql
```

This adds:
- `notification_24h_sent` (boolean) - Tracks if 24-hour notification was sent
- `notification_2h_sent` (boolean) - Tracks if 2-hour notification was sent
- `notification_30min_sent` (boolean) - Tracks if 30-minute notification was sent

### 2. Vercel Cron Job Setup

The `vercel.json` file is already configured with a cron job that runs every minute:

```json
{
  "crons": [
    {
      "path": "/api/notifications/check",
      "schedule": "* * * * *"
    }
  ]
}
```

**Important**: After deploying to Vercel:
1. Go to your Vercel project dashboard
2. Navigate to **Settings** → **Cron Jobs**
3. Verify the cron job is active
4. The cron job will automatically call `/api/notifications/check` every minute

### 3. Environment Variables

Make sure these are set in your Vercel environment:
- `WHOP_API_KEY` - Your Whop API key
- `NEXT_PUBLIC_WHOP_APP_ID` - Your Whop App ID
- `CRON_SECRET` (optional) - Secret for securing the cron endpoint

### 4. App Path Configuration

To enable deep linking to bookings when users click notifications:

1. Go to your Whop App Dashboard
2. Navigate to **Hosting** section
3. Set the **App path** to: `/dashboard/[companyId]/[restPath]`
4. This allows notifications to deep link to specific bookings

## Notification Details

### 24-Hour Reminder
- **Title**: "Meeting Reminder: [Meeting Title]"
- **Content**: "Your meeting is scheduled for [date] at [time]"
- **Sent to**: Member (if exists) + All company admins
- **Deep link**: `/bookings/[bookingId]`

### 2-Hour Reminder
- **Title**: "Meeting Reminder: [Meeting Title]"
- **Content**: "Your meeting starts in 2 hours at [time]"
- **Sent to**: Member (if exists) + All company admins
- **Deep link**: `/bookings/[bookingId]`

### 30-Minute Reminder
- **Title**: "Meeting Starting Soon: [Meeting Title]"
- **Content**: "Your meeting starts in 30 minutes!"
- **Sent to**: Member (if exists) + All company admins
- **Deep link**: `/bookings/[bookingId]`

## Testing

### Manual Test

You can manually trigger the notification check:

```bash
curl https://your-domain.com/api/notifications/check
```

Or with authentication (if CRON_SECRET is set):

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://your-domain.com/api/notifications/check
```

### Test with Upcoming Meeting

1. Create a booking that starts in 24 hours, 2 hours, or 30 minutes (depending on which notification you want to test)
2. Wait for the cron job to run (runs every minute)
3. Check your Whop app notifications
4. You should receive a notification when the meeting is within the appropriate time window

## Troubleshooting

### Notifications Not Sending

1. **Check Cron Job Status**: Verify the cron job is active in Vercel
2. **Check Logs**: Look at Vercel function logs for errors
3. **Verify Whop SDK**: Ensure `WHOP_API_KEY` and `NEXT_PUBLIC_WHOP_APP_ID` are set
4. **Check Booking Status**: Only bookings with `status = 'upcoming'` are checked
5. **Verify Time Windows**: The system checks within a 1-minute window

### Duplicate Notifications

The system tracks sent notifications using database flags. If you see duplicates:
1. Check if `notification_24h_sent`, `notification_2h_sent`, and `notification_30min_sent` are being set
2. Verify the database migration ran successfully
3. Check for multiple cron jobs running

### Notifications Not Deep Linking

1. Verify the App path is set in Whop dashboard: `/dashboard/[companyId]/[restPath]`
2. Ensure your app handles the route structure
3. Check that `restPath` in notifications matches your routing

## API Reference

### `/api/notifications/check` (GET)

Cron endpoint that checks for upcoming meetings and sends notifications.

**Response**:
```json
{
  "message": "Notification check completed",
  "checked": 5,
  "sent": {
    "24h": 1,
    "2h": 2,
    "30min": 1
  }
}
```

## References

- [Whop Push Notification Documentation](https://docs.whop.com/apps/features/send-push-notification)
- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)

