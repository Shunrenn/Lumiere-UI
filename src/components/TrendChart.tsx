import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface ToggleOption {
  value: string
  label: string
}

interface Props {
  mode: string
  onModeChange?: (mode: string) => void
  options: [ToggleOption, ToggleOption]
}

// Mock trend data for the executive dashboard chart
const userGrowthData = [
  { label: 'Jan', value: 8 },
  { label: 'Feb', value: 14 },
  { label: 'Mar', value: 20 },
  { label: 'Apr', value: 18 },
  { label: 'May', value: 26 },
  { label: 'Jun', value: 32 },
]

const securityAuditData = [
  { label: 'Jan', value: 12 },
  { label: 'Feb', value: 9 },
  { label: 'Mar', value: 15 },
  { label: 'Apr', value: 8 },
  { label: 'May', value: 11 },
  { label: 'Jun', value: 6 },
]

// Lightweight SVG line/area chart with proper responsive sizing
export function TrendChart({ mode, onModeChange, options }: Props) {
  // The first toggle option maps to the "growth" data set, the second to the
  // "audit"/secondary data set — keeps the chart generic across dashboards.
  const isPrimary = mode === options[0].value
  const data = isPrimary ? userGrowthData : securityAuditData
  const title = isPrimary ? options[0].label : options[1].label
  const unit = ''

  const geometry = useMemo(() => {
    const w = 640
    const h = 240
    const padX = 40
    const padY = 24
    const max = Math.max(...data.map((d) => d.value), 1)
    const min = 0
    const range = max - min || 1
    const stepX = (w - padX * 2) / Math.max(data.length - 1, 1)

    const points = data.map((d, i) => {
      const x = padX + i * stepX
      const y = padY + (h - padY * 2) * (1 - (d.value - min) / range)
      return { x, y, ...d }
    })

    const linePath = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
      .join(' ')
    const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)} ${h - padY} L ${points[0].x.toFixed(1)} ${h - padY} Z`

    // 4 horizontal gridlines with value labels.
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
    <div className="w-full rounded-xl border border-border bg-card p-5">
      {/* Panel title + data toggle */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-foreground">
          Trend Analytics
        </h3>
        <div className="inline-flex rounded-md border border-border p-0.5">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onModeChange?.(opt.value)}
              className={cn(
                'rounded px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] transition',
                mode === opt.value
                  ? 'bg-neutral-900 text-white'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-2">
        <span className="font-sans text-2xl font-bold text-card-foreground">
          {latest}
          {unit}
        </span>
        <span className="text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {title} · Latest
        </span>
      </div>

      <svg
        viewBox={`0 0 ${geometry.w} ${geometry.h}`}
        className="mt-4 w-full"
        role="img"
        aria-label={`${title} trend chart`}
        style={{ minHeight: '200px' }}
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Gridlines and value labels */}
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

        {/* Area fill */}
        <path d={geometry.areaPath} fill="url(#trend-fill)" />

        {/* Line */}
        <path
          d={geometry.linePath}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points and labels */}
        {geometry.points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="3.5"
              fill="var(--color-card)"
              stroke="var(--color-primary)"
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
  )
}
