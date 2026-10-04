import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, TrendingUp, X } from 'lucide-react'
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

  const [rangeDays, setRangeDays] = useState(365)

  useEffect(() => {
    if (open) setRangeDays(365)
  }, [open])

  if (!open) return null

  const latestDate = allGroups.at(-1)?.sortValue ?? Date.now()
  const rangeStart = latestDate - rangeDays * 86400000
  const groups = allGroups.filter((g) => g.sortValue >= rangeStart && g.sortValue <= latestDate)
  const selectedYear = new Date(latestDate).getFullYear()
  const totalTracked = groups.reduce((sum, g) => sum + g.members.length, 0)
  const previousYearTotal = allGroups
    .filter((g) => g.year === selectedYear - 1)
    .reduce((sum, g) => sum + g.members.length, 0)
  const growthThisYear = totalTracked - previousYearTotal
  const monthlyRows = Array.from({ length: 12 }, (_, month) => {
    const group = groups.find((entry) => new Date(entry.sortValue).getMonth() === month)
    const total = group?.members.length ?? 0
    const previous = month === 0 ? 0 : groups
      .filter((entry) => new Date(entry.sortValue).getMonth() < month)
      .reduce((sum, entry) => sum + entry.members.length, 0)
    return { label: new Date(selectedYear, month, 1).toLocaleDateString('en-US', { month: 'short' }), total, change: total === 0 ? 0 : total - previous }
  })
  const maxMonthlyTotal = Math.max(1, ...monthlyRows.map((row) => row.total))

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
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[30, 90, 180, 365].map((days) => (
              <button key={days} type="button" onClick={() => setRangeDays(days)} aria-pressed={rangeDays === days} className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${rangeDays === days ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-muted-foreground hover:bg-muted'}`}>
                {days === 30 ? 'Last 30 Days' : days === 90 ? '3 Months' : days === 180 ? '6 Months' : '1 Year'}
              </button>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-background px-4 py-3">
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Registered Users</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{totalTracked}</p>
            </div>
            <div className="rounded-lg border border-border bg-background px-4 py-3">
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Growth This Year</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${growthThisYear >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>{growthThisYear >= 0 ? '+' : ''}{growthThisYear}</p>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {totalTracked} onboarded {totalTracked === 1 ? 'account' : 'accounts'} in {selectedYear}, grouped by month added. Select a name to view and highlight that record in Workforce Management.
          </p>
          <div className="mt-5 rounded-lg border border-border bg-background p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-foreground">Monthly User Growth</h3>
              <span className="text-[0.65rem] text-muted-foreground">{selectedYear}</span>
            </div>
            <div className="mt-4 flex h-28 items-end gap-1.5 border-b border-border pb-0.5">
              {monthlyRows.map((row) => (
                <div key={row.label} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${row.label}: ${row.total} users`}>
                  <div className="w-full rounded-t-sm bg-primary/75 transition-all" style={{ height: `${Math.max(row.total ? 10 : 3, (row.total / maxMonthlyTotal) * 100)}%` }} />
                  <span className="text-[0.55rem] text-muted-foreground">{row.label}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-5 overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[1fr_1fr_0.7fr] gap-3 bg-muted px-3 py-2 text-[0.58rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground"><span>Month</span><span>Total Users</span><span>Change</span></div>
            <div className="divide-y divide-border">
              {monthlyRows.map((row) => <div key={row.label} className="grid grid-cols-[1fr_1fr_0.7fr] gap-3 px-3 py-2 text-xs"><span className="text-foreground">{new Date(selectedYear, monthlyRows.indexOf(row), 1).toLocaleDateString('en-US', { month: 'long' })}</span><span className="tabular-nums text-muted-foreground">{row.total}</span><span className={`tabular-nums ${row.change > 0 ? 'text-emerald-600 dark:text-emerald-400' : row.change < 0 ? 'text-destructive' : 'text-muted-foreground'}`}>{row.change > 0 ? '+' : ''}{row.change || '—'}</span></div>)}
            </div>
          </div>

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
