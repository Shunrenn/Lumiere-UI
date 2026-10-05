import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, TrendingUp, X } from 'lucide-react'
import type { Staff } from '@/shared/types'

interface Props {
  open: boolean
  staff: Staff[]
  onClose: () => void
  onViewInWorkforce: (staffId: string) => void
}

export function UserGrowthSummaryModal({ open, staff, onClose, onViewInWorkforce }: Props) {
  const datedStaff = useMemo(
    () => staff.filter((s) => s.dateAdded && !Number.isNaN(new Date(s.dateAdded).getTime())),
    [staff],
  )
  const availableYears = useMemo(
    () => [...new Set(datedStaff.map((s) => new Date(s.dateAdded as string).getFullYear()))].sort((a, b) => a - b),
    [datedStaff],
  )
  const latestDate = datedStaff.length ? Math.max(...datedStaff.map((s) => new Date(s.dateAdded as string).getTime())) : Date.now()
  const latestPeriod = new Date(latestDate)
  const [selectedMonth, setSelectedMonth] = useState(latestPeriod.getMonth())
  const [selectedYear, setSelectedYear] = useState(latestPeriod.getFullYear())

  useEffect(() => {
    if (open) {
      setSelectedMonth(latestPeriod.getMonth())
      setSelectedYear(latestPeriod.getFullYear())
    }
  }, [open, latestPeriod.getMonth(), latestPeriod.getFullYear()])

  if (!open) return null

  const selectedMembers = datedStaff.filter((s) => {
    const date = new Date(s.dateAdded as string)
    return date.getFullYear() === selectedYear && date.getMonth() === selectedMonth
  })
  const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate()
  const dailyRows = Array.from({ length: daysInMonth }, (_, index) => {
    const day = index + 1
    const total = selectedMembers.filter((s) => new Date(s.dateAdded as string).getDate() === day).length
    return { day, total }
  })
  const maxDailyTotal = Math.max(1, ...dailyRows.map((row) => row.total))
  const selectedLabel = new Date(selectedYear, selectedMonth, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

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
          <div className="grid gap-4 rounded-lg border border-border bg-background p-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Month
              <select value={selectedMonth} onChange={(event) => setSelectedMonth(Number(event.target.value))} className="rounded-md border border-input bg-card px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-foreground outline-none focus:border-primary">
                {Array.from({ length: 12 }, (_, month) => <option key={month} value={month}>{new Date(2000, month, 1).toLocaleDateString('en-US', { month: 'long' })}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Year
              <select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} className="rounded-md border border-input bg-card px-3 py-2.5 text-sm font-medium normal-case tracking-normal text-foreground outline-none focus:border-primary">
                {availableYears.length > 0 ? availableYears.map((year) => <option key={year} value={year}>{year}</option>) : <option value={selectedYear}>{selectedYear}</option>}
              </select>
            </label>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-background px-4 py-3">
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Accounts Created</p>
              <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{selectedMembers.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-background px-4 py-3">
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Selected Period</p>
              <p className="mt-1 text-base font-bold text-foreground">{selectedLabel}</p>
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">Counts use the existing account onboarding date ({'dateAdded'}). Current account status is not used as historical status.</p>
          <div className="mt-5 rounded-lg border border-border bg-background p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-foreground">User Registrations — {selectedLabel}</h3>
              <span className="text-[0.65rem] text-muted-foreground">{selectedMembers.length} total</span>
            </div>
            <div className="mt-4 flex h-28 items-end gap-px overflow-hidden border-b border-border pb-0.5">
              {dailyRows.map((row) => (
                <div key={row.day} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${selectedLabel}, day ${row.day}: ${row.total} registrations`}>
                  <div className="w-full rounded-t-sm bg-primary/75 transition-all" style={{ height: row.total ? `${Math.max(10, (row.total / maxDailyTotal) * 100)}%` : '3%' }} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between text-[0.55rem] text-muted-foreground"><span>1</span><span>{Math.ceil(daysInMonth / 2)}</span><span>{daysInMonth}</span></div>
          </div>

          {selectedMembers.length === 0 && <p className="mt-6 text-center text-sm italic text-muted-foreground">No user registrations recorded for {selectedLabel}.</p>}

          {selectedMembers.length > 0 && <div className="mt-5 flex flex-col gap-1.5">
            {selectedMembers.map((s) => (
              <button key={s.id} type="button" onClick={() => onViewInWorkforce(s.id)} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background px-3.5 py-2.5 text-left transition hover:border-primary/40 hover:bg-muted/40">
                <div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{s.firstName} {s.surname}</p><p className="truncate text-[0.7rem] text-muted-foreground">{s.role} · {s.dateAdded}</p></div>
                <span className="flex shrink-0 items-center gap-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-primary">View in Workforce <ArrowRight className="size-3" aria-hidden="true" /></span>
              </button>
            ))}
          </div>}
        </div>
      </div>
    </div>
  )
}
