'use client'

import { useState, useEffect } from 'react'
import { Video, Link as LinkIcon, MapPin, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export type MeetingType = 'google_meet' | 'zoom' | 'manual_link' | 'location'

interface ConditionalSelectProps {
  value: MeetingType
  onChange: (value: MeetingType) => void
  conditionalValue: string
  onConditionalChange: (value: string) => void
}

interface ConnectionStatus {
  google: boolean
  zoom: boolean
  loading: boolean
}

const meetingOptions = [
  { value: 'google_meet' as MeetingType, label: 'Google Meet', icon: Video },
  { value: 'zoom' as MeetingType, label: 'Zoom', icon: Video },
  { value: 'manual_link' as MeetingType, label: 'Manual Link', icon: LinkIcon },
  { value: 'location' as MeetingType, label: 'Physical Location', icon: MapPin },
]

export default function ConditionalSelect({
  value,
  onChange,
  conditionalValue,
  onConditionalChange,
}: ConditionalSelectProps) {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    google: false,
    zoom: false,
    loading: true,
  })
  const [connecting, setConnecting] = useState<'google' | 'zoom' | null>(null)

  const showUrlInput = value === 'manual_link'
  const showLocationInput = value === 'location'
  const selectedOption = meetingOptions.find((opt) => opt.value === value)

  // Check OAuth connection status
  useEffect(() => {
    checkConnectionStatus()
  }, [])

  // Listen for OAuth popup messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth-success') {
        checkConnectionStatus()
        setConnecting(null)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  async function checkConnectionStatus() {
    try {
      setConnectionStatus((prev) => ({ ...prev, loading: true }))

      const [googleRes, zoomRes] = await Promise.all([
        fetch('/api/meetings/generate?provider=google'),
        fetch('/api/meetings/generate?provider=zoom'),
      ])

      const googleData = await googleRes.json()
      const zoomData = await zoomRes.json()

      setConnectionStatus({
        google: googleData.connected || false,
        zoom: zoomData.connected || false,
        loading: false,
      })
    } catch (error) {
      console.error('Failed to check connection status:', error)
      setConnectionStatus({ google: false, zoom: false, loading: false })
    }
  }

  async function handleConnect(provider: 'google' | 'zoom') {
    try {
      setConnecting(provider)

      // Get OAuth URL from API
      const response = await fetch(`/api/meetings/oauth/${provider}`)
      const data = await response.json()

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
      console.error(`Failed to connect ${provider}:`, error)
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

      {/* OAuth Connection Status - Google Meet */}
      {value === 'google_meet' && (
        <div className="animate-fade-in space-y-2">
          {connectionStatus.loading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Checking connection...</span>
            </div>
          ) : connectionStatus.google ? (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                Google Account Connected
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="text-sm text-amber-700 dark:text-amber-400">
                  Connect Google to generate meeting links
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleConnect('google')}
                disabled={connecting === 'google'}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connecting === 'google' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect Google Account'
                )}
              </button>
            </div>
          )}
          {connectionStatus.google && (
            <p className="text-xs text-zinc-500">
              Meeting links will be generated automatically for each booking
            </p>
          )}
        </div>
      )}

      {/* OAuth Connection Status - Zoom */}
      {value === 'zoom' && (
        <div className="animate-fade-in space-y-2">
          {connectionStatus.loading ? (
            <div className="flex items-center gap-2 text-sm text-zinc-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Checking connection...</span>
            </div>
          ) : connectionStatus.zoom ? (
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
              <span className="text-sm text-green-700 dark:text-green-400 font-medium">
                Zoom Account Connected
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span className="text-sm text-amber-700 dark:text-amber-400">
                  Connect Zoom to generate meeting links
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleConnect('zoom')}
                disabled={connecting === 'zoom'}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {connecting === 'zoom' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  'Connect Zoom Account'
                )}
              </button>
            </div>
          )}
          {connectionStatus.zoom && (
            <p className="text-xs text-zinc-500">
              Meeting links will be generated automatically for each booking
            </p>
          )}
        </div>
      )}
    </div>
  )
}
