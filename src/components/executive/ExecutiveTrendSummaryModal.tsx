import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, TrendingUp, X } from 'lucide-react'
import type { PortalEvent, DamageException } from '@/lib/types'

type TrendSummaryMode = 'events' | 'damage'

interface Props {
    open: boolean
    mode: TrendSummaryMode
    events: PortalEvent[]
    damageExceptions: DamageException[]
    onClose: () => void
    onViewEvent: (eventId: string) => void
    onViewDamageReport: (reportId: string) => void
}

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// Parses "12 Dec 2025 · 22:40" (capturedAt's format) — new Date() can't
// reliably parse this directly, so we split it out manually.
function parseCapturedAt(capturedAt: string): Date | null {
    const datePart = capturedAt.split('·')[0]?.trim()
    if (!datePart) return null
    const [day, monthAbbr, year] = datePart.split(' ')
    const monthIndex = MONTHS.indexOf(monthAbbr)
    if (monthIndex === -1 || !day || !year) return null
    const parsed = new Date(Number(year), monthIndex, Number(day))
    return Number.isNaN(parsed.getTime()) ? null : parsed
}

function monthKeyFromDate(parsed: Date | null): { key: string; label: string; sortValue: number; year: number } {
    if (!parsed) return { key: 'unknown', label: 'Undated', sortValue: -1, year: -1 }
    const key = `${parsed.getFullYear()}-${String(parsed.getMonth()).padStart(2, '0')}`
    const label = parsed.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    return { key, label, sortValue: parsed.getTime(), year: parsed.getFullYear() }
}

export function ExecutiveTrendSummaryModal({
    open,
    mode,
    events,
    damageExceptions,
    onClose,
    onViewEvent,
    onViewDamageReport,
}: Props) {
    const isEvents = mode === 'events'

    const allGroups = useMemo(() => {
        const byMonth = new Map<string, { label: string; sortValue: number; year: number; members: { id: string; title: string; subtitle: string }[] }>()

        if (isEvents) {
            events.forEach((e) => {
                const parsed = e.targetDate ? new Date(e.targetDate) : null
                const valid = parsed && !Number.isNaN(parsed.getTime()) ? parsed : null
                const { key, label, sortValue, year } = monthKeyFromDate(valid)
                const entry = { id: e.id, title: e.title, subtitle: `${e.status} · ${e.targetDate || 'TBD'}` }
                const existing = byMonth.get(key)
                if (existing) existing.members.push(entry)
                else byMonth.set(key, { label, sortValue, year, members: [entry] })
            })
        } else {
            damageExceptions.forEach((d) => {
                const parsed = parseCapturedAt(d.capturedAt)
                const { key, label, sortValue, year } = monthKeyFromDate(parsed)
                const entry = { id: d.id, title: d.assetName, subtitle: `${d.status} · ${d.logId}` }
                const existing = byMonth.get(key)
                if (existing) existing.members.push(entry)
                else byMonth.set(key, { label, sortValue, year, members: [entry] })
            })
        }

        return [...byMonth.values()].sort((a, b) => a.sortValue - b.sortValue)
    }, [isEvents, events, damageExceptions])

    const years = useMemo(() => {
        const distinct = new Set(allGroups.filter((g) => g.year !== -1).map((g) => g.year))
        return [...distinct].sort((a, b) => a - b)
    }, [allGroups])

    const currentYear = new Date().getFullYear()
    const defaultYear = years.length > 0 ? years[years.length - 1] : currentYear
    const [selectedYear, setSelectedYear] = useState(defaultYear)

    useEffect(() => {
        if (open) setSelectedYear(defaultYear)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, mode])

    if (!open) return null

    const yearIndex = years.indexOf(selectedYear)
    const hasPrevYear = yearIndex > 0
    const hasNextYear = yearIndex !== -1 && yearIndex < years.length - 1

    const groups = allGroups.filter((g) => g.year === selectedYear)
    const totalTracked = groups.reduce((sum, g) => sum + g.members.length, 0)

    const title = isEvents ? 'Event Activity Summary' : 'Damage Settlement Summary'
    const noun = isEvents ? 'event' : 'report'

    return (
        <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            onClick={onClose}
        >
            <div
                className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-card shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between border-b border-border px-6 py-4">
                    <div className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                            <TrendingUp className="size-4.5" aria-hidden="true" />
                        </span>
                        <div>
                            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                Executive Dashboard
                            </p>
                            <h2 className="mt-0.5 font-serif text-xl font-medium leading-tight text-card-foreground">
                                {title}
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

                <div className="flex-1 overflow-y-auto px-6 py-5">
                    <div className="flex items-center justify-center gap-4">
                        <button
                            type="button"
                            onClick={() => hasPrevYear && setSelectedYear(years[yearIndex - 1])}
                            disabled={!hasPrevYear}
                            aria-label="Previous year"
                            className="flex size-7 items-center justify-center rounded-md border border-border text-foreground transition hover:border-primary/40 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-border disabled:hover:bg-transparent"
                        >
                            <ChevronLeft className="size-3.5" aria-hidden="true" />
                        </button>
                        <span className="min-w-[3.5rem] text-center font-sans text-sm font-bold tabular-nums text-card-foreground">
                            {selectedYear}
                        </span>
                        <button
                            type="button"
                            onClick={() => hasNextYear && setSelectedYear(years[yearIndex + 1])}
                            disabled={!hasNextYear}
                            aria-label="Next year"
                            className="flex size-7 items-center justify-center rounded-md border border-border text-foreground transition hover:border-primary/40 hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-border disabled:hover:bg-transparent"
                        >
                            <ChevronRight className="size-3.5" aria-hidden="true" />
                        </button>
                    </div>

                    <p className="mt-4 text-center text-xs text-muted-foreground">
                        {totalTracked} {noun}
                        {totalTracked === 1 ? '' : 's'} in {selectedYear}, grouped by month.{' '}
                        {isEvents ? 'Select an event to view its full record.' : 'Select a report to review it.'}
                    </p>

                    {groups.length === 0 && (
                        <p className="mt-6 text-center text-sm italic text-muted-foreground">
                            No {noun} activity recorded for {selectedYear}.
                        </p>
                    )}

                    <div className="mt-5 flex flex-col gap-5">
                        {groups.map((group) => (
                            <div key={group.label}>
                                <div className="flex items-center justify-between">
                                    <h3 className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-foreground">
                                        {group.label}
                                    </h3>
                                    <span className="text-[0.65rem] font-semibold text-muted-foreground">
                                        {group.members.length} {isEvents ? 'registered' : 'filed'}
                                    </span>
                                </div>
                                <div className="mt-2 flex flex-col gap-1.5">
                                    {group.members.map((m) => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => (isEvents ? onViewEvent(m.id) : onViewDamageReport(m.id))}
                                            className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3.5 py-2.5 text-left transition hover:border-primary/40 hover:bg-muted/40"
                                        >
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-medium text-foreground">{m.title}</p>
                                                <p className="truncate text-[0.7rem] text-muted-foreground">{m.subtitle}</p>
                                            </div>
                                            <span className="flex shrink-0 items-center gap-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-primary">
                                                {isEvents ? 'View Event' : 'View Report'}
                                                <ArrowRight className="size-3" aria-hidden="true" />
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}