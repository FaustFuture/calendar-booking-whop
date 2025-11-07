'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { XCircle, Loader2 } from 'lucide-react'

const ERROR_MESSAGES: Record<string, string> = {
  missing_parameters: 'Missing required parameters',
  invalid_state: 'Invalid state parameter',
  unauthorized: 'User not authorized',
  database_error: 'Database error occurred',
  callback_failed: 'OAuth callback failed',
  access_denied: 'Access was denied',
}

function OAuthErrorContent() {
  const searchParams = useSearchParams()
  const provider = searchParams.get('provider')
  const companyId = searchParams.get('companyId')
  const error = searchParams.get('error') || 'unknown_error'
  const errorMessage = ERROR_MESSAGES[error] || 'An unknown error occurred'

  useEffect(() => {
    // Send error message to parent window
    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'oauth-error',
          provider,
          error,
        },
        window.location.origin
      )

      // Close the popup after a delay
      setTimeout(() => {
        window.close()
      }, 2000)
    } else {
      // If not in a popup, redirect to integrations page with companyId
      setTimeout(() => {
        const redirectUrl = companyId
          ? `/dashboard/${companyId}/settings/integrations?error=${error}`
          : `/dashboard/settings/integrations?error=${error}`
        window.location.href = redirectUrl
      }, 2000)
    }
  }, [provider, companyId, error])

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-800 rounded-lg p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 bg-red-500/10 rounded-full">
            <XCircle className="w-12 h-12 text-red-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">
            Connection Failed
          </h1>
          <p className="text-zinc-400">
            Failed to connect {provider === 'google' ? 'Google' : 'Zoom'} account.
          </p>
          <p className="text-sm text-red-400">
            {errorMessage}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-zinc-500">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Closing window...</span>
        </div>
      </div>
    </div>
  )
}

export default function OAuthErrorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    }>
      <OAuthErrorContent />
    </Suspense>
  )
}
