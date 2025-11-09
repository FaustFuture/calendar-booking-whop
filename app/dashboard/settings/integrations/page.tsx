import { Suspense } from 'react'
import IntegrationsClient from './IntegrationsClient'
import { IntegrationCardSkeleton } from '@/app/dashboard/components/shared/ListItemSkeleton'
import { ToastProvider } from '@/lib/context/ToastContext'
import { ConfirmDialogProvider } from '@/lib/context/ConfirmDialogContext'

export default function IntegrationsPage() {
  return (
    <ToastProvider>
      <ConfirmDialogProvider>
        <Suspense fallback={
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="space-y-2 animate-pulse">
              <div className="h-8 bg-zinc-700 rounded w-64" />
              <div className="h-5 bg-zinc-700 rounded w-96" />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <IntegrationCardSkeleton />
              <IntegrationCardSkeleton />
            </div>
          </div>
        }>
          <IntegrationsClient />
        </Suspense>
      </ConfirmDialogProvider>
    </ToastProvider>
  )
}
