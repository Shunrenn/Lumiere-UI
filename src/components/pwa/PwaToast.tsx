import { cn } from '@/lib/utils'

interface PwaToastProps {
  message: string
  className?: string
}

/**
 * Shared PWA toast notification HUD.
 * Render conditionally — only mount when `message` is non-empty.
 *
 * @example
 * {toast && <PwaToast message={toast} />}
 */
export function PwaToast({ message, className }: PwaToastProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-[400px] -translate-x-1/2',
        'rounded-2xl border border-primary/30 bg-card px-4 py-3.5',
        'text-center text-xs font-semibold text-foreground',
        'shadow-2xl backdrop-blur-md',
        'animate-in fade-in slide-in-from-bottom-2 duration-200',
        className
      )}
    >
      {message}
    </div>
  )
}
