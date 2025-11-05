'use client'

import { useState, useEffect } from 'react'
import { Video, CheckCircle2, XCircle, Loader2, Calendar } from 'lucide-react'
import { useSearchParams } from 'next/navigation'

interface OAuthConnection {
  id: string
  provider: 'google' | 'zoom'
  provider_email: string
  is_active: boolean
  created_at: string
  last_used_at: string | null
}

export default function IntegrationsPage() {
  const [connections, setConnections] = useState<OAuthConnection[]>([])
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState<'google' | 'zoom' | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    loadConnections()

    // Check for OAuth success/error messages
    const success = searchParams.get('success')
    const error = searchParams.get('error')

    if (success) {
      setTimeout(() => {
        loadConnections()
      }, 500)
    }

    if (error) {
      console.error('OAuth error:', error)
    }
  }, [searchParams])

  // Listen for OAuth popup messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth-success') {
        loadConnections()
        setConnecting(null)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  async function loadConnections() {
    try {
      setLoading(true)
      const response = await fetch('/api/meetings/connections')
      const data = await response.json()
      setConnections(data.connections || [])
    } catch (error) {
      console.error('Failed to load connections:', error)
    } finally {
      setLoading(false)
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
          loadConnections()
        }
      }, 500)
    } catch (error) {
      console.error(`Failed to connect ${provider}:`, error)
      setConnecting(null)
    }
  }

  async function handleDisconnect(provider: 'google' | 'zoom') {
    if (!confirm(`Are you sure you want to disconnect your ${provider === 'google' ? 'Google' : 'Zoom'} account?`)) {
      return
    }

    try {
      const response = await fetch(`/api/meetings/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      })

      if (response.ok) {
        loadConnections()
      } else {
        alert('Failed to disconnect account. Please try again.')
      }
    } catch (error) {
      console.error('Failed to disconnect:', error)
      alert('Failed to disconnect account. Please try again.')
    }
  }

  const googleConnection = connections.find((c) => c.provider === 'google')
  const zoomConnection = connections.find((c) => c.provider === 'zoom')

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">
          Meeting Integrations
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400 mt-1">
          Connect your Google and Zoom accounts to automatically generate meeting links
        </p>
      </div>

      {/* Success/Error Messages */}
      {searchParams.get('success') && (
        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            <span className="text-green-700 dark:text-green-400 font-medium">
              Successfully connected {searchParams.get('success') === 'google' ? 'Google' : 'Zoom'}!
            </span>
          </div>
        </div>
      )}

      {searchParams.get('error') && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2">
            <XCircle className="w-5 h-5 text-red-500" />
            <span className="text-red-700 dark:text-red-400 font-medium">
              Connection failed: {searchParams.get('error')}
            </span>
          </div>
        </div>
      )}

      {/* Integrations Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Google Meet Card */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <Video className="w-6 h-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Google Meet
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Generate meeting links via Google Calendar
                </p>
              </div>
            </div>

            {googleConnection ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      Connected
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-500 truncate">
                      {googleConnection.provider_email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    Connected: {new Date(googleConnection.created_at).toLocaleDateString()}
                  </span>
                  {googleConnection.last_used_at && (
                    <span>
                      Last used: {new Date(googleConnection.last_used_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDisconnect('google')}
                  className="btn-secondary w-full"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
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
                  <>
                    <Calendar className="w-4 h-4" />
                    Connect Google Account
                  </>
                )}
              </button>
            )}

            <div className="text-xs text-zinc-500 space-y-1">
              <p className="font-medium">Required permissions:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>Create calendar events</li>
                <li>Access email address</li>
              </ul>
            </div>
          </div>

          {/* Zoom Card */}
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-600/10 rounded-lg">
                <Video className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                  Zoom
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                  Generate Zoom meeting links automatically
                </p>
              </div>
            </div>

            {zoomConnection ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-700 dark:text-green-400">
                      Connected
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-500 truncate">
                      {zoomConnection.provider_email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>
                    Connected: {new Date(zoomConnection.created_at).toLocaleDateString()}
                  </span>
                  {zoomConnection.last_used_at && (
                    <span>
                      Last used: {new Date(zoomConnection.last_used_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleDisconnect('zoom')}
                  className="btn-secondary w-full"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
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
                  <>
                    <Video className="w-4 h-4" />
                    Connect Zoom Account
                  </>
                )}
              </button>
            )}

            <div className="text-xs text-zinc-500 space-y-1">
              <p className="font-medium">Required permissions:</p>
              <ul className="list-disc list-inside space-y-0.5 ml-2">
                <li>Create meetings</li>
                <li>Access user information</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Info Section */}
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
          How it works
        </h4>
        <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-2">
          <li className="flex gap-2">
            <span className="text-blue-500">1.</span>
            <span>Connect your Google or Zoom account by clicking the button above</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-500">2.</span>
            <span>When creating time slots, select Google Meet or Zoom as the meeting type</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-500">3.</span>
            <span>Meeting links will be generated automatically when someone books with you</span>
          </li>
          <li className="flex gap-2">
            <span className="text-blue-500">4.</span>
            <span>Both you and the attendee will receive the meeting link</span>
          </li>
        </ul>
      </div>
    </div>
  )
}
