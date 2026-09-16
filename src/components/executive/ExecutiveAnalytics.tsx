import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useClickFlash } from '@/lib/use-click-flash'
import { X, TrendingUp, ShieldAlert, CheckCircle2 } from 'lucide-react'

/* ----------------------------- Stat Card ----------------------------- */

export function ExecutiveStatCard({
  label,
  value,
  caption,
  agentSelector,
  onSelect,
}: {
  label: string
  value: string
  caption: string
  agentSelector?: string
  onSelect?: () => void
}) {
  const { flashing, trigger } = useClickFlash(onSelect)
  const Tag = onSelect ? 'button' : 'div'
  return (
    <Tag
      type={onSelect ? 'button' : undefined}
      onClick={onSelect ? trigger : undefined}
      className={cn(
        'flex flex-col rounded-xl border border-border bg-card p-4 text-left',
        onSelect && 'cursor-pointer transition hover:border-primary/40 hover:bg-muted/40',
        flashing && 'ring-2 ring-primary/60 border-primary/60',
      )}
      {...(agentSelector ? { [agentSelector]: '' } : {})}
    >
      <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 font-sans text-2xl font-bold leading-none text-card-foreground">{value}</p>
      <p className="mt-2 text-[0.7rem] italic text-muted-foreground">{caption}</p>
    </Tag>
  )
}

/* ----------------------------- Event Distribution Donut ----------------------------- */

const EVENT_SEGMENTS = [
  { label: 'Completed', color: 'text-emerald-500', dot: 'bg-emerald-500' },
  { label: 'In Production', color: 'text-sky-500', dot: 'bg-sky-500' },
  { label: 'Reserved', color: 'text-indigo-500', dot: 'bg-indigo-500' },
  { label: 'Initialized', color: 'text-amber-500', dot: 'bg-amber-500' },
  { label: 'On Hold', color: 'text-rose-500', dot: 'bg-rose-500' },
]

export function EventDistributionCard({
  counts,
  onSelect,
  compact = false,
}: {
  counts: Record<string, number>
  onSelect?: () => void
  compact?: boolean
}) {
  const total = EVENT_SEGMENTS.reduce((sum, s) => sum + (counts[s.label] ?? 0), 0)
  const circumference = 2 * Math.PI * 45
  const { flashing, trigger } = useClickFlash(onSelect)

  let offset = 0
  const arcs = EVENT_SEGMENTS.map((seg) => {
    const value = counts[seg.label] ?? 0
    const fraction = total > 0 ? value / total : 0
    const dash = fraction * circumference
    const arc = { seg, dash, offset: -offset }
    offset += dash
    return arc
  })

  return (
    <button
      type="button"
      onClick={trigger}
      disabled={!onSelect}
      className={cn(
        'flex h-full flex-col rounded-xl border border-border bg-card text-left',
        compact ? 'p-4' : 'p-5',
        onSelect && 'cursor-pointer transition hover:border-primary/40 hover:bg-muted/40',
        flashing && 'ring-2 ring-primary/60 border-primary/60',
      )}
    >
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
        Event Distribution
      </h3>
      <div className={cn('flex items-center justify-center', compact ? 'mt-4' : 'mt-6')}>
        <div className="relative inline-flex items-center justify-center">
          <svg
            className={cn('-rotate-90', compact ? 'h-24 w-24' : 'h-32 w-32')}
            viewBox="0 0 100 100"
            role="img"
            aria-label="Event distribution by production stage"
          >
            {arcs.map(({ seg, dash, offset: dashOffset }) => (
              <circle
                key={seg.label}
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={dashOffset}
                className={cn(seg.color, 'transition-[stroke-dasharray] duration-500 ease-out')}
              />
            ))}
          </svg>
          <div className="absolute text-center">
            <p className={cn('font-bold text-foreground', compact ? 'text-xl' : 'text-2xl')}>{total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
      </div>
      <div
        className={cn(
          'text-[0.65rem]',
          compact ? 'mt-4 flex flex-col gap-1.5' : 'mt-6 grid grid-cols-2 gap-3',
        )}
      >
        {EVENT_SEGMENTS.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <div className={cn('size-2 shrink-0 rounded-full', seg.dot)} aria-hidden="true" />
            <span className="truncate">
              {seg.label} ({counts[seg.label] ?? 0})
            </span>
          </div>
        ))}
      </div>
    </button>
  )
}

