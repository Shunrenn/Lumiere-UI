import { useEffect, useMemo, useState } from 'react'
import { Search, Plus, MapPin, Briefcase } from 'lucide-react'
import { ConsoleLayout } from '@/components/ConsoleLayout'
import { DeployTaskForceModal } from '@/components/DeployTaskForceModal'
import { DeploymentDetailModal } from '@/components/DeploymentDetailModal'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ErrorFallback } from '@/components/ErrorFallback'
import { cn } from '@/lib/utils'
import { addDeployment, updateDeployment, useDeployments } from '@/lib/deployments'
import { usePortal } from '@/lib/store'
import { useDispatchStore } from '@/lib/warehouse-dispatch'

type DeployStatus = 'In Progress' | 'Awaiting Setup' | 'Completed'

interface Deployment {
  id: string
  date: string
  time: string
  deploymentId: string
  event: string
  venue: string
  task: string
  status: DeployStatus
  progress: number
  crewLeads: string[]
  staffMembers: string[]
  vehicle: string
}

const statusMeta: Record<DeployStatus, { badge: string; dot: string; bar: string; text: string }> = {
  'In Progress': { badge: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 dark:border dark:border-amber-800/60', dot: 'bg-amber-500', bar: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400' },
  'Awaiting Setup': { badge: 'bg-muted text-muted-foreground', dot: 'bg-muted-foreground', bar: 'bg-muted-foreground/40', text: 'text-muted-foreground' },
  Completed: { badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border dark:border-emerald-800/60', dot: 'bg-emerald-500', bar: 'bg-emerald-600 dark:bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400' },
}

type Filter = 'All Statuses' | DeployStatus

const FILTERS: Filter[] = ['All Statuses', 'In Progress', 'Awaiting Setup', 'Completed']

export function TaskDeploymentsPage() {
  const { events: portalEvents, staff, procurement } = usePortal()
  const dispatchStore = useDispatchStore(portalEvents, staff, procurement)
  const customDeployments = useDeployments()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('All Statuses')

  const deployments = useMemo<Deployment[]>(() => {
    if (!portalEvents || portalEvents.length === 0) return customDeployments

    const mapped: Deployment[] = portalEvents.map((evt, idx) => {
      const dateObj = new Date(`${evt.targetDate}T12:00:00`)
      const formattedDate = !isNaN(dateObj.getTime())
        ? dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        : evt.targetDate

      const batches = (dispatchStore.get(evt.id) ?? []).filter((b) => !b.isArchived)
      const primaryBatch = batches[0]

      let status: DeployStatus = 'Awaiting Setup'
      let progress = 0
      let crewLeads: string[] = ['Unassigned']
      let staffMembers: string[] = []
      let vehicle = 'No Fleet Assigned'
      let task = 'Awaiting Dispatch Setup'

      if (evt.status === 'Completed') {
        status = 'Completed'
        progress = 100
        task = `${evt.title} Installation & Operations`
      } else if (primaryBatch) {
        if (primaryBatch.stage === 'Delivered' || primaryBatch.stage === 'Returned') {
          status = 'Completed'
          progress = 100
        } else if (primaryBatch.stage === 'In Transit' || primaryBatch.stage === 'Loaded') {
          status = 'In Progress'
          progress = primaryBatch.stage === 'Loaded' ? 40 : 75
        } else {
          status = 'Awaiting Setup'
          progress = 15
        }

        const crewNames = (primaryBatch.crew || []).map((c: any) => (typeof c === 'string' ? c : c.name))
        if (crewNames.length > 0) {
          crewLeads = [crewNames[0]]
          staffMembers = crewNames.slice(1)
        }
        if (primaryBatch.vehicleType) {
          vehicle = `${primaryBatch.vehicleType}${primaryBatch.plateNumber ? ` (${primaryBatch.plateNumber})` : ''}`
        }
        task = `${evt.title} Logistics & Site Operations`
      }

      return {
        id: evt.id || `d-${idx + 1}`,
        date: formattedDate,
        time: idx % 2 === 0 ? '08:00 AM' : '11:30 AM',
        deploymentId: `LMR-DEP-${evt.refId ? evt.refId.replace('PRT-2026-', '') : String(941 + idx)}`,
        event: evt.title,
        venue: evt.venue,
        task,
        status,
        progress,
        crewLeads,
        staffMembers,
        vehicle,
      }
    })

    const customOnly = customDeployments.filter((c) => !mapped.some((m) => m.id === c.id || m.deploymentId === c.deploymentId))
    return [...mapped, ...customOnly]
  }, [portalEvents, customDeployments, dispatchStore])

  const kpiData = useMemo(() => {
    const activeVenues = new Set(deployments.map((d) => d.venue)).size
    const pendingCount = deployments.filter((d) => d.status === 'Awaiting Setup').length
    const inProgressCount = deployments.filter((d) => d.status === 'In Progress').length
    const totalProgress = deployments.reduce((acc, d) => acc + d.progress, 0)
    const avgProgress = deployments.length > 0 ? Math.round(totalProgress / deployments.length) : 0

    return [
      { label: 'Active Live Venues', value: String(activeVenues), sub: 'On-site installation projects' },
      { label: 'Pending Setups', value: String(pendingCount), sub: 'Awaiting site clearance' },
      { label: 'Fleet En Route', value: String(inProgressCount), sub: 'Active logistics transit' },
      { label: 'Completion Index', value: `${avgProgress}%`, sub: 'All milestones met on target' },
    ]
  }, [deployments])
  const [deployOpen, setDeployOpen] = useState(false)
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(null)
  const [reassignTarget, setReassignTarget] = useState<Deployment | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Deployment | null>(null)

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return deployments.filter((d) => {
      const matchesFilter = filter === 'All Statuses' || d.status === filter
      const matchesQuery =
        !q ||
        d.event.toLowerCase().includes(q) ||
        d.venue.toLowerCase().includes(q) ||
        d.deploymentId.toLowerCase().includes(q) ||
        d.task.toLowerCase().includes(q) ||
        d.crewLeads.some((c) => c.toLowerCase().includes(q))
      return matchesFilter && matchesQuery
    })
  }, [query, filter, deployments])

  // Cycle a deployment forward through its lifecycle when reassigned.
  const reassign = (id: string) => {
    const deployment = deployments.find((d) => d.id === id)
    if (!deployment) return
    const changes = deployment.status === 'Awaiting Setup'
      ? { status: 'In Progress' as const, progress: 10 }
      : deployment.status === 'In Progress'
        ? { status: 'Completed' as const, progress: 100 }
        : {}
    updateDeployment(id, changes)
    setReassignTarget(null)
  }

  const archive = (id: string) => {
    updateDeployment(id, { status: 'Completed', progress: 100 })
    setArchiveTarget(null)
  }

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
    <ConsoleLayout>
      {isError ? (
        <ErrorFallback
          title="Deployments Registry Unavailable"
          message="Could not load task force deployments."
          onRetry={handleRefetch}
        />
      ) : isLoading ? (
        <LoadingSkeleton variant="table" />
      ) : (
        <>
      <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Warehouse · Deployments
          </p>
          <h1 className="mt-1 font-serif text-3xl font-medium tracking-tight text-foreground lg:text-4xl">
            Automated Event Deployments
          </h1>
          <p className="mt-2 text-xs italic text-muted-foreground">
            Real-time view of auto-assigned crew allocations, venue setups, and task completions across active events.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search events, venues, crew, or tasks..."
              className="w-full rounded-md border border-input bg-card py-2.5 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30 sm:w-64"
            />
          </div>
          <button
            type="button"
            onClick={() => setDeployOpen(true)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-5 py-2.5 text-[0.65rem] font-bold uppercase tracking-[0.12em] text-primary-foreground transition hover:opacity-90"
          >
            <Plus className="size-3.5" />
            Deploy New Task Force
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((k) => (
          <div key={k.label} className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <p className="text-[0.58rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {k.label}
            </p>
            <p className="mt-3 font-sans text-2xl font-bold leading-none text-card-foreground">
              {k.value}
            </p>
            <p className="mt-3 text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Registry */}
      <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-4 border-b border-border px-5 py-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-serif text-2xl font-medium tracking-tight text-card-foreground">
              Deployment Registry
            </h2>
            <span className="rounded-full bg-muted px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {filtered.length} Records
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                aria-pressed={filter === f}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[0.56rem] font-semibold uppercase tracking-[0.1em] transition',
                  filter === f
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted',
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left">
            <thead>
              <tr className="bg-muted/50">
                {['Timestamp', 'Deployment ID', 'Event / Venue', 'Field Task', 'Crew Lead', 'Status', 'Progress', 'Actions'].map(
                  (h) => (
                    <th
                      key={h}
                      className={cn(
                        'px-5 py-3 text-[0.56rem] font-bold uppercase tracking-[0.12em] text-muted-foreground',
                        h === 'Actions' && 'text-right',
                      )}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-16 text-center text-xs text-muted-foreground">
                    No deployments match the current filter.
                  </td>
                </tr>
              ) : (
                filtered.map((d) => {
                  const meta = statusMeta[d.status]
                  return (
                    <tr key={d.id} className="border-t border-border/60 align-middle hover:bg-muted/30 transition cursor-pointer">
                      <td className="px-5 py-4 text-xs text-card-foreground">
                        <p className="font-semibold">{d.date}</p>
                        <p className="text-[0.65rem] text-muted-foreground">{d.time}</p>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-muted-foreground">
                        {d.deploymentId}
                      </td>
                      <td className="px-5 py-4">
                        <div className="text-xs text-card-foreground">
                          <p className="font-semibold">{d.event}</p>
                          <p className="text-[0.65rem] text-muted-foreground flex items-center gap-1">
                            <MapPin className="size-3" />
                            {d.venue}
                          </p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-start gap-1.5 text-xs text-card-foreground">
                          <Briefcase className="size-3.5 mt-0.5 shrink-0 text-primary" />
                          <p className="text-[0.65rem] leading-snug max-w-xs">{d.task}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-xs text-card-foreground">
                        {d.crewLeads.join(', ')}
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em]',
                            meta.badge,
                          )}
                        >
                          <span className={cn('size-1.5 rounded-full', meta.dot)} />
                          {d.status}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1 w-20 overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn('h-full rounded-full', meta.bar)}
                              style={{ width: `${d.progress}%` }}
                            />
                          </div>
                          <span className={cn('text-[0.65rem] font-bold', meta.text)}>
                            {d.progress}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setSelectedDeployment(d)}
                            className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-card-foreground underline-offset-4 transition hover:underline"
                          >
                            View Details
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              d.status === 'Completed' ? setArchiveTarget(d) : setReassignTarget(d)
                            }
                            className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary underline-offset-4 transition hover:underline"
                          >
                            {d.status === 'Completed' ? 'Archive' : 'Reassign'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      <DeployTaskForceModal
        isOpen={deployOpen}
        onClose={() => setDeployOpen(false)}
        onInitialize={(draft) => {
          const newDeployment: Deployment = {
            id: `d-${Date.now()}`,
            date: new Date(`${draft.date}T12:00:00`).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
            time: '08:00 AM',
            deploymentId: `LMR-DEP-${String(950 + deployments.length).padStart(4, '0')}`,
            event: draft.event,
            venue: draft.venue,
            task: draft.task,
            status: 'In Progress',
            progress: 10,
            crewLeads: draft.crewLeads,
            staffMembers: draft.staffMembers,
            vehicle: draft.vehicle,
          }
          addDeployment(newDeployment)
          setDeployOpen(false)
        }}
      />

      <DeploymentDetailModal deployment={selectedDeployment} onClose={() => setSelectedDeployment(null)} />

      {/* Revalidation: Reassign Deployment */}
      <ConfirmDialog
        open={Boolean(reassignTarget)}
        tone="default"
        eyebrow="Reassign Deployment"
        title="Advance deployment status?"
        description={
          <>
            <span className="font-semibold text-foreground">{reassignTarget?.event}</span> at{' '}
            <span className="font-semibold text-foreground">{reassignTarget?.venue}</span> will move from{' '}
            <span className="font-semibold">{reassignTarget?.status}</span> to the next lifecycle phase.
          </>
        }
        confirmLabel="Advance Status"
        cancelLabel="Keep Current"
        onConfirm={() => reassignTarget && reassign(reassignTarget.id)}
        onCancel={() => setReassignTarget(null)}
      />

      {/* Revalidation: Archive Deployment */}
      <ConfirmDialog
        open={Boolean(archiveTarget)}
        tone="destructive"
        eyebrow="Archive Deployment"
        title="Archive this deployment?"
        description={
          <>
            <span className="font-semibold text-foreground">{archiveTarget?.event}</span> at{' '}
            <span className="font-semibold text-foreground">{archiveTarget?.venue}</span> will be removed from the active deployment registry. This action cannot be undone.
          </>
        }
        confirmLabel="Archive"
        cancelLabel="Keep Active"
        onConfirm={() => archiveTarget && archive(archiveTarget.id)}
        onCancel={() => setArchiveTarget(null)}
      />
    </ConsoleLayout>
  )
}
