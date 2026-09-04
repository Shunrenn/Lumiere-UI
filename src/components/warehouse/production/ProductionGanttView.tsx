import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Flag,
  Moon,
  Sun,
  Users,
  Zap,
} from 'lucide-react'
import {
  getDailyCapacityOverAllocations,
  type ProductionItem,
} from '@/lib/warehouse-production'
import { formatSmartDuration } from '@/lib/warehouse-catalog'
import { usePortal } from '@/lib/store'
import { getCrewPool } from '@/lib/warehouse-crew'
import { cn } from '@/lib/utils'

interface ProductionGanttViewProps {
  items: ProductionItem[]
  onOpenItem: (item: ProductionItem) => void
  onFlagDelay: (item: ProductionItem) => void
}

export function ProductionGanttView({ items, onOpenItem, onFlagDelay }: ProductionGanttViewProps) {
  const { staff } = usePortal()
  const [viewMode, setViewMode] = useState<'grouped' | 'consolidated'>('grouped')
  const [startDateOffset, setStartDateOffset] = useState(0) // in days

  const today = useMemo(() => new Date(), [])
  const fabCrewCount = useMemo(() => getCrewPool(staff).length || 8, [staff])

  // Generate 14 continuous days for the Gantt timeline header
  const timelineDates = useMemo(() => {
    const dates: { dateStr: string; dayLabel: string; monthLabel: string; isToday: boolean; dateObj: Date }[] = []
    const start = new Date(today)
    start.setDate(start.getDate() + startDateOffset - 2)

    for (let i = 0; i < 14; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      const dateStr = d.toISOString().slice(0, 10)
      const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' })
      const monthLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      const isToday = dateStr === today.toISOString().slice(0, 10)
      dates.push({ dateStr, dayLabel, monthLabel, isToday, dateObj: d })
    }
    return dates
  }, [today, startDateOffset])

  const windowStartDateStr = timelineDates[0]?.dateStr || ''
  const windowEndDateStr = timelineDates[timelineDates.length - 1]?.dateStr || ''

  // Aggregate Capacity Over-Allocation check across these 14 days
  const capacityAlerts = useMemo(() => {
    return getDailyCapacityOverAllocations(items, fabCrewCount, 14, windowStartDateStr)
  }, [items, fabCrewCount, windowStartDateStr])

  const overAllocatedDays = useMemo(() => {
    return capacityAlerts.filter((a) => a.isOverAllocated)
  }, [capacityAlerts])

  // Group items by event or consolidated
  const groupedSections = useMemo(() => {
    if (viewMode === 'consolidated') {
      return [{ title: 'All Bespoke Production Jobs', eventId: 'all', items }]
    }
    const map = new Map<string, { title: string; eventId: string; items: ProductionItem[] }>()
    items.forEach((item) => {
      const key = item.eventId || 'general'
      if (!map.has(key)) {
        map.set(key, {
          title: item.eventTitle || 'General / Cross-Event Fabrication',
          eventId: key,
          items: [],
        })
      }
      map.get(key)!.items.push(item)
    })
    return Array.from(map.values())
  }, [items, viewMode])

  // Helper to calculate start & span columns in the 14-day grid
  const getBarPosition = (startStr: string, endStr: string) => {
    const startIndex = timelineDates.findIndex((d) => d.dateStr === startStr)
    const endIndex = timelineDates.findIndex((d) => d.dateStr === endStr)

    // Out of view check
    if (endStr < windowStartDateStr || startStr > windowEndDateStr) {
      return null
    }

    const effectiveStartCol = startIndex === -1 ? (startStr < windowStartDateStr ? 0 : 13) : startIndex
    const effectiveEndCol = endIndex === -1 ? (endStr > windowEndDateStr ? 13 : 0) : endIndex
    const span = Math.max(1, effectiveEndCol - effectiveStartCol + 1)

    return {
      startCol: effectiveStartCol + 1, // 1-indexed CSS grid column
      span,
      clampedLeft: startIndex === -1 && startStr < windowStartDateStr,
      clampedRight: endIndex === -1 && endStr > windowEndDateStr,
    }
  }

  return (
    <div className="flex flex-col gap-4 text-xs">
      {/* View Switcher & Timeline Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/80 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">View:</span>
          <div className="inline-flex rounded-md border border-border bg-background p-1">
            <button
              type="button"
              onClick={() => setViewMode('grouped')}
              className={cn(
                'rounded-sm px-3 py-1 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                viewMode === 'grouped' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              Event-Grouped
            </button>
            <button
              type="button"
              onClick={() => setViewMode('consolidated')}
              className={cn(
                'rounded-sm px-3 py-1 text-[0.6rem] font-bold uppercase tracking-[0.08em] transition',
                viewMode === 'consolidated' ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              Consolidated
            </button>
          </div>
        </div>

        {/* Date Navigator */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStartDateOffset((prev) => prev - 7)}
            className="flex size-7 items-center justify-center rounded border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Previous week"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setStartDateOffset(0)}
            className="rounded border border-border bg-card px-2.5 py-1 text-[0.6rem] font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setStartDateOffset((prev) => prev + 7)}
            className="flex size-7 items-center justify-center rounded border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
            title="Next week"
          >
            <ChevronRight className="size-4" />
          </button>
          <span className="font-mono text-[0.62rem] text-muted-foreground pl-1">
            {timelineDates[0]?.monthLabel} – {timelineDates[timelineDates.length - 1]?.monthLabel}
          </span>
        </div>
      </div>

      {/* Aggregate Capacity Warning Banner */}
      {overAllocatedDays.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <p className="font-bold text-[0.68rem] uppercase tracking-wider text-amber-800 dark:text-amber-300">
              Workshop Crew Over-Allocation Alert ({overAllocatedDays.length} date{overAllocatedDays.length === 1 ? '' : 's'})
            </p>
            <p className="text-[0.65rem] text-muted-foreground mt-0.5">
              Assigned fabrication workers exceed the total available workshop crew ({fabCrewCount} workers) on:{' '}
              <strong className="text-foreground">
                {overAllocatedDays.map((d) => `${d.date} (${d.allocatedWorkers} assigned)`).join(', ')}
              </strong>
              . (Non-blocking warning).
            </p>
          </div>
        </div>
      )}

      {/* Gantt Chart Grid Container */}
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <div className="min-w-[1000px]">
          {/* Header Row: Left Axis Label + 14 Day Columns */}
          <div className="grid grid-cols-[320px_repeat(14,_minmax(0,_1fr))] border-b border-border bg-muted/50 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground sticky top-0 z-10">
            <div className="p-3 border-r border-border flex items-center justify-between">
              <span>Bespoke Job &amp; Quota</span>
              <span className="text-[0.55rem] font-normal text-muted-foreground">Workers / Shift</span>
            </div>
            {timelineDates.map((d) => (
              <div
                key={d.dateStr}
                className={cn(
                  'p-2 text-center border-r border-border/60 flex flex-col items-center justify-center',
                  d.isToday && 'bg-primary/10 text-primary font-bold',
                )}
              >
                <span>{d.dayLabel}</span>
                <span className="text-[0.55rem] font-mono opacity-80">{d.monthLabel}</span>
              </div>
            ))}
          </div>

          {/* Daily Capacity Status Sub-Header */}
          <div className="grid grid-cols-[320px_repeat(14,_minmax(0,_1fr))] border-b border-border/80 bg-muted/20 text-[0.55rem]">
            <div className="px-3 py-1 border-r border-border font-semibold text-muted-foreground flex items-center gap-1.5">
              <Users className="size-3 text-muted-foreground" />
              <span>Daily Assigned Crew:</span>
            </div>
            {capacityAlerts.map((ca) => (
              <div
                key={ca.date}
                className={cn(
                  'py-1 px-0.5 text-center font-mono border-r border-border/40 font-bold',
                  ca.isOverAllocated ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
                )}
                title={`${ca.allocatedWorkers} workers assigned / ${ca.availableCrew} available`}
              >
                {ca.allocatedWorkers > 0 ? `${ca.allocatedWorkers} / ${ca.availableCrew}` : '—'}
              </div>
            ))}
          </div>

          {/* Job Rows Grouped by Event */}
          {groupedSections.map((section) => (
            <div key={section.eventId} className="border-b border-border/60 last:border-b-0">
              {viewMode === 'grouped' && (
                <div className="bg-muted/40 px-4 py-2 text-xs font-bold text-foreground border-b border-border/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full bg-primary" />
                    <span>{section.title}</span>
                  </div>
                  <span className="text-[0.6rem] text-muted-foreground font-normal">
                    {section.items.length} bespoke item{section.items.length === 1 ? '' : 's'}
                  </span>
                </div>
              )}

              {section.items.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No bespoke jobs scheduled for this event.
                </div>
              ) : (
                section.items.map((item) => {
                  const hasDelays = item.delayFlags && item.delayFlags.length > 0
                  const basePos = getBarPosition(item.startDate, item.computedEndDate)
                  const effectivePos = hasDelays ? getBarPosition(item.startDate, item.effectiveEndDate) : null

                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-[320px_repeat(14,_minmax(0,_1fr))] border-b border-border/40 last:border-b-0 hover:bg-muted/20 transition-colors items-center min-h-[4.5rem]"
                    >
                      {/* Left Axis Information */}
                      <div className="p-3 border-r border-border flex flex-col gap-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => onOpenItem(item)}
                            className="font-semibold text-foreground text-xs hover:text-primary transition truncate text-left"
                          >
                            {item.itemName}
                          </button>
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[0.55rem] font-bold text-primary shrink-0">
                            {item.quota} pcs
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[0.62rem] text-muted-foreground">
                          <span className="truncate">{item.subCategory || 'Bespoke'}</span>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="font-mono font-bold text-foreground">{item.assignedWorkers}w</span>
                            <span
                              className="rounded border border-border px-1 text-[0.52rem] uppercase"
                              title={item.shiftSelection}
                            >
                              {item.shiftSelection === 'morning' ? (
                                <Sun className="size-2.5 inline text-amber-500" />
                              ) : item.shiftSelection === 'night' ? (
                                <Moon className="size-2.5 inline text-sky-500" />
                              ) : (
                                <Zap className="size-2.5 inline text-primary" />
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1 border-t border-border/30">
                          <span className="text-[0.58rem] text-muted-foreground">
                            Base: {formatSmartDuration(item.lockedBaseSingleWorkerMinutes || 48)}
                          </span>
                          <button
                            type="button"
                            onClick={() => onFlagDelay(item)}
                            className="inline-flex items-center gap-1 text-[0.58rem] font-bold text-amber-600 dark:text-amber-400 hover:underline"
                          >
                            <Flag className="size-2.5" /> Flag Delay
                          </button>
                        </div>
                      </div>

                      {/* Right Timeline Bar Canvas */}
                      <div className="col-span-14 grid grid-cols-14 h-full relative items-center px-1">
                        {/* Background Grid Lines */}
                        {timelineDates.map((d, idx) => (
                          <div
                            key={d.dateStr}
                            className={cn(
                              'h-full border-r border-border/30 absolute inset-y-0 pointer-events-none',
                              d.isToday && 'bg-primary/5',
                            )}
                            style={{ left: `${(idx / 14) * 100}%`, width: `${(1 / 14) * 100}%` }}
                          />
                        ))}

                        {/* Scheduled Gantt Bar */}
                        {basePos ? (
                          <div
                            onClick={() => onOpenItem(item)}
                            className={cn(
                              'relative z-10 flex flex-col justify-center rounded-md border p-2 cursor-pointer transition shadow-sm select-none',
                              item.shiftSelection === 'both'
                                ? 'border-primary/60 bg-primary/20 text-primary'
                                : item.shiftSelection === 'morning'
                                  ? 'border-amber-500/50 bg-amber-500/15 text-amber-900 dark:text-amber-200'
                                  : 'border-sky-500/50 bg-sky-500/15 text-sky-900 dark:text-sky-200',
                            )}
                            style={{
                              gridColumnStart: basePos.startCol,
                              gridColumnEnd: `span ${basePos.span}`,
                            }}
                          >
                            <div className="flex items-center justify-between gap-1 overflow-hidden">
                              <span className="font-bold text-[0.62rem] truncate">
                                {item.quota} units ({item.computedWorkDays}d)
                              </span>
                              <span className="font-mono text-[0.55rem] shrink-0 font-semibold opacity-90">
                                {item.computedEndDate}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-[0.55rem] opacity-80 truncate mt-0.5">
                              <span>
                                {item.assignedWorkers}w @ {formatSmartDuration(item.computedMinutesPerItem)}/pc
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="col-span-14 text-center text-[0.6rem] text-muted-foreground italic py-2">
                            Scheduled outside active 14-day window ({item.startDate} → {item.effectiveEndDate})
                          </div>
                        )}

                        {/* Delay Extension Strip */}
                        {hasDelays && effectivePos && basePos && effectivePos.span > basePos.span && (
                          <div
                            onClick={() => onOpenItem(item)}
                            className="relative z-10 -ml-1 flex items-center justify-between rounded-r-md border border-l-0 border-amber-500/80 bg-amber-500/30 px-2 py-1 cursor-pointer text-[0.58rem] font-bold text-amber-900 dark:text-amber-100 shadow-sm"
                            style={{
                              gridColumnStart: basePos.startCol + basePos.span,
                              gridColumnEnd: `span ${effectivePos.span - basePos.span}`,
                            }}
                            title={`Flagged delay: +${item.delayFlags.reduce((s, d) => s + d.delayHours, 0)}h delay. Finish moved to ${item.effectiveEndDate}`}
                          >
                            <span className="truncate flex items-center gap-1">
                              <Flag className="size-2.5 text-amber-600 dark:text-amber-400" />
                              +{item.delayFlags.reduce((s, d) => s + d.delayHours, 0)}h Delay
                            </span>
                            <span className="font-mono text-[0.52rem]">{item.effectiveEndDate}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
