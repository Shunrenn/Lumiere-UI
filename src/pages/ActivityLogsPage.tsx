import { useEffect, useMemo, useState } from 'react'
import { Search, Download } from 'lucide-react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ErrorFallback } from '@/components/ErrorFallback'
import { usePortal } from '@/lib/store'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'
import type { ActivityLog } from '@/lib/types'

const roleStyles: Record<string, string> = {
  Admin: 'bg-emerald-100 text-emerald-700',
  Executive: 'bg-indigo-100 text-indigo-700',
  'Warehouse Manager': 'bg-amber-100 text-amber-800',
  'Warehouse Supervisor': 'bg-amber-100 text-amber-800',
  'Event Planner': 'bg-sky-100 text-sky-700',
  'Ground Crew': 'bg-rose-100 text-rose-700',
}

const OPERATIONAL_SEED_LOGS: ActivityLog[] = [
  {
    id: 'op-1',
    timestamp: '11:20:05',
    date: 'Sep 16, 2026',
    logId: 'OP-LOG-99301',
    account: 'LM-0001',
    initiatorRole: 'Event Planner',
    action: 'Registered New Event Portfolio',
    detail: 'Initialized concept "La Nuit Dorée 2026" (PRT-2026-0155) for client Lumière Board.',
    ip: '192.168.4.21',
    status: 'Success',
  },
  {
    id: 'op-2',
    timestamp: '09:42:18',
    date: 'Sep 16, 2026',
    logId: 'OP-LOG-99298',
    account: 'LM-0004',
    initiatorRole: 'Field & Production Crew',
    action: 'Damage Exception Report Filed',
    detail: '2 Gold Chiavari Chairs captured with back rail structural damage on venue at Peninsula Manila.',
    ip: '192.168.4.88',
    status: 'Warning',
  },
  {
    id: 'op-3',
    timestamp: '08:15:30',
    date: 'Sep 15, 2026',
    logId: 'OP-LOG-99285',
    account: 'LM-0007',
    initiatorRole: 'Warehouse Manager',
    action: 'Loss-Maker Deficit Acknowledged',
    detail: 'Solstice Motors Reveal: 4 Velvet Panels flagged with unmitigated damage during depot inspection.',
    ip: '192.168.4.15',
    status: 'Warning',
  },
  {
    id: 'op-4',
    timestamp: '16:05:44',
    date: 'Sep 14, 2026',
    logId: 'OP-LOG-99270',
    account: 'LM-0001',
    initiatorRole: 'Event Planner',
    action: 'Design Canvas 3D Layout Approved',
    detail: 'Celestial Horizon wedding canvas cleared for warehouse dispatch assembly.',
    ip: '192.168.4.21',
    status: 'Success',
  },
  {
    id: 'op-5',
    timestamp: '14:22:09',
    date: 'Sep 12, 2026',
    logId: 'OP-LOG-99254',
    account: 'LM-0007',
    initiatorRole: 'Warehouse Manager',
    action: 'Damage Exception Validated',
    detail: 'Validated claim LOG-99281 (₱14,500 estimated liability) against event portfolio.',
    ip: '192.168.4.15',
    status: 'Success',
  },
  {
    id: 'op-6',
    timestamp: '10:00:00',
    date: 'Sep 10, 2026',
    logId: 'OP-LOG-99230',
    account: 'LM-0011',
    initiatorRole: 'Executive',
    action: 'Event Financial Settlement Cleared',
    detail: 'AeroSpace Defense Systems Expo 2026 closed with zero pending damage exceptions.',
    ip: '192.168.4.02',
    status: 'Success',
  },
]

export function ActivityLogsPage() {
  const { logs: storeLogs } = usePortal()
  const { navigate } = useNav()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Filter out system security check logs for Executive operational view
  const logs = useMemo(() => {
    const operationalStore = storeLogs.filter(
      (l) =>
        !l.action.includes('Authentication') &&
        !l.action.includes('Checksum') &&
        !l.action.includes('Session Authenticated'),
    )
    return [...OPERATIONAL_SEED_LOGS, ...operationalStore]
  }, [storeLogs])

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
  }, [logs, query, statusFilter])

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
    a.download = 'lumiere-operational-audit-logs.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const destination = (id: ExecutiveDestinationId) => navigate(id)

  const stickyHeader = (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground lg:text-4xl">
          Operational Audit Logs
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Cross-portfolio operational events, status updates, damage filings, and milestone audit log trail.
        </p>
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

  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const handleRefetch = async () => {
    setIsError(false)
    setIsLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 200))
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    handleRefetch()
  }, [])

  return (
    <ExecutiveShell activeId="logs" onSelect={destination} stickyHeader={stickyHeader}>
      {isError ? (
        <ErrorFallback
          title="System Audit Logs Unavailable"
          message="Could not load system-wide activity logs."
          onRetry={handleRefetch}
        />
      ) : isLoading ? (
        <LoadingSkeleton variant="table" />
      ) : (
        <>
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
                <tr key={l.id} className="border-t border-border/60 align-middle">
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
                    <span className="inline-block rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border dark:border-emerald-800/60 px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em]">
                      {l.status || 'Success'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
        </>
      )}
    </ExecutiveShell>
  )
}
