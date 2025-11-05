import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import IntegrationsClient from './IntegrationsClient'

export default function IntegrationsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-400" />
      </div>
    }>
      <IntegrationsClient />
    </Suspense>
  )
}
