'use client'

import { useState, useEffect } from 'react'
import { Video, Link as LinkIcon, MapPin, CheckCircle2, AlertCircle, Loader2, MessageCircle } from 'lucide-react'
import { InlineTextSkeleton } from './ListItemSkeleton'

export type MeetingType = 'zoom' | 'google_meet' | 'manual_link' | 'location'

interface ConditionalSelectProps {
  value: MeetingType
  onChange: (value: MeetingType) => void
  conditionalValue: string
  onConditionalChange: (value: string) => void
  companyId: string
}

interface ConnectionStatus {
  zoom: boolean
  google: boolean
  loading: boolean
}

const meetingOptions = [
  { value: 'zoom' as MeetingType, label: 'Zoom', icon: Video },
  { value: 'google_meet' as MeetingType, label: 'Google Meet', icon: MessageCircle },
  { value: 'manual_link' as MeetingType, label: 'Manual Link', icon: LinkIcon },
  { value: 'location' as MeetingType, label: 'Physical Location', icon: MapPin },
]

export default function ConditionalSelect({
  value,
  onChange,
  conditionalValue,
  onConditionalChange,
  companyId,
}: ConditionalSelectProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    zoom: false,
    google: false,
    loading: true,
  })
  const [connecting, setConnecting] = useState<'zoom' | 'google' | null>(null)

  const showUrlInput = value === 'manual_link'
  const showLocationInput = value === 'location'
  const selectedOption = meetingOptions.find((opt) => opt.value === value)

  // Check OAuth connection status
  useEffect(() => {
    checkConnectionStatus()
  }, [companyId])

  // Listen for OAuth popup messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth-success') {
        checkConnectionStatus()
        setConnecting(null)
      } else if (event.data?.type === 'oauth-error') {
        setConnecting(null)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  async function checkConnectionStatus() {
    try {
      setConnectionStatus((prev) => ({ ...prev, loading: true }))

      // Check connection status for both Zoom and Google Meet
      const checkRes = await fetch(`/api/meetings/check?companyId=${companyId}`)
      const checkData = await checkRes.json()
      const zoomConfigured = checkData.connections?.zoom?.configured || false
      const googleConfigured = checkData.connections?.google?.configured || false

      setConnectionStatus({
        zoom: zoomConfigured,
        google: googleConfigured,
        loading: false,
      })
    } catch (error) {
      setConnectionStatus({ zoom: false, google: false, loading: false })
    }
  }

  async function handleConnect(provider: 'zoom' | 'google') {
    try {
      setConnecting(provider)

      // Get OAuth URL from API
      const response = await fetch(`/api/meetings/oauth/${provider}?companyId=${companyId}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get authorization URL')
      }

      if (!data.authUrl) {
        throw new Error('Failed to get authorization URL')
      }

      // Open OAuth popup
      const width = 500
      const height = 600
      const left = window.screen.width / 2 - width / 2
      const top = window.screen.height / 2 - height / 2

      const popup = window.open(
        data.authUrl,
        `${provider}-oauth`,
        `width=${width},height=${height},left=${left},top=${top}`
      )

      // Poll to check if popup is closed
      const pollTimer = setInterval(() => {
        if (popup?.closed) {
          clearInterval(pollTimer)
          setConnecting(null)
          checkConnectionStatus()
        }
      }, 500)
    } catch (error) {
      setConnecting(null)
    }
  }

  return (
    <div className="space-y-3">
      {/* Dropdown */}
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as MeetingType)}
          className="input w-full appearance-none pr-10"
        >
          {meetingOptions.map((option) => {
            const Icon = option.icon
            return (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            )
          })}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
          {selectedOption && (
            <selectedOption.icon className="w-5 h-5 text-zinc-500" />
          )}
        </div>
      </div>

      {/* Conditional Input - Manual Link */}
      {showUrlInput && (
        <div className="animate-fade-in space-y-2">
          <input
            type="url"
            value={conditionalValue}
            onChange={(e) => onConditionalChange(e.target.value)}
            className="input w-full"
            placeholder="https://meet.google.com/abc-defg-hij"
          />
          <p className="text-xs text-zinc-500 flex items-center gap-1">
            <LinkIcon className="w-3 h-3" />
            Enter the full meeting URL
          </p>
        </div>
      )}

      {/* Conditional Input - Location */}
      {showLocationInput && (
        <div className="animate-fade-in space-y-2">
          <textarea
            value={conditionalValue}
            onChange={(e) => onConditionalChange(e.target.value)}
            className="input w-full min-h-[80px]"
            placeholder="123 Main Street, City, State, ZIP"
          />
          <p className="text-xs text-zinc-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            Enter the physical address
          </p>
        </div>
      )}

      {/* OAuth Connection Status - Zoom (Server-to-Server) */}
      {value === 'zoom' && (
        <div className="animate-fade-in space-y-2">
          {connectionStatus.loading ? (
            <InlineTextSkeleton width="w-48" />
          ) : connectionStatus.zoom ? (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                Zoom Configured
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <span className="text-sm text-amber-700 dark:text-amber-400">
                Zoom not configured. Set ZOOM_ACCOUNT_ID, ZOOM_CLIENT_ID, and ZOOM_CLIENT_SECRET environment variables.
              </span>
            </div>
          )}
          {connectionStatus.zoom && (
            <p className="text-xs text-zinc-500">
              Meeting links will be generated automatically
            </p>
          )}
        </div>
      )}

      {/* OAuth Connection Status - Google Meet */}
      {value === 'google_meet' && (
        <div className="animate-fade-in space-y-2">
          {connectionStatus.loading ? (
            <InlineTextSkeleton width="w-48" />
          ) : connectionStatus.google ? (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                Google Meet Connected
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-sm text-amber-700 dark:text-amber-400 block mb-2">
                  Google Meet not connected. Connect your Google account to generate meeting links automatically.
                </span>
                <button
                  onClick={() => handleConnect('google')}
                  disabled={connecting === 'google'}
                  className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded text-xs font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {connecting === 'google' ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect Google Account'
                  )}
                </button>
              </div>
            </div>
          )}
          {connectionStatus.google && (
            <p className="text-xs text-zinc-500">
              Meeting links will be generated automatically
            </p>
          )}
        </div>
      )}
    </div>
  )
}
