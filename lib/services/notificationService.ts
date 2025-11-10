/**
 * Notification Service
 * Handles sending push notifications via Whop REST API
 * Reference: https://docs.whop.com/api-reference/notifications/create-notification
 */

import { createClient } from '@/lib/supabase/server'

export class NotificationService {
  /**
   * Send a notification to a specific user
   * Uses Whop REST API: https://docs.whop.com/api-reference/notifications/create-notification
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
      const apiKey = process.env.WHOP_API_KEY
      if (!apiKey) {
        throw new Error('WHOP_API_KEY is not configured')
      }

      // Use Whop REST API format
      // Reference: https://docs.whop.com/api-reference/notifications/create-notification
      const notificationPayload: any = {
        company_id: companyId,
        user_ids: [userId],
        title,
        content,
      }
      
      if (restPath) {
        notificationPayload.rest_path = restPath
      }

      // Use REST API directly - v1 endpoint
      const response = await fetch('https://api.whop.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationPayload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new Error(`Failed to send notification: ${errorData.message || response.statusText}`)
      }

      console.log(`✅ Notification sent to user ${userId}:`, { title, content })
    } catch (error) {
      console.error(`❌ Failed to send notification to user ${userId}:`, error)
      throw error
    }
  }

  /**
   * Send a notification to company admins
   * Uses Whop REST API: https://docs.whop.com/api-reference/notifications/create-notification
   * Note: To send to all admins, we need to fetch admin user IDs or use company_id without user_ids
   */
  async sendNotificationToAdmins(
    companyId: string,
    title: string,
    content: string,
    restPath?: string,
    isMention: boolean = false
  ): Promise<void> {
    try {
      const apiKey = process.env.WHOP_API_KEY
      if (!apiKey) {
        throw new Error('WHOP_API_KEY is not configured')
      }

      // Use Whop REST API format
      // Reference: https://docs.whop.com/api-reference/notifications/create-notification
      // Sending with company_id only (without user_ids) sends to all members in that company
      const notificationPayload: any = {
        company_id: companyId,
        title,
        content,
      }
      
      if (restPath) {
        notificationPayload.rest_path = restPath
      }

      // Use REST API directly - v1 endpoint
      const response = await fetch('https://api.whop.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(notificationPayload),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }))
        throw new Error(`Failed to send notification: ${errorData.message || response.statusText}`)
      }

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

