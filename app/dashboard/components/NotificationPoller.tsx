'use client'

/**
 * Notification Poller Component
 * Polls for upcoming meetings and triggers notifications from the client side
 * This works around cron job limitations by using authenticated user context
 */

import { useEffect, useRef } from 'react'
import { useWhopUser } from '@/lib/context/WhopUserContext'

interface NotificationPollerProps {
  companyId: string
}

export default function NotificationPoller({ companyId }: NotificationPollerProps) {
  const { user } = useWhopUser()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const lastCheckRef = useRef<number>(0)

  useEffect(() => {
    if (!user || !companyId) return

    // Poll every 5 seconds for upcoming meetings
    const checkForNotifications = async () => {
      try {
        // Only check if at least 5 seconds have passed since last check
        const now = Date.now()
        if (now - lastCheckRef.current < 5000) return
        lastCheckRef.current = now

        // Call the notification check endpoint with user authentication
        const response = await fetch(`/api/notifications/check?companyId=${companyId}`, {
          method: 'GET',
          credentials: 'include', // Include cookies for authentication
        })

        if (response.ok) {
          const data = await response.json()
          if (data.sent && (data.sent['15min'] > 0 || data.sent['2min'] > 0)) {
            console.log('📬 Notifications sent via client poller:', data.sent)
          }
        }
      } catch (error) {
        console.error('Error checking notifications:', error)
      }
    }

    // Initial check after 2 seconds
    const initialTimeout = setTimeout(() => {
      checkForNotifications()
    }, 2000)

    // Then check every 5 seconds
    intervalRef.current = setInterval(checkForNotifications, 5000)

    return () => {
      clearTimeout(initialTimeout)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [user, companyId])

  // This component doesn't render anything
  return null
}

