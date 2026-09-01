import { Activity, X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

const METRIC_BREAKDOWN: { metric: string; score: string; note: string }[] = [
  { metric: 'Event Execution SLA', score: '99.2%', note: 'On-time delivery and milestone clearance across all active portfolios' },
  { metric: 'Equipment Readiness', score: '98.4%', note: 'Verified catalog availability and zero unmitigated critical deficits' },
  { metric: 'Damage Resolution Velocity', score: '98.0%', note: 'Average turnaround under 24h for post-event damage verdicts' },
]

export function PortfolioHealthMethodologyModal({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Portfolio Health Methodology"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Activity className="size-4.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Executive Console
              </p>
              <h2 className="mt-0.5 font-serif text-xl font-medium leading-tight text-card-foreground">
                Portfolio Health Methodology
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground transition hover:text-foreground"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-muted-foreground">
          <p>
            The figure shown on the dashboard is a{' '}
            <span className="font-semibold text-foreground">blended, 30-day operational readiness index</span>{' '}
            measuring fulfillment reliability, asset availability, and incident adjudication across luxury event operations.
          </p>

          <div className="mt-4 rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-foreground">
              Core Measurement Factors
            </p>
            <p className="mt-1.5 text-xs leading-relaxed">
              Weighs on-time dispatch completion, inventory safety margins, and timely damage resolution
              to provide executives with a single, clear health indicator for company-wide operations.
            </p>
          </div>

          <div className="mt-4 rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-foreground">
              Calculation Index
            </p>
            <p className="mt-1.5 font-mono text-xs leading-relaxed text-foreground">
              health index = (execution SLA × 0.4) + (asset readiness × 0.35) + (damage resolution × 0.25)
            </p>
            <p className="mt-1.5 text-xs leading-relaxed">
              evaluated across all active and completed event portfolios over a rolling 30-day window.
            </p>
          </div>

          <p className="mt-4 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-foreground">
            Operational Dimension Breakdown
          </p>
          <div className="mt-2 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3.5 py-2 font-semibold text-foreground">Dimension</th>
                  <th className="px-3.5 py-2 font-semibold text-foreground">Score</th>
                  <th className="px-3.5 py-2 font-semibold text-foreground">Status</th>
                </tr>
              </thead>
              <tbody>
                {METRIC_BREAKDOWN.map((row, i) => (
                  <tr
                    key={row.metric}
                    className={i < METRIC_BREAKDOWN.length - 1 ? 'border-b border-border' : ''}
                  >
                    <td className="px-3.5 py-2.5 font-medium text-foreground">{row.metric}</td>
                    <td className="px-3.5 py-2.5 font-mono text-emerald-600 dark:text-emerald-400">
                      {row.score}
                    </td>
                    <td className="px-3.5 py-2.5 text-muted-foreground">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-border px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-card-foreground transition hover:bg-muted"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