/* ----------------------------- Report Distribution Donut ----------------------------- */

const REPORT_SEGMENTS = [
  { label: 'Pending Verdict', color: 'text-amber-500', dot: 'bg-amber-500' },
  { label: 'Validated', color: 'text-emerald-500', dot: 'bg-emerald-500' },
  { label: 'Held for Audit', color: 'text-rose-500', dot: 'bg-rose-500' },
  { label: 'Second Sign-off', color: 'text-purple-500', dot: 'bg-purple-500' },
  { label: 'Dismissed', color: 'text-muted-foreground', dot: 'bg-muted-foreground' },
]

export function ReportDistributionCard({
  counts,
  onSelect,
  compact = false,
}: {
  counts: Record<string, number>
  onSelect?: () => void
  compact?: boolean
}) {
  const total = REPORT_SEGMENTS.reduce((sum, s) => sum + (counts[s.label] ?? 0), 0)
  const circumference = 2 * Math.PI * 45
  const { flashing, trigger } = useClickFlash(onSelect)

  let offset = 0
  const arcs = REPORT_SEGMENTS.map((seg) => {
    const value = counts[seg.label] ?? 0
    const fraction = total > 0 ? value / total : 0
    const dash = fraction * circumference
    const arc = { seg, dash, offset: -offset }
    offset += dash
    return arc
  })

  return (
    <button
      type="button"
      onClick={trigger}
      disabled={!onSelect}
      className={cn(
        'flex h-full flex-col rounded-xl border border-border bg-card text-left',
        compact ? 'p-4' : 'p-5',
        onSelect && 'cursor-pointer transition hover:border-primary/40 hover:bg-muted/40',
        flashing && 'ring-2 ring-primary/60 border-primary/60',
      )}
    >
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
        Report Distribution
      </h3>
      <div className={cn('flex items-center justify-center', compact ? 'mt-4' : 'mt-6')}>
        <div className="relative inline-flex items-center justify-center">
          <svg
            className={cn('-rotate-90', compact ? 'h-24 w-24' : 'h-32 w-32')}
            viewBox="0 0 100 100"
            role="img"
            aria-label="Report distribution by verdict status"
          >
            {arcs.map(({ seg, dash, offset: dashOffset }) => (
              <circle
                key={seg.label}
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={dashOffset}
                className={cn(seg.color, 'transition-[stroke-dasharray] duration-500 ease-out')}
              />
            ))}
          </svg>
          <div className="absolute text-center">
            <p className={cn('font-bold text-foreground', compact ? 'text-xl' : 'text-2xl')}>{total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
        </div>
      </div>
      <div
        className={cn(
          'text-[0.65rem]',
          compact ? 'mt-4 flex flex-col gap-1.5' : 'mt-6 grid grid-cols-2 gap-3',
        )}
      >
        {REPORT_SEGMENTS.map((seg) => (
          <div key={seg.label} className="flex items-center gap-2">
            <div className={cn('size-2 shrink-0 rounded-full', seg.dot)} aria-hidden="true" />
            <span className="truncate">
              {seg.label} ({counts[seg.label] ?? 0})
            </span>
          </div>
        ))}
      </div>
    </button>
  )
}

/* ----------------------------- Trend Analytics Line Chart ----------------------------- */

type TrendMode = 'events' | 'damage'

const eventActivityData = [
  { label: 'Jan', value: 6 },
  { label: 'Feb', value: 11 },
  { label: 'Mar', value: 18 },
  { label: 'Apr', value: 15 },
  { label: 'May', value: 24 },
  { label: 'Jun', value: 29 },
]

const damageOversightData = [
  { label: 'Jan', value: 14 },
  { label: 'Feb', value: 19 },
  { label: 'Mar', value: 12 },
  { label: 'Apr', value: 8 },
  { label: 'May', value: 15 },
  { label: 'Jun', value: 6 },
]

const TREND_TABS: { value: TrendMode; label: string }[] = [
  { value: 'events', label: 'Event Activity' },
  { value: 'damage', label: 'Damage Oversight' },
]

/* ----------------------------- Executive Portfolio Summary Modal ----------------------------- */

function ExecutivePortfolioSummaryModal({
  open,
  mode,
  onClose,
}: {
  open: boolean
  mode: TrendMode
  onClose: () => void
}) {
  if (!open) return null

  const isEvents = mode === 'events'

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Executive Portfolio Trend Summary"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border px-6 py-4">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              {isEvents ? <TrendingUp className="size-4.5" /> : <ShieldAlert className="size-4.5" />}
            </span>
            <div>
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Executive Trend Analysis
              </p>
              <h2 className="mt-0.5 font-serif text-xl font-medium leading-tight text-card-foreground">
                {isEvents ? 'Event Activity Summary' : 'Damage Oversight Summary'}
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
        <div className="flex-1 overflow-y-auto px-6 py-5 text-sm leading-relaxed text-muted-foreground space-y-4">
          <div className="rounded-lg bg-muted/50 p-4">
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-foreground">
              {isEvents ? '6-Month Portfolio Velocity' : '6-Month Risk Reduction Metric'}
            </p>
            <p className="mt-1 text-xs leading-relaxed">
              {isEvents
                ? 'Event creation and production clearance increased by +383% from Jan (6 events) to Jun (29 events), reflecting company portfolio expansion.'
                : 'Post-event damage filings decreased from 14 cases (Jan) to 6 cases (Jun), representing a 57% reduction in post-event equipment damage rates.'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[0.55rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {isEvents ? 'Total Portfolios' : 'Total Claims'}
              </p>
              <p className="mt-1 font-sans text-xl font-bold text-foreground">
                {isEvents ? '93' : '74'}
              </p>
              <p className="text-[0.65rem] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                {isEvents ? '+18% MoM' : '-12% MoM'}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[0.55rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {isEvents ? 'Avg SLA Rate' : 'Resolution Time'}
              </p>
              <p className="mt-1 font-sans text-xl font-bold text-foreground">
                {isEvents ? '99.4%' : '< 18 hrs'}
              </p>
              <p className="text-[0.65rem] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                On-time delivery
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-3">
              <p className="text-[0.55rem] font-semibold uppercase tracking-wider text-muted-foreground">
                {isEvents ? 'Active Venues' : 'WOM Audit Holds'}
              </p>
              <p className="mt-1 font-sans text-xl font-bold text-foreground">
                {isEvents ? '14' : '2 pending'}
              </p>
              <p className="text-[0.65rem] text-muted-foreground font-medium mt-0.5">
                {isEvents ? 'Established estates' : 'Awaiting WOM sign-off'}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-foreground mb-2">
              Monthly Trend Breakdown
            </p>
            <div className="overflow-hidden rounded-lg border border-border">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3.5 py-2 font-semibold text-foreground">Month</th>
                    <th className="px-3.5 py-2 font-semibold text-foreground">
                      {isEvents ? 'Event Volume' : 'Damage Claims'}
                    </th>
                    <th className="px-3.5 py-2 font-semibold text-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(isEvents ? eventActivityData : damageOversightData).map((row, i, arr) => (
                    <tr
                      key={row.label}
                      className={i < arr.length - 1 ? 'border-b border-border' : ''}
                    >
                      <td className="px-3.5 py-2 font-medium text-foreground">{row.label} 2026</td>
                      <td className="px-3.5 py-2 font-mono font-semibold text-foreground">
                        {row.value} {isEvents ? 'portfolios' : 'exceptions'}
                      </td>
                      <td className="px-3.5 py-2 text-muted-foreground">
                        <span className="inline-flex items-center gap-1 text-[0.65rem]">
                          <CheckCircle2 className="size-3 text-emerald-500" />
                          Verified
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-border px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-card-foreground transition hover:bg-muted"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export function ExecutiveTrendAnalyticsCard({
  onViewRegistry: _onViewRegistry,
}: {
  onViewRegistry?: () => void
} = {}) {
  const [mode, setMode] = useState<TrendMode>('events')
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; label: string; value: number } | null>(null)
  const data = mode === 'events' ? eventActivityData : damageOversightData
  const title = mode === 'events' ? 'Event Activity' : 'Damage Oversight'

  const geometry = useMemo(() => {
    const w = 640
    const h = 210
    const padX = 40
    const padTop = 16
    const padBottom = 28
    const max = Math.max(...data.map((d) => d.value), 1)
    const range = max || 1
    const stepX = (w - padX * 2) / Math.max(data.length - 1, 1)

    const points = data.map((d, i) => {
      const x = padX + i * stepX
      const y = padTop + (h - padTop - padBottom) * (1 - d.value / range)
      return { x, y, ...d }
    })

    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ')
    const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${h - padBottom} L ${points[0].x.toFixed(1)} ${h - padBottom} Z`

    const grid = Array.from({ length: 4 }, (_, i) => {
      const t = i / 3
      const y = padTop + (h - padTop - padBottom) * t
      const value = Math.round(max - range * t)
      return { y, value }
    })

    return { w, h, padX, padTop, padBottom, points, linePath, areaPath, grid }
  }, [data])

  const latest = data[data.length - 1]?.value ?? 0

  return (
    <>
      <div className="flex h-[24rem] flex-col rounded-xl border border-border bg-card p-5 overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
            Trend Analytics
          </h3>
          <div className="inline-flex rounded-md border border-border p-0.5" role="tablist" aria-label="Executive trend view">
            {TREND_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={mode === tab.value}
                onClick={() => {
                  setHoveredPoint(null)
                  setMode(tab.value)
                }}
                className={cn(
                  'rounded px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] transition',
                  mode === tab.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div key={mode} className="admin-fade flex flex-col flex-1 min-h-0">
          <div className="mt-3 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-baseline gap-2">
              <span className="font-sans text-2xl font-bold text-foreground">{latest}</span>
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                {title} · Latest
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSummaryOpen(true)}
              className="rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-primary transition hover:bg-primary hover:text-primary-foreground cursor-pointer shadow-xs"
            >
              View Summary
            </button>
          </div>

          <div className="mt-2 flex-1 min-h-0 w-full flex items-center justify-center">
            <svg
              viewBox={`0 0 ${geometry.w} ${geometry.h}`}
              className="w-full h-full max-h-[195px]"
              role="img"
              aria-label={`${title} trend chart`}
            >
              <defs>
                <linearGradient id="exec-trend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                </linearGradient>
              </defs>

              {geometry.grid.map((g, i) => (
                <g key={i}>
                  <line
                    x1={geometry.padX}
                    x2={geometry.w - geometry.padX}
                    y1={g.y}
                    y2={g.y}
                    stroke="var(--color-border)"
                    strokeWidth="1"
                    strokeDasharray="3 4"
                  />
                  <text
                    x={geometry.padX - 8}
                    y={g.y + 3}
                    textAnchor="end"
                    className="fill-muted-foreground"
                    style={{ fontSize: '10px' }}
                  >
                    {g.value}
                  </text>
                </g>
              ))}

              <path d={geometry.areaPath} fill="url(#exec-trend-fill)" />

              <path
                d={geometry.linePath}
                fill="none"
                stroke="var(--color-primary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {geometry.points.map((p, i) => {
                const isHovered = hoveredPoint?.label === p.label
                return (
                  <g key={i} className="group cursor-pointer">
                    {/* Transparent hit target for hover */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="16"
                      fill="transparent"
                      onMouseEnter={() => setHoveredPoint(p)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                    {/* Circle node */}
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={isHovered ? 6 : 3.5}
                      fill="var(--color-card)"
                      stroke="var(--color-primary)"
                      strokeWidth={isHovered ? 3 : 2}
                      className="transition-all duration-150 pointer-events-none"
                    />
                    {/* Month label */}
                    <text
                      x={p.x}
                      y={geometry.h - 8}
                      textAnchor="middle"
                      className={cn(
                        'transition-colors text-[10px]',
                        isHovered ? 'fill-primary font-bold' : 'fill-muted-foreground',
                      )}
                    >
                      {p.label}
                    </text>
                  </g>
                )
              })}

              {/* Hover Tooltip Popup */}
              {hoveredPoint && (
                <g
                  className="pointer-events-none admin-fade"
                  transform={`translate(${hoveredPoint.x}, ${hoveredPoint.y})`}
                >
                  <rect
                    x="-45"
                    y={hoveredPoint.y < 45 ? '10' : '-28'}
                    width="90"
                    height="22"
                    rx="5"
                    className="fill-popover stroke-border shadow-xl"
                  />
                  <text
                    x="0"
                    y={hoveredPoint.y < 45 ? '25' : '-13'}
                    textAnchor="middle"
                    className="fill-popover-foreground text-[10px] font-semibold"
                  >
                    {hoveredPoint.label}: {hoveredPoint.value} {mode === 'events' ? 'events' : 'claims'}
                  </text>
                </g>
              )}
            </svg>
          </div>
        </div>
      </div>

      <ExecutivePortfolioSummaryModal
        open={summaryOpen}
        mode={mode}
        onClose={() => setSummaryOpen(false)}
      />
    </>
  )
}
