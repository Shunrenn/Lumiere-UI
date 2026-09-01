import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, TrendingUp, X } from 'lucide-react'
import type { Staff } from '@/lib/types'

interface Props {
  open: boolean
  staff: Staff[]
  onClose: () => void
  onViewInWorkforce: (staffId: string) => void
}

// Groups a dateAdded string like "Feb 04, 2026" into a "Feb 2026" bucket,
// preserving chronological order by first occurrence in the sorted list.
function monthKey(dateAdded: string): { key: string; label: string; sortValue: number; year: number } {
  const parsed = new Date(dateAdded)
  if (Number.isNaN(parsed.getTime())) {
    return { key: 'unknown', label: 'Undated', sortValue: -1, year: -1 }
  }
  const key = `${parsed.getFullYear()}-${String(parsed.getMonth()).padStart(2, '0')}`
  const label = parsed.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  return { key, label, sortValue: parsed.getTime(), year: parsed.getFullYear() }
}

export function UserGrowthSummaryModal({ open, staff, onClose, onViewInWorkforce }: Props) {
  const allGroups = useMemo(() => {
    const withDates = staff.filter((s) => !!s.dateAdded)
    const byMonth = new Map<string, { label: string; sortValue: number; year: number; members: Staff[] }>()

    withDates.forEach((s) => {
      const { key, label, sortValue, year } = monthKey(s.dateAdded as string)
      const existing = byMonth.get(key)
      if (existing) existing.members.push(s)
      else byMonth.set(key, { label, sortValue, year, members: [s] })
    })

    return [...byMonth.values()]
      .map((g) => ({
        ...g,
        members: g.members.sort(
          (a, b) => new Date(a.dateAdded as string).getTime() - new Date(b.dateAdded as string).getTime(),
        ),
      }))
      .sort((a, b) => a.sortValue - b.sortValue)
  }, [staff])

  // Every year that has at least one onboarded record, oldest to newest, so the
  // "< year >" control only ever steps between years that actually have data.
  const years = useMemo(() => {
    const distinct = new Set(allGroups.filter((g) => g.year !== -1).map((g) => g.year))
    return [...distinct].sort((a, b) => a - b)
  }, [allGroups])

  const currentYear = new Date().getFullYear()
  const defaultYear = years.length > 0 ? years[years.length - 1] : currentYear
  const [selectedYear, setSelectedYear] = useState(defaultYear)

  // Reset to the most recent year with data every time the modal is (re)opened.
  useEffect(() => {
    if (open) setSelectedYear(defaultYear)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  if (!open) return null

  const yearIndex = years.indexOf(selectedYear)
  const hasPrevYear = yearIndex > 0
  const hasNextYear = yearIndex !== -1 && yearIndex < years.length - 1

  const groups = allGroups.filter((g) => g.year === selectedYear)
  const totalTracked = groups.reduce((sum, g) => sum + g.members.length, 0)

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="User Growth Summary"
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
              <TrendingUp className="size-4.5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Admin Console
              </p>
              <h2 className="mt-0.5 font-serif text-xl font-medium leading-tight text-card-foreground">
                User Growth Summary
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
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Year pagination — scopes the month-grouped list below to a single
              year so the list stays short regardless of how many years of
              onboarding history accumulate. */}
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
            {totalTracked} onboarded {totalTracked === 1 ? 'account' : 'accounts'} in {selectedYear},
            grouped by month added. Select a name to view and highlight that record in Workforce
            Management.
          </p>

          {groups.length === 0 && (
            <p className="mt-6 text-center text-sm italic text-muted-foreground">
              No onboarding activity recorded for {selectedYear}.
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
                    {group.members.length} hired
                  </span>
                </div>
                <div className="mt-2 flex flex-col gap-1.5">
                  {group.members.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onViewInWorkforce(s.id)}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3.5 py-2.5 text-left transition hover:border-primary/40 hover:bg-muted/40"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">
                          {s.firstName} {s.surname}
                        </p>
                        <p className="truncate text-[0.7rem] text-muted-foreground">
                          {s.role} · {s.dateAdded}
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-primary">
                        View in Workforce
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
