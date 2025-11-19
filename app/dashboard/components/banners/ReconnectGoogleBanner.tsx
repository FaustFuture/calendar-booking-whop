'use client'

import { useState, useEffect } from 'react'
import { AlertCircle, X, RefreshCw } from 'lucide-react'
import { useWhopUser } from '@/lib/context/WhopUserContext'

interface ReconnectGoogleBannerProps {
  companyId: string
}

export default function ReconnectGoogleBanner({ companyId }: ReconnectGoogleBannerProps) {
  const { user } = useWhopUser()
  const [needsReconnect, setNeedsReconnect] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkGoogleConnection()
  }, [companyId, user])

  async function checkGoogleConnection() {
    if (!user || !companyId) {
      setLoading(false)
      return
    }

    // Check if banner was previously dismissed in this session
    const dismissedKey = `reconnect-google-dismissed-${user.userId}`
    if (sessionStorage.getItem(dismissedKey)) {
      setDismissed(true)
      setLoading(false)
      return
    }

    try {
      // Fetch user's OAuth connections
      const response = await fetch(`/api/meetings/connections?companyId=${companyId}`)
      if (!response.ok) {
        setLoading(false)
        return
      }

      const data = await response.json()
      const googleConnection = data.connections?.find(
        (conn: any) => conn.provider === 'google' && conn.is_active
      )

      if (!googleConnection) {
        // No Google connection exists, don't show banner
        setNeedsReconnect(false)
      } else {
        // Check if the connection has the required scope
        const response = await fetch(
          `/api/meetings/check?companyId=${companyId}&provider=google`
        )

        if (response.ok) {
          const checkData = await response.json()

          // If scope info is available, check for calendar.readonly
          const googleScope = checkData.connections?.google?.scope
          if (googleScope) {
            const hasReadScope =
              googleScope.includes('calendar.readonly') ||
              googleScope.includes('calendar')

            setNeedsReconnect(!hasReadScope)
          } else {
            // If no scope info, assume reconnect might be needed
            setNeedsReconnect(true)
          }
        }
      }
    } catch (error) {
      console.error('Failed to check Google connection:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleDismiss() {
    if (user) {
      sessionStorage.setItem(`reconnect-google-dismissed-${user.userId}`, 'true')
      setDismissed(true)
    }
  }

  async function handleReconnect() {
    try {
      // Initiate OAuth flow (GET request with query parameter)
      const response = await fetch(
        `/api/meetings/oauth/google?companyId=${encodeURIComponent(companyId)}`
      )

      if (response.ok) {
        const data = await response.json()
        if (data.authUrl) {
          // Open OAuth popup
          const width = 500
          const height = 600
          const left = window.screen.width / 2 - width / 2
          const top = window.screen.height / 2 - height / 2

          window.open(
            data.authUrl,
            'Google OAuth',
            `width=${width},height=${height},left=${left},top=${top}`
          )
        }
      }
    } catch (error) {
      console.error('Failed to initiate reconnect:', error)
    }
  }

  if (loading || !needsReconnect || dismissed) {
    return null
  }

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-white font-medium mb-1">Update Google Calendar Permissions</h3>
          <p className="text-zinc-300 text-sm mb-3">
            To enable calendar conflict checking and prevent double-bookings, please reconnect your
            Google account with updated permissions.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={handleReconnect}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Reconnect Google Calendar
            </button>
            <button
              onClick={handleDismiss}
              className="text-zinc-400 hover:text-zinc-300 text-sm transition-colors"
            >
              Dismiss
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-zinc-400 hover:text-zinc-300 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
