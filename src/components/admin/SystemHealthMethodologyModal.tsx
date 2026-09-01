import { Activity, X } from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
}

const SERVICE_BREAKDOWN: { service: string; uptime: string; note: string }[] = [
  { service: 'Admin Console', uptime: '99.98%', note: 'No incidents in the last 30 days' },
  { service: 'Warehouse Ops', uptime: '99.91%', note: '1 brief sync delay, resolved automatically' },
  { service: 'Event Dashboard', uptime: '99.87%', note: '2 short outages during scheduled maintenance' },
]

// Explains how the "99.9% · 30-day rolling uptime" figure on the System
// Dashboard is calculated. Opened from the System Health stat card.
export function SystemHealthMethodologyModal({ open, onClose }: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="System Health Methodology"
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
                Admin Console
              </p>
              <h2 className="mt-0.5 font-serif text-xl font-medium leading-tight text-card-foreground">
                System Health Methodology
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
            <span className="font-semibold text-foreground">blended, 30-day rolling uptime</span>{' '}
            across every service Lumière staff depend on. It is not a single server's status — it
            weighs three services equally and averages their individual availability.
          </p>

          <div className="mt-4 rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-foreground">
              Measurement approach
            </p>
            <p className="mt-1.5 text-xs leading-relaxed">
              Each service responds to a periodic heartbeat ping. A minute counts as downtime only
              once a service fails three consecutive pings, which filters out brief network blips
              that never actually interrupted staff.
            </p>
          </div>

          <div className="mt-4 rounded-lg bg-muted/50 px-4 py-3">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-foreground">
              Formula
            </p>
            <p className="mt-1.5 font-mono text-xs leading-relaxed text-foreground">
              uptime % = (total minutes − downtime minutes) ÷ total minutes × 100
            </p>
            <p className="mt-1.5 text-xs leading-relaxed">
              calculated per service over the trailing 30 days, then averaged across all services.
            </p>
          </div>

          <p className="mt-4 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-foreground">
            Per-service breakdown
          </p>
          <div className="mt-2 overflow-hidden rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3.5 py-2 font-semibold text-foreground">Service</th>
                  <th className="px-3.5 py-2 font-semibold text-foreground">Uptime</th>
                  <th className="px-3.5 py-2 font-semibold text-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {SERVICE_BREAKDOWN.map((row) => (
                  <tr key={row.service} className="border-b border-border/60 last:border-0">
                    <td className="px-3.5 py-2.5 font-medium text-foreground">{row.service}</td>
                    <td className="px-3.5 py-2.5 text-foreground">{row.uptime}</td>
                    <td className="px-3.5 py-2.5 text-muted-foreground">{row.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
