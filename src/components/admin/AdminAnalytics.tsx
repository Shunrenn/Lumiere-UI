import { useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClickFlash } from '@/lib/use-click-flash'

/* ----------------------------- User Distribution donut ----------------------------- */

export type SegmentItem = {
  label: string
  color: string
  dot: string
  isDrillable?: boolean
}

export const MAIN_ROLE_SEGMENTS: SegmentItem[] = [
  { label: 'Admin', color: 'text-emerald-500', dot: 'bg-emerald-500', isDrillable: false },
  { label: 'Executive', color: 'text-sky-500', dot: 'bg-sky-500', isDrillable: false },
  { label: 'Warehouse Ops Manager', color: 'text-amber-500', dot: 'bg-amber-500', isDrillable: true },
  { label: 'Event Planner', color: 'text-rose-500', dot: 'bg-rose-500', isDrillable: false },
  { label: 'Field & Production Crew', color: 'text-indigo-500', dot: 'bg-indigo-500', isDrillable: true },
]

export const WOM_SUBROLE_SEGMENTS: SegmentItem[] = [
  { label: 'Warehouse Manager', color: 'text-amber-500', dot: 'bg-amber-500' },
  { label: 'Manning Officer', color: 'text-indigo-500', dot: 'bg-indigo-500' },
  { label: 'Production Manager', color: 'text-emerald-500', dot: 'bg-emerald-500' },
  { label: 'Inventory Officer', color: 'text-sky-500', dot: 'bg-sky-500' },
  { label: 'Purchasing Officer', color: 'text-rose-500', dot: 'bg-rose-500' },
]

export const GROUND_CREW_SUBROLE_SEGMENTS: SegmentItem[] = [
  { label: 'Field Crew', color: 'text-indigo-500', dot: 'bg-indigo-500' },
  { label: 'Warehouse Crew', color: 'text-sky-500', dot: 'bg-sky-500' },
  { label: 'Production Crew', color: 'text-amber-500', dot: 'bg-amber-500' },
  { label: 'Event Admin', color: 'text-emerald-500', dot: 'bg-emerald-500' },
]

export const WOM_DEFAULT_COUNTS: Record<string, number> = {
  'Warehouse Manager': 4,
  'Manning Officer': 3,
  'Production Manager': 2,
  'Inventory Officer': 2,
  'Purchasing Officer': 1,
}

export const GROUND_CREW_DEFAULT_COUNTS: Record<string, number> = {
  'Field Crew': 6,
  'Warehouse Crew': 4,
  'Production Crew': 3,
  'Event Admin': 2,
}

