export function AvailabilityPatternSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-lg border border-zinc-700/50 bg-zinc-800/50 flex flex-col animate-pulse">
      {/* Card Header */}
      <div className="p-3 pb-2.5">
        <div className="flex items-start justify-between gap-2 mb-2">
          {/* Icon */}
          <div className="flex-shrink-0 w-7 h-7 bg-zinc-700/80 rounded" />
          {/* Status Badge */}
          <div className="w-16 h-5 bg-zinc-700/80 rounded" />
        </div>
        {/* Title */}
        <div className="h-5 bg-zinc-700/80 rounded w-3/4 mb-2.5" />
      </div>

      {/* Card Body */}
      <div className="px-3 pb-2.5 flex-1 space-y-2">
        <div className="h-3.5 bg-zinc-700/80 rounded w-24" />
        <div className="h-3.5 bg-zinc-700/80 rounded w-20" />
        <div className="h-3.5 bg-zinc-700/80 rounded w-28" />
      </div>

      {/* Card Footer */}
      <div className="px-3 py-2.5 pt-2 border-t border-zinc-700/50">
        <div className="flex items-center justify-end gap-1.5">
          <div className="w-6 h-6 bg-zinc-700/80 rounded-lg" />
          <div className="w-6 h-6 bg-zinc-700/80 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export function BookingSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4 animate-pulse">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Icon */}
          <div className="flex-shrink-0 w-9 h-9 bg-zinc-700/80 rounded-lg" />

          {/* Content - 2 rows */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Row 1: Title */}
            <div className="h-5 bg-zinc-700/80 rounded w-48" />
            {/* Row 2: Details */}
            <div className="h-4 bg-zinc-700/80 rounded w-72" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-16 h-9 bg-zinc-700/80 rounded-lg" />
          <div className="w-8 h-8 bg-zinc-700/80 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export function RecordingSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-700/50 bg-zinc-800/50 p-4 animate-pulse">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Icon */}
          <div className="flex-shrink-0 w-9 h-9 bg-zinc-700/80 rounded-lg" />

          {/* Content - 2 rows */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Row 1: Title */}
            <div className="h-5 bg-zinc-700/80 rounded w-56" />
            {/* Row 2: Details */}
            <div className="h-4 bg-zinc-700/80 rounded w-80" />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <div className="w-16 h-9 bg-zinc-700/80 rounded-lg" />
          <div className="w-8 h-8 bg-zinc-700/80 rounded-lg" />
          <div className="w-8 h-8 bg-zinc-700/80 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

export function IntegrationCardSkeleton() {
  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 space-y-4 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-zinc-700/80 rounded-lg" />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-zinc-700/80 rounded w-32" />
          <div className="h-4 bg-zinc-700/80 rounded w-48" />
        </div>
      </div>
      <div className="h-10 bg-zinc-700/80 rounded-lg w-full" />
      <div className="space-y-2">
        <div className="h-3 bg-zinc-700/80 rounded w-32" />
        <div className="h-3 bg-zinc-700/80 rounded w-40" />
        <div className="h-3 bg-zinc-700/80 rounded w-36" />
      </div>
    </div>
  )
}

export function InlineTextSkeleton({ width = "w-32" }: { width?: string }) {
  return (
    <div className="flex items-center gap-2 p-3 bg-zinc-800/50 rounded-lg animate-pulse">
      <div className={`h-4 bg-zinc-700/80 rounded ${width}`} />
    </div>
  )
}
