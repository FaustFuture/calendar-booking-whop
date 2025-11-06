'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'

function OAuthSuccessContent() {
  const searchParams = useSearchParams()
  const provider = searchParams.get('provider')

  useEffect(() => {
    // Send success message to parent window
    if (window.opener) {
      window.opener.postMessage(
        {
          type: 'oauth-success',
          provider,
        },
        window.location.origin
      )

      // Close the popup after a brief delay
      setTimeout(() => {
        window.close()
      }, 500)
    } else {
      // If not in a popup, redirect to integrations page
      setTimeout(() => {
        window.location.href = `/dashboard/settings/integrations?success=${provider}`
      }, 1500)
    }
  }, [provider])

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-zinc-800 rounded-lg p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="p-4 bg-green-500/10 rounded-full">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white">
            Connection Successful!
          </h1>
          <p className="text-zinc-400">
            {provider === 'google' ? 'Google' : 'Zoom'} account connected successfully.
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

export default function OAuthSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center p-4">
        <div className="flex items-center gap-2 text-zinc-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </div>
      </div>
    }>
      <OAuthSuccessContent />
    </Suspense>
  )
}
