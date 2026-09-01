import { AlertTriangle } from 'lucide-react'
import { stageSequenceFor, type BatchDirection, type BatchStage } from '@/lib/event-detail'
import { cn } from '@/lib/utils'

interface DispatchStepperProps {
  direction: BatchDirection
  stage: BatchStage
  // Stalled In Transit is an interruption layered on top of the normal
  // Planned → Loaded → In Transit → Delivered/Returned progression, not a
  // fifth step in it — so it renders as a distinct red indicator on the
  // active step rather than inserted into the sequence.
  stalled?: boolean
}

export function DispatchStepper({ direction, stage, stalled = false }: DispatchStepperProps) {
  const sequence = stageSequenceFor(direction)
  const activeIndex = sequence.indexOf(stage)

  return (
    <div className="flex items-center gap-1.5" aria-label={`Batch stage: ${stage}${stalled ? ' — stalled in transit' : ''}`}>
      {sequence.map((step, index) => (
        <div key={step} className="flex items-center gap-1.5">
          <span
            className={cn(
              'flex items-center gap-1.5 rounded-full px-2 py-1 text-[0.55rem] font-bold uppercase tracking-[0.04em] transition-colors',
              index === activeIndex
                ? stalled
                  ? 'border border-amber-400/50 bg-amber-500 text-white dark:bg-amber-600'
                  : 'bg-primary text-primary-foreground'
                : index < activeIndex
                  ? 'bg-primary/15 text-primary'
                  : 'bg-muted text-muted-foreground',
            )}
          >
            {index === activeIndex && stalled && <AlertTriangle className="size-2.5" aria-hidden="true" />}
            {step}
          </span>
          {index < sequence.length - 1 && (
            <span
              className={cn('h-px w-3 shrink-0', index < activeIndex ? 'bg-primary' : 'bg-border')}
              aria-hidden="true"
            />
          )}
        </div>
      ))}
      {stalled && (
        <span className="ml-1 inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.04em] text-amber-900 shadow-sm dark:border-amber-700/50 dark:bg-amber-950/60 dark:text-amber-200">
          <AlertTriangle className="size-2.5 text-amber-700 dark:text-amber-400" aria-hidden="true" />
          Stalled In Transit
        </span>
      )}
    </div>
  )
}
