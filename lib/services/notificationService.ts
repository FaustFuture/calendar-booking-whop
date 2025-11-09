/**
 * Notification Service
 * Handles sending push notifications via Whop SDK
 * Reference: https://docs.whop.com/apps/features/send-push-notification
 */

import { whopsdk } from '@/lib/whop-sdk'
import { createClient } from '@/lib/supabase/server'

export class NotificationService {
  /**
   * Send a notification to a specific user
   */
  async sendNotificationToUser(
    userId: string,
    companyId: string,
    title: string,
    content: string,
    restPath?: string,
    isMention: boolean = false
  ): Promise<void> {
    try {
      // Use Whop SDK to send push notification
      // Reference: https://docs.whop.com/apps/features/send-push-notification
      await whopsdk.notifications.sendPushNotification({
        title,
        content,
        companyTeamId: companyId, // Send to company team
        userIds: [userId], // Filter to specific user
        restPath,
        isMention,
      })

      console.log(`✅ Notification sent to user ${userId}:`, { title, content })
    } catch (error) {
      console.error(`❌ Failed to send notification to user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Send a notification to company admins
   */
  async sendNotificationToAdmins(
    companyId: string,
    title: string,
    content: string,
    restPath?: string,
    isMention: boolean = false
  ): Promise<void> {
    try {
      await whopsdk.notifications.sendPushNotification({
        title,
        content,
        companyTeamId: companyId, // This sends to all admins in the company
        restPath,
        isMention,
      })

      console.log(`✅ Notification sent to admins in company ${companyId}:`, { title, content })
    } catch (error) {
      console.error(`❌ Failed to send notification to admins:`, error)
      throw error
    }
  }


  /**
   * Mark notification as sent in database
   */
  async markNotificationSent(
    bookingId: string,
    notificationType: '15min' | '2min'
  ): Promise<void> {
    const supabase = await createClient()

    // Update booking with notification flags
    const updateField = notificationType === '15min' ? 'notification_15min_sent' : 'notification_2min_sent'

    const { error } = await supabase
      .from('bookings')
      .update({
        [updateField]: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)

    if (error) {
      console.error(`Failed to mark ${notificationType} notification as sent:`, error)
      throw error
    }
  }

  /**
   * Check if notification was already sent
   */
  async hasNotificationBeenSent(
    bookingId: string,
    notificationType: '15min' | '2min'
  ): Promise<boolean> {
    const supabase = await createClient()

    const field = notificationType === '15min' ? 'notification_15min_sent' : 'notification_2min_sent'

    const { data, error } = await supabase
      .from('bookings')
      .select(field)
      .eq('id', bookingId)
      .single()

    if (error || !data) {
      return false
    }

    return !!data[field]
  }
}

export const notificationService = new NotificationService()

