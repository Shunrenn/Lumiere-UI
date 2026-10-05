import { Fragment, useEffect, useMemo, useState } from 'react'
import { ChevronDown, Download, Search } from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ErrorFallback } from '@/components/ErrorFallback'
import { EmptyState } from '@/components/EmptyState'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import type { AdminDestinationId } from '@/lib/admin-destinations'
import { usePortal } from '@/lib/store'
import type { SecurityEvent } from '@/lib/security-events'

type AuditStatus = 'Success' | 'Failed' | 'Blocked' | 'Warning'
type AccountType = 'Admin' | 'Executive' | 'Event Planner' | 'Project Manager' | 'Warehouse Operations Manager' | 'Ground Crew' | 'System'
type StatusFilter = 'All' | AuditStatus

const STATUS_FILTERS: StatusFilter[] = ['All', 'Success', 'Failed', 'Blocked', 'Warning']
const statusStyles: Record<AuditStatus, string> = {
  Success: 'bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-300 dark:bg-emerald-500/15 dark:text-emerald-400 dark:ring-emerald-500/30',
  Failed: 'bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-300 dark:bg-amber-500/15 dark:text-amber-400 dark:ring-amber-500/30',
  Blocked: 'bg-rose-100 text-rose-800 ring-1 ring-inset ring-rose-300 dark:bg-rose-500/15 dark:text-rose-400 dark:ring-rose-500/30',
  Warning: 'bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-300 dark:bg-sky-500/15 dark:text-sky-400 dark:ring-sky-500/30',
}
const roleStyles: Record<string, string> = {
  Admin: 'bg-emerald-100 text-emerald-900 border border-emerald-300 dark:border-transparent dark:bg-emerald-500/12 dark:text-emerald-300',
  Executive: 'bg-indigo-100 text-indigo-900 border border-indigo-300 dark:border-transparent dark:bg-indigo-500/15 dark:text-indigo-300',
  'Event Planner': 'bg-sky-100 text-sky-900 border border-sky-300 dark:border-transparent dark:bg-sky-500/15 dark:text-sky-300',
  'Project Manager': 'bg-violet-100 text-violet-900 border border-violet-300 dark:border-transparent dark:bg-violet-500/15 dark:text-violet-300',
  'Warehouse Operations Manager': 'bg-amber-100 text-amber-900 border border-amber-300 dark:border-transparent dark:bg-amber-500/15 dark:text-amber-300',
  'Ground Crew': 'bg-purple-100 text-purple-900 border border-purple-300 dark:border-transparent dark:bg-purple-500/15 dark:text-purple-300',
  System: 'bg-slate-100 text-slate-800 border border-slate-300 dark:border-transparent dark:bg-slate-500/15 dark:text-slate-300',
}

