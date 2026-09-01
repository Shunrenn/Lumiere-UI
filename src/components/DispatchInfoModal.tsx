import { X, MapPin, Calendar, Truck } from 'lucide-react'

export interface DispatchInfo {
  title: string
  venue: string
  date: string
  progress: number
}

interface Props {
  dispatch: DispatchInfo | null
  onClose: () => void
}

export function DispatchInfoModal({ dispatch, onClose }: Props) {
  if (!dispatch) return null

  const remaining = 100 - dispatch.progress

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Dispatch details for ${dispatch.title}`}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between bg-sidebar px-6 py-5 text-sidebar-foreground">
          <div className="min-w-0">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/60">
              Dispatch Records
            </p>
            <h2 className="mt-1 font-serif text-2xl font-medium leading-tight text-sidebar-primary text-balance">
              {dispatch.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sidebar-foreground/70 transition hover:text-sidebar-primary"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Venue
                </p>
                <p className="mt-0.5 text-sm text-card-foreground">{dispatch.venue}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 size-4 shrink-0 text-primary" />
              <div>
                <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Target Date
                </p>
                <p className="mt-0.5 text-sm text-card-foreground">{dispatch.date}</p>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="rounded-lg border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-2">
              <Truck className="size-4 text-primary" />
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {dispatch.progress}% Dispatched · {remaining}% Pending
              </p>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${dispatch.progress}%` }}
              />
            </div>
          </div>

          <div>
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Operational Notes
            </p>
            <p className="mt-1 text-sm italic leading-relaxed text-muted-foreground">
              Logistics crew assigned and staged. Remaining freight scheduled for final
              installation window. All vendor contracts verified against the master manifest.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-border px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-primary px-6 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