export function UserDistributionCard({
  counts,
  onSelect,
  compact = false,
  drillDownCategory = null,
  onDrillDown,
  onBack,
}: {
  counts: Record<string, number>
  onSelect?: () => void
  compact?: boolean
  drillDownCategory?: string | null
  onDrillDown?: (category: string) => void
  onBack?: () => void
}) {
  const segments = useMemo(() => {
    if (drillDownCategory === 'Warehouse Ops Manager') return WOM_SUBROLE_SEGMENTS
    if (drillDownCategory === 'Field & Production Crew' || drillDownCategory === 'Ground Crew') {
      return GROUND_CREW_SUBROLE_SEGMENTS
    }
    return MAIN_ROLE_SEGMENTS
  }, [drillDownCategory])

  const activeCounts = useMemo(() => {
    if (drillDownCategory === 'Warehouse Ops Manager') {
      return { ...WOM_DEFAULT_COUNTS, ...counts }
    }
    if (drillDownCategory === 'Field & Production Crew' || drillDownCategory === 'Ground Crew') {
      return { ...GROUND_CREW_DEFAULT_COUNTS, ...counts }
    }
    return counts
  }, [counts, drillDownCategory])

  const total = segments.reduce((sum, r) => sum + (activeCounts[r.label] ?? 0), 0)
  const circumference = 2 * Math.PI * 45
  const { flashing } = useClickFlash(onSelect)

  let offset = 0
  const arcs = segments.map((seg) => {
    const value = activeCounts[seg.label] ?? 0
    const fraction = total > 0 ? value / total : 0
    const dash = fraction * circumference
    const arc = { seg, dash, offset: -offset }
    offset += dash
    return arc
  })

  return (
    <div
      className={cn(
        'flex h-full flex-col rounded-xl border border-border bg-card text-left',
        compact ? 'p-4' : 'p-5',
        flashing && 'ring-2 ring-primary/60 border-primary/60',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground truncate">
          {drillDownCategory ? `${drillDownCategory} Sub-Roles` : 'User Distribution'}
        </h3>
        {drillDownCategory && onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 text-[0.65rem] font-semibold text-primary hover:underline cursor-pointer shrink-0"
          >
            <ArrowLeft className="size-3" /> Back
          </button>
        )}
      </div>

      <div className={cn('flex items-center justify-center', compact ? 'mt-4' : 'mt-6')}>
        <div className="relative inline-flex items-center justify-center">
          <svg
            className={cn('-rotate-90', compact ? 'h-24 w-24' : 'h-32 w-32')}
            viewBox="0 0 100 100"
            role="img"
            aria-label="User distribution by account type"
          >
            {arcs.map(({ seg, dash, offset: dashOffset }) => {
              const isDrillable = seg.isDrillable
              return (
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
                  className={cn(
                    seg.color,
                    'transition-[stroke-dasharray] duration-500 ease-out',
                    isDrillable && 'cursor-pointer hover:opacity-75',
                  )}
                  onClick={(e) => {
                    if (isDrillable && onDrillDown) {
                      e.stopPropagation()
                      onDrillDown(seg.label)
                    }
                  }}
                />
              )
            })}
          </svg>
          <div className="absolute text-center">
            <p className={cn('font-bold text-foreground', compact ? 'text-xl' : 'text-2xl')}>{total}</p>
            <p className="text-xs text-muted-foreground">{drillDownCategory ? 'Sub-Total' : 'Total'}</p>
          </div>
        </div>
      </div>

      <div
        className={cn(
          'text-[0.65rem]',
          compact ? 'mt-4 flex flex-col gap-1.5' : 'mt-6 grid grid-cols-2 gap-3',
        )}
      >
        {segments.map((seg) => {
          const isDrillable = 'isDrillable' in seg && seg.isDrillable
          const cnt = activeCounts[seg.label] ?? 0
          if (isDrillable && onDrillDown) {
            return (
              <button
                key={seg.label}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDrillDown(seg.label)
                }}
                className="flex items-center gap-2 rounded px-1.5 py-1 text-left transition hover:bg-primary/10 group cursor-pointer border border-transparent hover:border-primary/30"
                title={`Click to view drill-down for ${seg.label}`}
              >
                <div className={cn('size-2 shrink-0 rounded-full', seg.dot)} aria-hidden="true" />
                <span className="truncate font-medium text-foreground group-hover:text-primary">
                  {seg.label} ({cnt})
                </span>
                <span className="ml-auto text-[0.6rem] font-bold text-primary opacity-80 group-hover:opacity-100">
                  ↳
                </span>
              </button>
            )
          }
          return (
            <div key={seg.label} className="flex items-center gap-2 px-1.5 py-1">
              <div className={cn('size-2 shrink-0 rounded-full', seg.dot)} aria-hidden="true" />
              <span className="truncate">
                {seg.label} ({cnt})
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ----------------------------- Trend Analytics line chart ----------------------------- */

type TrendMode = 'growth' | 'audit'

const userGrowthData = [
  { label: 'Jan', value: 8 },
  { label: 'Feb', value: 14 },
  { label: 'Mar', value: 20 },
  { label: 'Apr', value: 18 },
  { label: 'May', value: 26 },
  { label: 'Jun', value: 32 },
]

const womGrowthData = [
  { label: 'Jan', value: 2 },
  { label: 'Feb', value: 4 },
  { label: 'Mar', value: 6 },
  { label: 'Apr', value: 8 },
  { label: 'May', value: 10 },
  { label: 'Jun', value: 12 },
]

const groundCrewGrowthData = [
  { label: 'Jan', value: 3 },
  { label: 'Feb', value: 6 },
  { label: 'Mar', value: 9 },
  { label: 'Apr', value: 11 },
  { label: 'May', value: 13 },
  { label: 'Jun', value: 15 },
]

const securityAuditData = [
  { label: 'Jan', value: 12 },
  { label: 'Feb', value: 9 },
  { label: 'Mar', value: 15 },
  { label: 'Apr', value: 8 },
  { label: 'May', value: 11 },
  { label: 'Jun', value: 6 },
]

const TREND_TABS: { value: TrendMode; label: string }[] = [
  { value: 'growth', label: 'User Growth' },
  { value: 'audit', label: 'Security Audit' },
]

export function TrendAnalyticsCard({
  onOpenGrowthSummary,
  onOpenSecurityAudit,
  drillDownCategory = null,
  onBack,
}: {
  onOpenGrowthSummary?: () => void
  onOpenSecurityAudit?: () => void
  drillDownCategory?: string | null
  onBack?: () => void
}) {
  const [mode, setMode] = useState<TrendMode>('growth')
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; label: string; value: number } | null>(null)

  const activeGrowthData = useMemo(() => {
    if (drillDownCategory === 'Warehouse Ops Manager') return womGrowthData
    if (drillDownCategory === 'Field & Production Crew' || drillDownCategory === 'Ground Crew') {
      return groundCrewGrowthData
    }
    return userGrowthData
  }, [drillDownCategory])

  const data = mode === 'growth' ? activeGrowthData : securityAuditData
  const title = drillDownCategory && mode === 'growth'
    ? `${drillDownCategory} Sub-Roles Growth`
    : (mode === 'growth' ? 'User Growth' : 'Security Audit')

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
    <div className="flex h-[24rem] flex-col rounded-xl border border-border bg-card p-5 overflow-hidden">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between shrink-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
            {drillDownCategory ? `Trend Analytics (${drillDownCategory})` : 'Trend Analytics'}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {drillDownCategory && onBack && (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1 rounded border border-border bg-muted/50 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-foreground transition hover:bg-muted cursor-pointer"
            >
              <ArrowLeft className="size-3" /> Back to Main
            </button>
          )}
          <div className="inline-flex rounded-md border border-border p-0.5" role="tablist" aria-label="Trend analytics view">
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
      </div>

      {/* keyed wrapper re-mounts on tab change so the data swap animates */}
      <div key={mode} className="admin-fade flex flex-col flex-1 min-h-0">
        <div className="mt-3 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-baseline gap-2">
            <span className="font-sans text-2xl font-bold text-foreground">{latest}</span>
            <span className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              {title} · Latest
            </span>
          </div>
          {(onOpenGrowthSummary || onOpenSecurityAudit) && (
            <button
              type="button"
              onClick={() => {
                if (mode === 'growth') onOpenGrowthSummary?.()
                else if (onOpenSecurityAudit) onOpenSecurityAudit()
                else onOpenGrowthSummary?.()
              }}
              className="rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-primary transition hover:bg-primary hover:text-primary-foreground cursor-pointer shadow-xs"
            >
              View Summary
            </button>
          )}
        </div>

        <div className="mt-2 flex-1 min-h-0 w-full flex items-center justify-center">
          <svg
            viewBox={`0 0 ${geometry.w} ${geometry.h}`}
            className="w-full h-full max-h-[195px]"
            role="img"
            aria-label={`${title} trend chart`}
          >
            <defs>
              <linearGradient id="admin-trend-fill" x1="0" y1="0" x2="0" y2="1">
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

            <path d={geometry.areaPath} fill="url(#admin-trend-fill)" />
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
                  {/* Transparent enlarged hit target for easy mouse hover */}
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r="16"
                    fill="transparent"
                    onMouseEnter={() => setHoveredPoint(p)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                  {/* Data point circle node */}
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
                  x="-48"
                  y={hoveredPoint.y < 45 ? '10' : '-28'}
                  width="96"
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
                  {hoveredPoint.label}: {hoveredPoint.value} {mode === 'growth' ? 'users' : 'logs'}
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  )
}
