import { AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface ErrorPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function AuthErrorPage({ searchParams }: ErrorPageProps) {
  const params = await searchParams
  const message = typeof params.message === 'string' ? params.message : 'Authentication failed'
  const provider = typeof params.provider === 'string' ? params.provider : ''

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 p-4">
      <div className="max-w-md w-full">
        <div className="bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-center w-16 h-16 bg-red-500/10 rounded-full mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>

          <h1 className="text-2xl font-bold text-white text-center mb-3">
            Authentication Error
          </h1>

          <p className="text-zinc-400 text-center mb-6">
            {message}
          </p>

          {provider && (
            <div className="bg-zinc-900/50 border border-zinc-700/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-zinc-400 text-center">
                Provider: <span className="text-white font-medium capitalize">{provider}</span>
              </p>
            </div>
          )}

          <div className="space-y-3">
            <Link
              href="/"
              className="block w-full py-3 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold text-center transition-colors"
            >
              Go to Home
            </Link>

            <Link
              href="https://docs.whop.com/apps"
              target="_blank"
              className="block w-full py-3 px-4 bg-zinc-700 hover:bg-zinc-600 text-white rounded-lg font-semibold text-center transition-colors"
            >
              View Documentation
            </Link>
          </div>
        </div>

        <p className="text-zinc-500 text-sm text-center mt-6">
          If this problem persists, please contact support
        </p>
      </div>
    </div>
  )
}
