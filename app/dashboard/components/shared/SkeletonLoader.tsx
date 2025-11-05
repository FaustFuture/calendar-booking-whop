export default function SkeletonLoader() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Connected Account Skeleton */}
      <div className="h-12 bg-zinc-800 rounded-lg w-full" />

      {/* Title Field */}
      <div className="space-y-2">
        <div className="h-4 bg-zinc-800 rounded w-20" />
        <div className="h-11 bg-zinc-800 rounded-lg w-full" />
      </div>

      {/* Description Field */}
      <div className="space-y-2">
        <div className="h-4 bg-zinc-800 rounded w-24" />
        <div className="h-24 bg-zinc-800 rounded-lg w-full" />
      </div>

      {/* Duration Field */}
      <div className="space-y-2">
        <div className="h-4 bg-zinc-800 rounded w-20" />
        <div className="h-11 bg-zinc-800 rounded-lg w-2/3" />
      </div>

      {/* Price Field */}
      <div className="space-y-2">
        <div className="h-4 bg-zinc-800 rounded w-28" />
        <div className="h-11 bg-zinc-800 rounded-lg w-2/3" />
      </div>

      {/* Meeting Type Field */}
      <div className="space-y-2">
        <div className="h-4 bg-zinc-800 rounded w-32" />
        <div className="h-11 bg-zinc-800 rounded-lg w-full" />
      </div>
    </div>
  )
}
