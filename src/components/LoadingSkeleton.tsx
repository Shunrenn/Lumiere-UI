import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  variant?: 'dashboard' | 'table' | 'cards' | 'detail' | 'page'
  className?: string
}

export function LoadingSkeleton({ variant = 'dashboard', className }: LoadingSkeletonProps) {
  return (
    <div className={cn('w-full space-y-6 p-4 sm:p-6', className)}>
      {/* Header skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-28 rounded animate-shimmer" />
        <div className="h-8 w-64 rounded animate-shimmer" />
        <div className="h-4 w-96 max-w-full rounded animate-shimmer opacity-80" />
      </div>

      {(variant === 'dashboard' || variant === 'page') && (
        <>
          {/* Stat cards grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-xl border border-border bg-card/70 p-4 space-y-3 glow-subtle">
                <div className="h-3 w-20 rounded animate-shimmer" />
                <div className="h-7 w-24 rounded animate-shimmer" />
                <div className="h-3 w-32 rounded animate-shimmer opacity-70" />
              </div>
            ))}
          </div>
          {/* Large panel skeleton */}
          <div className="h-64 rounded-xl border border-border bg-card/70 p-6 space-y-4 glow-subtle">
            <div className="h-4 w-40 rounded animate-shimmer" />
            <div className="space-y-3 pt-2">
              <div className="h-4 w-full rounded animate-shimmer opacity-70" />
              <div className="h-4 w-5/6 rounded animate-shimmer opacity-70" />
              <div className="h-4 w-4/6 rounded animate-shimmer opacity-70" />
            </div>
          </div>
        </>
      )}

      {variant === 'cards' && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-xl border border-border bg-card/70 p-5 space-y-3 glow-subtle">
              <div className="flex justify-between">
                <div className="h-4 w-32 rounded animate-shimmer" />
                <div className="h-4 w-16 rounded animate-shimmer opacity-70" />
              </div>
              <div className="h-6 w-48 rounded animate-shimmer" />
              <div className="h-3 w-36 rounded animate-shimmer opacity-60" />
            </div>
          ))}
        </div>
      )}

      {variant === 'table' && (
        <div className="rounded-xl border border-border bg-card/70 p-4 space-y-3 glow-subtle">
          <div className="h-10 w-full rounded animate-shimmer" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 w-full rounded animate-shimmer opacity-70" />
          ))}
        </div>
      )}

      {variant === 'detail' && (
        <div className="space-y-4">
          <div className="h-48 w-full rounded-xl border border-border bg-card/70 p-6 space-y-4 glow-subtle">
            <div className="h-5 w-48 rounded animate-shimmer" />
            <div className="h-4 w-full rounded animate-shimmer opacity-70" />
            <div className="h-4 w-3/4 rounded animate-shimmer opacity-70" />
          </div>
        </div>
      )}
    </div>
  )
}