function eventTime(entry: SecurityEvent) {
  return new Date(`${entry.date} ${entry.timestamp}`).getTime()
}
function csvField(value: string) {
  return `"${String(value).replaceAll('"', '""')}"`
}
function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function AdminSecurityAuditPage() {
  const { navigate } = useNav()
  const { logs: storeLogs } = usePortal()
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('All')
  const [account, setAccount] = useState('All')
  const [action, setAction] = useState('All')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const invalidDateRange = Boolean(fromDate && toDate && fromDate > toDate)

  const securityLogs: SecurityEvent[] = useMemo(() => storeLogs.map((l) => {
    const init = (l.initiatorRole || '').toLowerCase()
    let role: AccountType = 'System'
    if (init.includes('admin')) role = 'Admin'
    else if (init.includes('executive')) role = 'Executive'
    else if (init.includes('planner') || init.includes('designer')) role = 'Event Planner'
    else if (init.includes('project manager')) role = 'Project Manager'
    else if (init.includes('warehouse')) role = 'Warehouse Operations Manager'
    else if (init.includes('ground') || init.includes('crew')) role = 'Ground Crew'
    return { id: l.id, timestamp: l.timestamp, date: l.date, logId: l.logId, employeeId: l.account || 'SYS-ROOT', role, action: l.action, status: (l.status as AuditStatus) || 'Success', ip: l.ip, terminal: 'T-01', token: `••••••••••••${l.id.slice(-4)}`, note: l.detail, dotColor: l.status === 'Success' ? 'bg-emerald-400' : l.status === 'Blocked' ? 'bg-rose-400' : 'bg-amber-400' }
  }), [storeLogs])

  const accountFilters = useMemo(() => ['All', ...Array.from(new Set(securityLogs.map((entry) => entry.role)))], [securityLogs])
  const actionFilters = useMemo(() => ['All', ...Array.from(new Set(securityLogs.map((entry) => entry.action)))], [securityLogs])
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const fromTime = fromDate ? new Date(`${fromDate}T00:00:00`).getTime() : -Infinity
    const toTime = toDate ? new Date(`${toDate}T23:59:59.999`).getTime() : Infinity
    return securityLogs.filter((entry) => {
      const matchesQuery = !q || [entry.action, entry.employeeId, entry.logId, entry.role, entry.note].some((value) => value.toLowerCase().includes(q))
      return !invalidDateRange && matchesQuery && (status === 'All' || entry.status === status) && (account === 'All' || entry.role === account) && (action === 'All' || entry.action === action) && eventTime(entry) >= fromTime && eventTime(entry) <= toTime
    })
  }, [securityLogs, query, status, account, action, fromDate, toDate, invalidDateRange])

  const exportCsv = () => {
    if (invalidDateRange) return
    const header = ['Timestamp', 'Date', 'Log ID', 'Employee ID', 'Role', 'Action', 'Status', 'IP', 'Terminal', 'Token'].map(csvField).join(',')
    const body = rows.map((r) => [r.timestamp, r.date, r.logId, r.employeeId, r.role, r.action, r.status, r.ip, r.terminal, r.token].map(csvField).join(',')).join('\n')
    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fromDate && toDate ? `security-audit-${fromDate}-to-${toDate}.csv` : 'lumiere-security-audit-logs.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const resetFilters = () => { setQuery(''); setAccount('All'); setAction('All'); setStatus('All'); setFromDate(''); setToDate(''); setExpanded(null) }
  const railSelect = (id: AdminDestinationId) => { if (id === 'system-dashboard') navigate('overview'); else if (id === 'workforce') navigate('workforce'); else if (id === 'security-audit') setExpanded(null); else if (id === 'rbac') navigate('rbac') }
  const handleRefetch = async () => { setIsError(false); setIsLoading(true); try { await new Promise((resolve) => setTimeout(resolve, 200)) } catch { setIsError(true) } finally { setIsLoading(false) } }
  useEffect(() => { handleRefetch() }, [])
  useEffect(() => { if (expanded && !rows.some((entry) => entry.id === expanded)) setExpanded(null) }, [rows, expanded])

  const activeDateSummary = fromDate && toDate ? `Showing audit records for ${formatDate(fromDate)} – ${formatDate(toDate)}` : fromDate ? `From ${formatDate(fromDate)} onward` : toDate ? `Through ${formatDate(toDate)}` : null
  const stickyHeader = <div><p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Admin Console / Audit</p><h1 className="mt-2 font-serif text-3xl font-medium text-foreground sm:text-4xl">Security Audit Logs</h1><p className="mt-1.5 text-sm text-muted-foreground text-pretty">Review system activity, access events, and administrative actions.</p></div>

  return <AdminShell activeId="security-audit" onSelect={railSelect} stickyHeader={stickyHeader}>
    {isError ? <ErrorFallback title="Security Audit Trail Unavailable" message="Could not load system security logs." onRetry={handleRefetch} /> : isLoading ? <LoadingSkeleton variant="table" /> : <div className="flex flex-col gap-5">
      <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5 lg:flex-row lg:items-end lg:justify-between">
        <div><h2 className="text-sm font-semibold text-foreground">Audit filters</h2><p className="mt-1 text-xs text-muted-foreground">Narrow the current audit view and export exactly these results.</p></div>
        <button type="button" onClick={exportCsv} disabled={invalidDateRange} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"><Download className="size-3.5" aria-hidden="true" />Export CSV</button>
      </section>
      <section className="rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(14rem,1.5fr)_minmax(9rem,1fr)_minmax(9rem,1fr)_minmax(10rem,1fr)_minmax(10rem,1fr)_auto] lg:items-end">
          <label className="flex flex-col gap-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">Search<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Action, employee, log ID" className="h-10 rounded-md border border-input bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary" /></label>
          <label className="flex flex-col gap-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">From<input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal tracking-normal text-foreground outline-none focus:border-primary" /></label>
          <label className="flex flex-col gap-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">To<input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal tracking-normal text-foreground outline-none focus:border-primary" /></label>
          <label className="flex flex-col gap-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">Role<select value={account} onChange={(e) => setAccount(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-xs font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary" aria-label="Filter by role">{accountFilters.map((value) => <option key={value} value={value}>{value === 'All' ? 'All roles' : value}</option>)}</select></label>
          <label className="flex flex-col gap-1.5 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">Status<select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="h-10 rounded-md border border-input bg-background px-3 text-xs font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary" aria-label="Filter by status">{STATUS_FILTERS.map((value) => <option key={value} value={value}>{value === 'All' ? 'All statuses' : value}</option>)}</select></label>
          <button type="button" onClick={resetFilters} disabled={!query && account === 'All' && action === 'All' && status === 'All' && !fromDate && !toDate} className="h-10 rounded-md border border-border px-4 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40">Reset</button>
        </div>
        <div className="mt-3 flex flex-col gap-1.5 sm:max-w-xs"><label className="text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">Action</label><select value={action} onChange={(e) => setAction(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none focus:border-primary" aria-label="Filter by action">{actionFilters.map((value) => <option key={value} value={value}>{value === 'All' ? 'All actions' : value}</option>)}</select></div>
        {invalidDateRange && <p className="mt-3 text-xs text-destructive" role="alert">From date cannot be later than To date.</p>}
      </section>
      <section className="min-w-0 rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-1 border-b border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5"><div><h2 className="text-sm font-semibold text-foreground">Audit results</h2>{activeDateSummary && <p className="mt-1 text-xs text-muted-foreground">{activeDateSummary}</p>}</div><p className="text-xs text-muted-foreground">{rows.length} {rows.length === 1 ? 'record' : 'records'}</p></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead><tr className="border-b border-border bg-muted/50">{['Date & time', 'Log ID', 'Actor', 'Role', 'Action', 'Status', 'Details'].map((heading) => <th key={heading} className="px-4 py-3 text-[0.56rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">{heading}</th>)}</tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={7} className="py-10"><EmptyState title={invalidDateRange ? 'No audit records match the selected filters' : 'No audit records found'} message={invalidDateRange ? 'Correct the date range to view audit events.' : 'No audit records match the selected filters.'} /></td></tr> : rows.map((entry) => { const open = expanded === entry.id; return <Fragment key={entry.id}><tr onClick={() => setExpanded(open ? null : entry.id)} className={cn('cursor-pointer border-t border-border/60 align-middle transition-colors hover:bg-muted/40', open && 'bg-muted/40')} aria-expanded={open}><td className="px-4 py-4 text-[0.65rem] text-muted-foreground"><p className="font-semibold text-card-foreground">{entry.date}</p><p>{entry.timestamp}</p></td><td className="px-4 py-4 text-[0.65rem] font-medium text-muted-foreground">{entry.logId}</td><td className="px-4 py-4 text-xs font-semibold text-card-foreground">{entry.employeeId}</td><td className="px-4 py-4"><span className={cn('inline-block rounded px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em]', roleStyles[entry.role])}>{entry.role}</span></td><td className="max-w-md px-4 py-4 text-xs font-medium text-card-foreground">{entry.action}</td><td className="px-4 py-4"><span className={cn('inline-block rounded-full px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em]', statusStyles[entry.status])}>{entry.status}</span></td><td className="px-4 py-4 text-right"><button type="button" onClick={(event) => { event.stopPropagation(); setExpanded(open ? null : entry.id) }} aria-label={`${open ? 'Collapse' : 'Expand'} details for ${entry.logId}`} aria-expanded={open} className="inline-flex rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} aria-hidden="true" /></button></td></tr>{open && <tr className="border-t border-border/60 bg-muted/20"><td colSpan={7} className="px-4 pb-5 pt-1"><div className="rounded-lg border border-border bg-background/60 p-4"><p className="text-[0.58rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">Event details</p><div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3"><MetaField label="IP Address" value={entry.ip} /><MetaField label="Terminal" value={entry.terminal} /><MetaField label="Session Token" value={entry.token} /></div><p className="mt-4 text-xs leading-relaxed text-muted-foreground">{entry.note}</p></div></td></tr>}</Fragment> })}</tbody></table></div>
      </section>
    </div>}
  </AdminShell>
}

function MetaField({ label, value }: { label: string; value: string }) { return <div><p className="text-[0.55rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className="mt-1 font-mono text-xs text-card-foreground">{value}</p></div> }

export default AdminSecurityAuditPage
