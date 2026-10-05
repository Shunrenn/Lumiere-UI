import { useEffect, useMemo, useRef, useState } from 'react'
import { Plus, Search, UserPlus, Users, ChevronDown, TrendingUp, ArrowUpDown, AlertTriangle } from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'
import { EmployeeModal } from '@/components/EmployeeModal'
import { ViewAccountModal } from '@/components/ViewAccountModal'
import { EmployeeRecordModal } from '@/components/admin/workforce/EmployeeRecordModal'
import { WorkforceTable } from '@/components/admin/workforce/WorkforceTable'
import type { AdminDestinationId } from '@/lib/admin-destinations'
import { useNav } from '@/lib/nav'
import { usePortal } from '@/lib/store'
import { useGrowthSummary } from '@/lib/admin-growth-summary'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ErrorFallback } from '@/components/ErrorFallback'
import { ConfirmDialog } from '@/components/ConfirmDialog'
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
  const { navigate, intent, clearIntent } = useNav()
  const { staff, userActions, addEmployeeRecord, toggleSuspend, forceLogout, updateStaff, removeStaff } = usePortal()
  const { openGrowthSummary } = useGrowthSummary()
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('All Roles')
  const [status, setStatus] = useState<StatusFilter>('All')
  const [sort, setSort] = useState<SortOption>('A-Z')
  const [addMenuOpen, setAddMenuOpen] = useState(false)
  const [createAccountOpen, setCreateAccountOpen] = useState(false)
  const [createRecordOpen, setCreateRecordOpen] = useState(false)
  const [selected, setSelected] = useState<Staff | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Staff | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [pendingAction, setPendingAction] = useState<'suspend' | 'force-logout' | null>(null)
  const [actionReason, setActionReason] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const addMenuRef = useRef<HTMLDivElement | null>(null)

  const lockedIds = useMemo(() => new Set(userActions.filter((a) => a.type === 'account-locked' && a.status === 'pending').map((a) => a.user)), [userActions])

  const [prefillEmail, setPrefillEmail] = useState('')
  const [prefillActionId, setPrefillActionId] = useState('')

  useEffect(() => {
    if (intent?.kind === 'unlock-user') {
      const targetEmail = intent.payload?.email
      const target = staff.find((s) => s.email === targetEmail) || staff.find((s) => lockedIds.has(s.email))
      if (target) {
        setSelected(target)
        setEditMode(false)
      }
      clearIntent()
    } else if (intent?.kind === 'add-user') {
      if (intent.payload?.email) setPrefillEmail(intent.payload.email)
      if (intent.payload?.actionId) setPrefillActionId(intent.payload.actionId)
      setCreateAccountOpen(true)
      clearIntent()
    }
  }, [intent, staff, lockedIds, clearIntent])

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

  const rows = useMemo(() => {
    const filtered = staff.filter((s) => {
      const displayName = s.fullName || `${s.firstName} ${s.surname}`.trim()
      const text = `${displayName} ${s.employeeId} ${s.email}`.toLowerCase()
      return (!query || text.includes(query.toLowerCase())) && (role === 'All Roles' || s.role === role) && (status === 'All' || statusFor(s, lockedIds) === status)
    })
    const sorted = [...filtered]
    if (sort === 'A-Z') {
      sorted.sort((a, b) => {
        const nameA = a.fullName || `${a.firstName} ${a.surname}`.trim()
        const nameB = b.fullName || `${b.firstName} ${b.surname}`.trim()
        return nameA.localeCompare(nameB)
      })
    } else if (sort === 'Z-A') {
      sorted.sort((a, b) => {
        const nameA = a.fullName || `${a.firstName} ${a.surname}`.trim()
        const nameB = b.fullName || `${b.firstName} ${b.surname}`.trim()
        return nameB.localeCompare(nameA)
      })
    } else {
      sorted.sort((a, b) => parseDateAdded(b.dateAdded) - parseDateAdded(a.dateAdded)) // Month & Year: most recent first
    }
    return sorted
  }, [staff, query, role, status, sort, lockedIds])
  const roles = useMemo(() => Array.from(new Set(staff.map((s) => s.role).filter(Boolean))).sort((a, b) => a.localeCompare(b)), [staff])

  // These three figures mirror the System Dashboard's stats (minus System Health), but
  // render as a compact inline strip in the table header rather than standalone cards —
  // that keeps table rows visible on load instead of pushed below the fold.
  const lockedAccounts = userActions.filter((a) => a.status === 'pending' && a.type === 'account-locked').length
  const pendingActivations = userActions.filter((a) => a.status === 'pending' && a.type !== 'account-locked').length
  const tableStats = [
    { label: 'Active Users', value: staff.filter((s) => (s.accountStatus ?? s.sessionStatus) === 'Active').length },
    { label: 'Locked Accounts', value: lockedAccounts },
    { label: 'Pending Activations', value: pendingActivations },
  ]

  const isLoading = false
  const [isError, setIsError] = useState(false)

  const handleRefetch = async () => {
    setIsError(false)
  }

  const destination = (id: AdminDestinationId) => {
    if (id === 'system-dashboard') navigate('overview')
    else if (id === 'workforce') navigate('workforce')
    else if (id === 'security-audit') navigate('security-audit')
    else if (id === 'rbac') navigate('rbac')
  }

  return (
    <AdminShell activeId="workforce" onSelect={destination} stickyHeader={
      <div><p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Admin Console / Directory</p><h1 className="mt-2 font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Workforce Management</h1><p className="mt-1.5 text-sm text-muted-foreground">Manage portal accounts and employee records across Lumière.</p></div>
    }>
      {isError ? (
        <ErrorFallback
          title="Workforce Management Unavailable"
          message="Could not load staff directory from backend database."
          onRetry={handleRefetch}
        />
      ) : isLoading ? (
        <LoadingSkeleton variant="table" />
      ) : (
        <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search workforce..." aria-label="Search workforce" className="w-full rounded-md border border-input bg-background py-2.5 pl-9 pr-3 text-sm text-foreground outline-none focus:border-primary" /></div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><span className="sr-only">Role</span><select aria-label="Role" value={role} onChange={(e) => setRole(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2.5 text-xs text-foreground"><option>All Roles</option>{roles.map((r) => <option key={r}>{r}</option>)}</select></label>
            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><span className="sr-only">Status</span><select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="rounded-md border border-input bg-background px-3 py-2.5 text-xs text-foreground">{STATUS_FILTERS.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}</select></label>
            <button type="button" onClick={() => { setQuery(''); setRole('All Roles'); setStatus('All') }} className="rounded-md border border-input bg-background px-3 py-2.5 text-xs font-semibold text-foreground transition hover:bg-muted">Reset</button>
            <button type="button" onClick={openGrowthSummary} className="button-secondary"><TrendingUp className="size-3.5 text-primary" /> User Growth Summary</button>
            <div className="relative" ref={addMenuRef}>
              <button type="button" onClick={() => setAddMenuOpen((v) => !v)} className="button-primary" aria-haspopup="menu" aria-expanded={addMenuOpen}><Plus className="size-3.5" /> Add New User <ChevronDown className="size-3.5" /></button>
              {addMenuOpen && (
                <div role="menu" className="absolute right-0 top-11 z-30 w-56 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-xl">
                  <button type="button" role="menuitem" onClick={() => { setAddMenuOpen(false); setCreateAccountOpen(true) }} className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-muted"><UserPlus className="mt-0.5 size-4 text-primary" /><span><span className="block text-xs font-semibold text-popover-foreground">Full Account</span><span className="block text-[0.65rem] text-muted-foreground">Portal login with credentials</span></span></button>
                  <button type="button" role="menuitem" onClick={() => { setAddMenuOpen(false); setCreateRecordOpen(true) }} className="flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition hover:bg-muted"><Users className="mt-0.5 size-4 text-primary" /><span><span className="block text-xs font-semibold text-popover-foreground">Employee Record</span><span className="block text-[0.65rem] text-muted-foreground">On-call / seasonal, no login</span></span></button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex justify-end">
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <ArrowUpDown className="size-3.5" aria-hidden="true" />
            <span>Sort by</span>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortOption)} className="rounded-md border border-input bg-background px-3 py-2 text-xs text-foreground">
              {SORT_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </label>
        </div>
        <p className="text-xs text-muted-foreground">Showing {rows.length} of {staff.length} directory entries. Click a row to view details.</p>
        <WorkforceTable
          rows={rows}
          resolveStatus={(s) => statusFor(s, lockedIds)}
          onRowClick={(s) => { setSelected(s); setEditMode(false) }}
          onSuspend={(s) => { setSelected(s); setEditMode(false); setPendingAction('suspend'); setActionReason(''); setActionError(null) }}
          onForceLogout={(s) => { setSelected(s); setEditMode(false); setPendingAction('force-logout'); setActionReason(''); setActionError(null) }}
          onDelete={(s) => { setDeleteTarget(s); setDeleteError(null) }}
          onEdit={(s) => { setSelected(s); setEditMode(true) }}
          highlightId={highlightId}
          stats={tableStats}
        />
      </div>
      )}
      <EmployeeModal 
        open={createAccountOpen} 
        onClose={() => { setCreateAccountOpen(false); setPrefillEmail(''); setPrefillActionId(''); }} 
        prefillEmail={prefillEmail}
        actionId={prefillActionId}
      />
      <EmployeeRecordModal open={createRecordOpen} onClose={() => setCreateRecordOpen(false)} onCreate={addEmployeeRecord} />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        eyebrow="Destructive Account Action"
        title="Delete Account"
        tone="destructive"
        confirmLabel={deletePending ? 'Deleting…' : 'Delete Account'}
        onCancel={() => { if (!deletePending) { setDeleteTarget(null); setDeleteError(null) } }}
        onConfirm={async () => {
          if (!deleteTarget || deletePending) return
          setDeletePending(true)
          setDeleteError(null)
          try {
            await removeStaff(deleteTarget.id)
            setDeleteTarget(null)
          } catch (error) {
            setDeleteError(error instanceof Error ? error.message : 'The account could not be deleted.')
          } finally {
            setDeletePending(false)
          }
        }}
        description={deleteTarget ? (
          <div className="flex flex-col gap-3">
            <p>You are about to permanently delete this workforce account. This action may permanently remove account access.</p>
            <dl className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <div className="flex flex-col gap-0.5"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Employee</dt><dd className="font-semibold text-foreground">{deleteTarget.fullName || `${deleteTarget.firstName} ${deleteTarget.surname}`.trim() || '—'}</dd></div>
              <div className="mt-2 flex flex-col gap-0.5"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</dt><dd className="text-foreground">{deleteTarget.email || '—'}</dd></div>
              <div className="mt-2 flex flex-col gap-0.5"><dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</dt><dd className="text-foreground">{deleteTarget.role || '—'}</dd></div>
            </dl>
            {deleteError && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">{deleteError}</p>}
          </div>
        ) : undefined}
      />
      <ViewAccountModal open={!!selected && !pendingAction} staff={selected} onClose={() => setSelected(null)} editable={editMode} onSave={async (s) => { await updateStaff(s); setSelected(null) }} />
      {pendingAction && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-700/70 p-4" role="dialog" aria-modal="true" aria-labelledby="workforce-action-title">
          <div className="w-full max-w-md overflow-hidden rounded-lg bg-card shadow-2xl">
            <div className="flex items-center gap-3 bg-destructive px-6 py-4 text-destructive-foreground">
              <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
              <h2 id="workforce-action-title" className="text-sm font-bold uppercase tracking-[0.15em]">
                {pendingAction === 'suspend' ? (selected.accountStatus === 'Suspended' ? 'Reactivate Account?' : 'Suspend Account?') : 'Force Logout?'}
              </h2>
            </div>
            <form className="space-y-4 px-6 py-6" onSubmit={async (event) => {
              event.preventDefault()
              const reason = actionReason.trim()
              if (!reason) {
                setActionError(pendingAction === 'suspend' ? 'Please provide a reason for suspending this account.' : 'Please provide a reason for forcing this user to log out.')
                return
              }
              setActionError(null)
              try {
                if (pendingAction === 'suspend') await toggleSuspend(selected.id)
                else await forceLogout(selected.id)
                setPendingAction(null)
                setSelected(null)
                setActionReason('')
              } catch (error) {
                setActionError(error instanceof Error ? error.message : 'The account action could not be completed.')
              }
            }}>
              <div className="text-sm text-foreground">
                <p>You are about to {pendingAction === 'suspend' ? (selected.accountStatus === 'Suspended' ? 'reactivate' : 'suspend') : 'terminate the active session for'}:</p>
                <p className="mt-1 font-semibold">{selected.fullName || `${selected.firstName} ${selected.surname}`.trim() || '—'}</p>
                {selected.email && <p className="text-xs text-muted-foreground">{selected.email}</p>}
              </div>
              <label className="block text-xs font-semibold text-foreground" htmlFor="workforce-action-reason">
                Reason <span className="text-destructive">*</span>
                <textarea id="workforce-action-reason" required value={actionReason} onChange={(event) => setActionReason(event.target.value)} rows={4} placeholder="Describe why this administrative action is required..." className="mt-1.5 w-full resize-none rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30" />
              </label>
              {actionError && <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">{actionError}</p>}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => { setPendingAction(null); setActionReason(''); setActionError(null) }} className="rounded-md border border-input bg-background px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted">Cancel</button>
                <button type="submit" className="rounded-md bg-destructive px-4 py-2.5 text-xs font-bold text-destructive-foreground hover:opacity-90">{pendingAction === 'suspend' ? (selected.accountStatus === 'Suspended' ? 'Reactivate Account' : 'Suspend Account') : 'Force Logout'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminShell>
  )
}

export default AdminWorkforcePage
