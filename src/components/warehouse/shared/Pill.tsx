import { toneClasses, toneDot, type Tone } from '@/components/warehouse/event-detail/status-tone'
import { cn } from '@/lib/utils'

interface PillProps {
  tone: Tone
  children: React.ReactNode
  className?: string
}

// Shared status/priority pill built on the app-wide 5-color tone system —
// reused across Asset Catalog, Replenishment, and Vendor Management so the
// three new modules read as one consistent visual language.
export function Pill({ tone, children, className }: PillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em]',
        toneClasses[tone],
        className,
      )}
    >
      <span className={cn('size-1.5 shrink-0 rounded-full', toneDot[tone])} aria-hidden="true" />
      {children}
    </span>
  )
}
