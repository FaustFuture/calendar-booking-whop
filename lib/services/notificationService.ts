/**
 * Notification Service
 * Handles sending push notifications via Whop SDK
 * Reference: https://docs.whop.com/apps/features/send-push-notification
 */

import { createClient } from '@/lib/supabase/server'
import { whopsdk, whopSdk_server } from '@/lib/whop-sdk'

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
      const notificationPayload: any = {
        title,
        content,
        companyTeamId: companyId,
        userIds: [userId],
      }
      
      // if (restPath) {
      //   notificationPayload.restPath = restPath
      // }
      
      // if (isMention) {
      //   notificationPayload.isMention = isMention
      // }

      // Use SDK method - type assertion needed as TypeScript types may not be up to date
      await whopSdk_server.notifications.sendPushNotification(notificationPayload)

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
      // Use Whop SDK to send push notification
      // Reference: https://docs.whop.com/apps/features/send-push-notification
      const notificationPayload: any = {
        title,
        content,
        companyTeamId: companyId, // This sends to all admins in the company
      }
      
      if (restPath) {
        notificationPayload.restPath = restPath
      }
      
      if (isMention) {
        notificationPayload.isMention = isMention
      }

      // Use SDK method - type assertion needed as TypeScript types may not be up to date
      await (whopsdk as any).notifications.sendPushNotification(notificationPayload)

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

    return !!(data as any)[field]
  }
}

export const notificationService = new NotificationService()

