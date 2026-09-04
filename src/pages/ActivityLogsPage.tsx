import { useMemo, useState } from 'react'
import { Search, Download } from 'lucide-react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { usePortal } from '@/lib/store'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'

const roleStyles: Record<string, string> = {
  Admin: 'bg-emerald-100 text-emerald-700',
  Executive: 'bg-indigo-100 text-indigo-700',
  'Warehouse Manager': 'bg-amber-100 text-amber-800',
  'Warehouse Supervisor': 'bg-amber-100 text-amber-800',
  'Event Planner': 'bg-sky-100 text-sky-700',
  'Ground Crew': 'bg-rose-100 text-rose-700',
}

export function ActivityLogsPage() {
  const { logs } = usePortal()
  const { navigate } = useNav()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const isSystemAudit = true

  const statusOptions = useMemo(() => {
    return ['All', 'Success', 'Failed', 'Blocked', 'Warning']
  }, [])

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: logs.length }
    logs.forEach((l) => {
      counts[l.status] = (counts[l.status] ?? 0) + 1
    })
    return counts
  }, [logs])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return logs.filter((l) => {
      const matchesQuery =
        !q ||
        l.action.toLowerCase().includes(q) ||
        l.account.toLowerCase().includes(q) ||
        l.initiatorRole.toLowerCase().includes(q)
      const matchesStatus = statusFilter === 'All' || l.status === statusFilter
      return matchesQuery && matchesStatus
    })
  }, [logs, query, statusFilter, isSystemAudit])

  const exportCsv = () => {
    let exportRows = filtered
    if (fromDate) {
      const fromTime = new Date(fromDate).getTime()
      exportRows = exportRows.filter((r) => new Date(r.date || r.timestamp).getTime() >= fromTime)
    }
    if (toDate) {
      const toTime = new Date(toDate).getTime() + 86400000
      exportRows = exportRows.filter((r) => new Date(r.date || r.timestamp).getTime() <= toTime)
    }

    const header = 'Timestamp,Log ID,Employee ID,Role,Action,IP\n'
    const rows = exportRows
      .map(
        (l) =>
          `"${l.timestamp} ${l.date}","${l.logId}","${l.account}","${l.initiatorRole}","${l.action}","${l.ip}"`,
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lumiere-activity-logs.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const destination = (id: ExecutiveDestinationId) => navigate(id)

  const stickyHeader = (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground lg:text-4xl">
          System Audit Trail &amp; Security Logs
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Cross-account security and system audit log trail.</p>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search logs, Employee ID, or action..."
          className="w-72 rounded-md border border-input bg-card py-2 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
        />
      </div>
    </div>
  )

  return (
    <ExecutiveShell activeId="logs" onSelect={destination} stickyHeader={stickyHeader}>
      {/* Status filters + export */}
      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {statusOptions.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={cn(
                'rounded-full px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.1em] transition',
                statusFilter === status
                  ? 'bg-neutral-900 text-white'
                  : 'border border-border bg-card text-muted-foreground hover:bg-muted',
              )}
            >
              {status} ({statusCounts[status] ?? 0})
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-[0.6rem] font-bold uppercase tracking-wider">From:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="rounded-md border border-input bg-card px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="text-[0.6rem] font-bold uppercase tracking-wider">To:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="rounded-md border border-input bg-card px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-primary"
            />
          </div>
          {(fromDate || toDate) && (
            <button
              type="button"
              onClick={() => {
                setFromDate('')
                setToDate('')
              }}
              className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground underline px-1"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-md bg-neutral-900 px-5 py-2 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-white transition hover:bg-neutral-800"
          >
            <Download className="size-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="mt-6 overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[840px] text-left">
          <thead>
            <tr className="bg-muted/50">
              {[
                'Timestamp',
                'Log ID',
                'Employee ID',
                'Role',
                'Action Executed',
                'Status',
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 py-3 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-16 text-center text-xs text-muted-foreground">
                  No activity recorded yet. Create a user or register an event to populate the
                  audit trail.
                </td>
              </tr>
            ) : (
              filtered.map((l) => (
                <tr key={l.id} className="border-t border-border/60 align-top">
                  <td className="px-4 py-4 text-[0.65rem] text-muted-foreground">
                    <p className="font-semibold text-card-foreground">{l.timestamp}</p>
                    <p>{l.date}</p>
                  </td>
                  <td className="px-4 py-4 text-[0.65rem] text-muted-foreground">{l.logId}</td>
                  <td className="px-4 py-4 text-xs font-semibold text-card-foreground">
                    {l.account}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={cn(
                        'rounded px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em]',
                        roleStyles[l.initiatorRole] ?? 'bg-muted text-muted-foreground',
                      )}
                    >
                      {l.initiatorRole}
                    </span>
                  </td>
                  <td className="max-w-md px-4 py-4">
                    <p className="text-xs font-semibold text-card-foreground">{l.action}</p>
                    <p className="mt-1 text-[0.65rem] leading-relaxed text-muted-foreground">
                      {l.detail}
                    </p>
                  </td>
                  <td className="px-4 py-4">
                    <span className="inline-block rounded-full bg-emerald-100 px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-emerald-700">
                      {l.status || 'Success'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </ExecutiveShell>
  )
}
