/**
 * Notification Service
 * Handles sending push notifications via Whop SDK
 * Reference: https://docs.whop.com/api-reference/notifications/create-notification
 */

import { createClient } from '@/lib/supabase/server'
import { whopSdk_server } from '@/lib/whop-sdk'

export class NotificationService {
  /**
   * Send a notification to a specific user
   * Uses the new Whop API format: https://docs.whop.com/api-reference/notifications/create-notification
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
      // Use new Whop API format
      // Reference: https://docs.whop.com/api-reference/notifications/create-notification
      const notificationPayload: any = {
        title,
        content,
        experienceId: companyId, // Use experienceId (companyId) for the experience/company
        userIds: [userId], // Target specific user
      }
      
      if (restPath) {
        notificationPayload.restPath = restPath
      }
      
      if (isMention) {
        notificationPayload.isMention = isMention
      }

      // Use SDK method - type assertion needed as TypeScript types may not be up to date
      await (whopSdk_server as any).notifications.sendPushNotification(notificationPayload)

      console.log(`✅ Notification sent to user ${userId}:`, { title, content })
    } catch (error) {
      console.error(`❌ Failed to send notification to user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Send a notification to company admins
   * Uses the new Whop API format: https://docs.whop.com/api-reference/notifications/create-notification
   */
  async sendNotificationToAdmins(
    companyId: string,
    title: string,
    content: string,
    restPath?: string,
    isMention: boolean = false
  ): Promise<void> {
    try {
      // Use new Whop API format
      // Reference: https://docs.whop.com/api-reference/notifications/create-notification
      // Sending to experienceId (companyId) sends to all members in that experience/company
      const notificationPayload: any = {
        title,
        content,
        experienceId: companyId, // Use experienceId instead of companyTeamId
      }
      
      if (restPath) {
        notificationPayload.restPath = restPath
      }
      
      if (isMention) {
        notificationPayload.isMention = isMention
      }

      // Use SDK method - type assertion needed as TypeScript types may not be up to date
      await (whopSdk_server as any).notifications.sendPushNotification(notificationPayload)

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

