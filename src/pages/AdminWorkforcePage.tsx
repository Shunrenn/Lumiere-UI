import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Search, UserPlus, Users, ChevronDown, TrendingUp, ArrowUpDown } from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'
import { EmployeeModal } from '@/components/EmployeeModal'
import { ViewAccountModal } from '@/components/ViewAccountModal'
import { EmployeeRecordModal } from '@/components/admin/workforce/EmployeeRecordModal'
import { WorkforceTable } from '@/components/admin/workforce/WorkforceTable'
import type { AdminDestinationId } from '@/lib/admin-destinations'
import { useNav } from '@/lib/nav'
import { usePortal } from '@/lib/store'
import { useGrowthSummary } from '@/lib/admin-growth-summary'
import type { AccountStatus, Staff } from '@/lib/types'

function statusFor(staff: Staff, lockedIds: Set<string>): AccountStatus {
  if (lockedIds.has(staff.email)) return 'Locked'
  return staff.accountStatus ?? (staff.sessionStatus === 'Suspended' ? 'Suspended' : 'Active')
}

// Status filter options rendered as pills (spec: All / Active / Pending / Locked / Suspended).
const STATUS_FILTERS = ['All', 'Active', 'Pending', 'Locked', 'Suspended'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

// Sort options for the directory table.
// Month/Year sort by dateAdded (onboarding date), not lastAccess — this reflects
// when the person joined the org rather than when they last signed in, which is
// the more meaningful grouping for a workforce roster.
const SORT_OPTIONS = ['Month', 'Year', 'A-Z', 'Z-A'] as const
type SortOption = (typeof SORT_OPTIONS)[number]

function parseDateAdded(value: string | undefined): number {
  const parsed = value ? Date.parse(value) : NaN
  return Number.isNaN(parsed) ? 0 : parsed
}

export function AdminWorkforcePage() {
  const { navigate } = useNav()
  const { staff, userActions, addEmployeeRecord, toggleSuspend, forceLogout, updateStaff } = usePortal()
  const { openGrowthSummary } = useGrowthSummary()
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('All Roles')
  const [status, setStatus] = useState<StatusFilter>('All')
  const [sort, setSort] = useState<SortOption>('A-Z')
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [createAccountOpen, setCreateAccountOpen] = useState(false)
  const [createRecordOpen, setCreateRecordOpen] = useState(false)
  const [selected, setSelected] = useState<Staff | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [tempPassword, setTempPassword] = useState('')
  const addMenuRef = useRef<HTMLDivElement | null>(null)

  // Deep-linkable highlight, scoped to this feature only: read directly off
  // the URL (not through useNav) so refresh/back/forward restore it without
  // migrating the rest of the app's in-memory routing.
  const [highlightId, setHighlightId] = useState<string | null>(
    () => new URLSearchParams(window.location.search).get('highlight') ?? window.history.state?.highlight ?? null,
  )

  useEffect(() => {
    if (!highlightId) return
    // Clear the visible URL param after the highlight has been shown, but keep
    // the target in history.state so refresh and forward navigation restore it.
    const timer = setTimeout(() => {
      const url = new URL(window.location.href)
      url.searchParams.delete('highlight')
      window.history.replaceState({ ...window.history.state, highlight: highlightId }, '', url)
      setHighlightId(null)
    }, 2500)
    return () => clearTimeout(timer)
  }, [highlightId])

  // A browser back/forward navigation can restore or clear the param without
  // remounting this component — keep local state in sync.
  useEffect(() => {
    const onPopState = (event: PopStateEvent) => {
      // Read the active entry after the browser has committed the navigation;
      // this handles both Back and Forward consistently.
      requestAnimationFrame(() => {
        setHighlightId(
          new URLSearchParams(window.location.search).get('highlight') ??
            window.history.state?.highlight ??
            event.state?.highlight ??
            null,
        )
      })
    }
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  // Close the "Add New User" choice menu on any outside click.
  useEffect(() => {
    if (!addMenuOpen) return
    const onDoc = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as Node)) setAddMenuOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [addMenuOpen])

  const lockedIds = useMemo(() => new Set(userActions.filter((a) => a.type === 'account-locked' && a.status === 'pending').map((a) => a.user)), [userActions])
  const rows = useMemo(() => {
    const filtered = staff.filter((s) => {
      const text = `${s.firstName} ${s.surname} ${s.employeeId} ${s.email}`.toLowerCase()
      return (!query || text.includes(query.toLowerCase())) && (role === 'All Roles' || s.role === role) && (status === 'All' || statusFor(s, lockedIds) === status)
    })
    const sorted = [...filtered]
    if (sort === 'A-Z') sorted.sort((a, b) => `${a.firstName} ${a.surname}`.localeCompare(`${b.firstName} ${b.surname}`))
    else if (sort === 'Z-A') sorted.sort((a, b) => `${b.firstName} ${b.surname}`.localeCompare(`${a.firstName} ${a.surname}`))
    else sorted.sort((a, b) => parseDateAdded(b.dateAdded) - parseDateAdded(a.dateAdded)) // Month & Year: most recent first
    return sorted
  }, [staff, query, role, status, sort, lockedIds])
  const roles = [...new Set(staff.map((s) => s.role))]

  // These three figures mirror the System Dashboard's stats (minus System Health), but
  // render as a compact inline strip in the table header rather than standalone cards —
  // that keeps table rows visible on load instead of pushed below the fold.
  const totalUsers = staff.length
  const lockedAccounts = userActions.filter((a) => a.status === 'pending' && a.type === 'account-locked').length
  const pendingActivations = userActions.filter((a) => a.status === 'pending' && a.type !== 'account-locked').length
  const tableStats = [
    { label: 'Total Users', value: totalUsers },
    { label: 'Locked Accounts', value: lockedAccounts },
    { label: 'Pending Activations', value: pendingActivations },
  ]

  const destination = (id: AdminDestinationId) => {
    if (id === 'system-dashboard') navigate('overview')
    else if (id === 'workforce') navigate('workforce')
    else if (id === 'security-audit') navigate('security-audit')
    else if (id === 'rbac') navigate('rbac')
  }

  return (
    <AdminShell activeId="workforce" onSelect={destination} stickyHeader={
      <div><p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Admin Console / Directory</p><h1 className="mt-2 font-serif text-3xl font-medium text-foreground sm:text-4xl">Workforce Management</h1><p className="mt-1.5 text-sm text-muted-foreground">Manage portal accounts and employee records across Lumière.</p></div>
    }>
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, ID, or email" className="w-full rounded-md border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary" /></div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2.5 text-xs text-foreground"><option>All Roles</option>{roles.map((r) => <option key={r}>{r}</option>)}</select>
            <button type="button" onClick={openGrowthSummary} className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-xs font-semibold text-foreground transition hover:bg-muted"><TrendingUp className="size-3.5 text-primary" /> User Growth Summary</button>
            <div className="relative" ref={addMenuRef}>
              <button type="button" onClick={() => setAddMenuOpen((v) => !v)} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90" aria-haspopup="menu" aria-expanded={addMenuOpen}><Plus className="size-3.5" /> Add New User <ChevronDown className="size-3.5" /></button>
              {addMenuOpen && (
                <div role="menu" className="absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-xl">
                  <button type="button" role="menuitem" onClick={() => { setAddMenuOpen(false); setCreateAccountOpen(true) }} className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-muted"><UserPlus className="mt-0.5 size-4 text-primary" /><span><span className="block text-xs font-semibold text-popover-foreground">Full Account</span><span className="block text-[0.65rem] text-muted-foreground">Portal login with credentials</span></span></button>
                  <button type="button" role="menuitem" onClick={() => { setAddMenuOpen(false); setCreateRecordOpen(true) }} className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-muted"><Users className="mt-0.5 size-4 text-primary" /><span><span className="block text-xs font-semibold text-popover-foreground">Employee Record</span><span className="block text-[0.65rem] text-muted-foreground">On-call / seasonal, no login</span></span></button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)} className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${status === s ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'}`} aria-pressed={status === s}>{s}</button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ArrowUpDown className="size-3.5" aria-hidden="true" />
            <span>Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)} className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground">
              {SORT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Showing {rows.length} of {staff.length} directory entries. Click a row to view details.</p>
        <WorkforceTable rows={rows} resolveStatus={(s) => statusFor(s, lockedIds)} onRowClick={(s) => { setSelected(s); setEditMode(false); setTempPassword(s.tempPassword ?? '') }} onSuspend={(s) => void toggleSuspend(s.id)} onForceLogout={(s) => forceLogout(s.id)} onEdit={(s) => { setSelected(s); setEditMode(true); setTempPassword(s.tempPassword ?? '') }} highlightId={highlightId} stats={tableStats} />
      </div>
      <EmployeeModal open={createAccountOpen} onClose={() => setCreateAccountOpen(false)} />
      <EmployeeRecordModal open={createRecordOpen} onClose={() => setCreateRecordOpen(false)} onCreate={addEmployeeRecord} />
      <ViewAccountModal open={!!selected} staff={selected} tempPassword={tempPassword} onTempPasswordChange={setTempPassword} onClose={() => setSelected(null)} editable={editMode} onSave={(s) => { updateStaff({ ...s, tempPassword }); setSelected(null) }} />
    </AdminShell>
  )
}

export default AdminWorkforcePage
