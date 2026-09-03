import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useClickFlash } from '@/lib/use-click-flash'

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

const damageAdjudicationData = [
  { label: 'Jan', value: 14 },
  { label: 'Feb', value: 19 },
  { label: 'Mar', value: 12 },
  { label: 'Apr', value: 8 },
  { label: 'May', value: 15 },
  { label: 'Jun', value: 6 },
]

const TREND_TABS: { value: TrendMode; label: string }[] = [
  { value: 'events', label: 'Event Activity' },
  { value: 'damage', label: 'Damage Adjudication' },
]

export function ExecutiveTrendAnalyticsCard({
  onViewRegistry,
}: {
  onViewRegistry?: () => void
}) {
  const [mode, setMode] = useState<TrendMode>('events')
  const data = mode === 'events' ? eventActivityData : damageAdjudicationData
  const title = mode === 'events' ? 'Event Activity' : 'Damage Adjudication'

  const geometry = useMemo(() => {
    const w = 640
    const h = 240
    const padX = 40
    const padY = 24
    const max = Math.max(...data.map((d) => d.value), 1)
    const range = max || 1
    const stepX = (w - padX * 2) / Math.max(data.length - 1, 1)

    const points = data.map((d, i) => {
      const x = padX + i * stepX
      const y = padY + (h - padY * 2) * (1 - d.value / range)
      return { x, y, ...d }
    })

    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ')
    const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${h - padY} L ${points[0].x.toFixed(1)} ${h - padY} Z`

    const grid = Array.from({ length: 5 }, (_, i) => {
      const t = i / 4
      const y = padY + (h - padY * 2) * t
      const value = Math.round(max - range * t)
      return { y, value }
    })

    return { w, h, padX, padY, points, linePath, areaPath, grid }
  }, [data])

  const latest = data[data.length - 1]?.value ?? 0

  return (
    <div className="flex h-[24rem] flex-col overflow-hidden rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
              onClick={() => setMode(tab.value)}
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

      <div key={mode} className="admin-fade">
        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-2">
            <span className="font-sans text-2xl font-bold text-card-foreground">{latest}</span>
            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {title} · Latest
            </span>
          </div>
          {onViewRegistry && (
            <button
              type="button"
              onClick={onViewRegistry}
              className="rounded-md px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-primary transition hover:bg-primary/10"
            >
              View Portfolios
            </button>
          )}
        </div>

        <svg
          viewBox={`0 0 ${geometry.w} ${geometry.h}`}
          className="mt-4 w-full"
          role="img"
          aria-label={`${title} trend chart`}
          style={{ minHeight: '200px' }}
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

          {geometry.points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r="3.5"
                className="fill-card stroke-primary"
                strokeWidth="2"
              />
              <text
                x={p.x}
                y={geometry.h - 6}
                textAnchor="middle"
                className="fill-muted-foreground"
                style={{ fontSize: '10px' }}
              >
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}
