import { useEffect, useMemo, useState } from 'react'
import {
  Search,
  CheckCircle2,
  XCircle,
  Clock3,
  MoreVertical,
  Wrench,
  Ban,
  ArrowUpCircle,
  AlertTriangle,
  BadgeCheck,
} from 'lucide-react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { DamageVerdictModal } from '@/components/DamageVerdictModal'
import { CompactStatStrip } from '@/components/CompactStatStrip'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import type { DamageException, DamageVerdict } from '@/lib/types'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'

// Updated to the 6-status model (Phase 4b cleanup) — Scale/UserCheck2 icons
// dropped since 'Held for Audit' / 'Pending Second Sign-off' no longer exist.
const statusStyles: Record<DamageVerdict, string> = {
  'Pending Verdict': 'border border-primary/40 bg-primary/10 text-primary',
  'Escalated — Round 1 Review': 'bg-rose-100 text-rose-700 border border-rose-200',
  'Dismissed': 'bg-muted text-muted-foreground',
  'Pending Resolution': 'bg-emerald-100 text-emerald-700',
  'Escalated — Round 2 Review': 'bg-rose-100 text-rose-700 border border-rose-200',
  'Sent for Repair': 'bg-sky-100 text-sky-700',
  'Sent for Write-off': 'bg-muted text-muted-foreground',
}

const statusIcon: Record<DamageVerdict, typeof Clock3> = {
  'Pending Verdict': Clock3,
  'Escalated — Round 1 Review': ArrowUpCircle,
  'Dismissed': XCircle,
  'Pending Resolution': CheckCircle2,
  'Escalated — Round 2 Review': ArrowUpCircle,
  'Sent for Repair': Wrench,
  'Sent for Write-off': Ban,
}

type Filter =
  | 'All'
  | 'Pending Verdict'
  | 'Escalated — Round 1 Review'
  | 'Dismissed'
  | 'Pending Resolution'
  | 'Escalated — Round 2 Review'
  | 'Sent for Repair'
  | 'Sent for Write-off'

const filters: Filter[] = [
  'All',
  'Pending Verdict',
  'Escalated — Round 1 Review',
  'Pending Resolution',
  'Escalated — Round 2 Review',
  'Sent for Repair',
  'Sent for Write-off',
  'Dismissed',
]

type ExecutiveModalMode =
  | 'view'
  | 'evaluate-round1'
  | 'evaluate-round2'
  | 'edit-round1'
  | 'edit-round2'

export function DamageValidationPage() {
  const { damageExceptions: items, resolveDamage } = usePortal()
  const { isAdmin } = useAuth()
  const { intent, clearIntent, navigate } = useNav()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('All')
  const [active, setActive] = useState<DamageException | null>(null)
  const [modalMode, setModalMode] = useState<ExecutiveModalMode>('view')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => {
    if (intent?.kind === 'review-damage') {
      const target = items.find((i) => i.id === intent.payload?.id)
      if (target) {
        setModalMode('view')
        setActive(target)
      }
      clearIntent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent])

  useEffect(() => {
    if (!openMenuId) return
    const handler = () => setOpenMenuId(null)
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [openMenuId])

  const stats = useMemo(
    () => ({
      total: items.length,
      pending: items.filter((i) => i.status === 'Pending Verdict').length,
      escalated: items.filter((i) => i.status === 'Escalated — Round 1 Review' || i.status === 'Escalated — Round 2 Review').length,
      resolved: items.filter(
        (i) =>
          i.status === 'Dismissed' ||
          i.status === 'Sent for Repair' ||
          i.status === 'Sent for Write-off',
      ).length,
    }),
    [items],
  )

  const filtered = useMemo(() => {
    const q = query.toLowerCase()
    return items.filter((i) => {
      const matchesQuery =
        !q ||
        i.logId.toLowerCase().includes(q) ||
        i.boundEvent.toLowerCase().includes(q) ||
        i.reportingOfficer.toLowerCase().includes(q) ||
        i.assetName.toLowerCase().includes(q) ||
        i.assetSku.toLowerCase().includes(q)
      const matchesFilter = filter === 'All' || i.status === filter
      return matchesQuery && matchesFilter
    })
  }, [items, query, filter])

  // Trimmed to match resolveDamage's simplified 4-arg signature (Phase 4b —
  // the two-sign-off mechanism, which needed executiveEmail/executiveName
  // for identity checks, no longer exists).
  const resolve = (
    id: string,
    verdict: Exclude<DamageVerdict, 'Pending Verdict'>,
    note: string,
  ) => {
    const round: 1 | 2 = modalMode === 'evaluate-round2' || modalMode === 'edit-round2' ? 2 : 1
    const isEdit = modalMode === 'edit-round1' || modalMode === 'edit-round2'
    resolveDamage(id, round, verdict, note, 'Executive', isEdit)
    setActive(null)
    setModalMode('view')
  }

  const openView = (exception: DamageException) => {
    setModalMode('view')
    setActive(exception)
  }

  const destination = (id: ExecutiveDestinationId) => navigate(id)

  const stickyHeader = (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl font-medium tracking-tight text-foreground sm:text-4xl">
            Damage Validation
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Post-event asset damage reports, photographic evidence review, and executive verdict
            sign-offs.
          </p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search log ID, event, submitter, asset..."
            className="w-full rounded-md border border-input bg-card py-2 pl-9 pr-3 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
          />
        </div>
      </div>
    </div>
  )

  return (
    <ExecutiveShell activeId="damage" onSelect={destination} stickyHeader={stickyHeader}>
      {/* Filter tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-1.5">
        {filters.map((f) => {
          const count = f === 'All' ? items.length : items.filter((i) => i.status === f).length
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.12em] transition',
                filter === f
                  ? 'bg-neutral-900 text-white'
                  : 'border border-border text-muted-foreground hover:bg-muted',
              )}
            >
              {f}
              <span className={filter === f ? 'text-white/70' : 'text-muted-foreground'}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
        <CompactStatStrip
          stats={[
            { label: 'Total Reports', value: stats.total },
            { label: 'Resolved Cases', value: stats.resolved },
            { label: 'Pending Verdicts', value: stats.pending },
            { label: 'Escalated to Executive', value: stats.escalated },
          ]}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[940px] text-left">
            <thead>
              <tr className="bg-muted/50">
                {[
                  'PREVIEW',
                  'LOG ID',
                  'EVENT TITLE',
                  'SUBMITTER',
                  'ROLE',
                  'ASSET',
                  'DETAILS',
                  'STATUS',
                  'ACTIONS',
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
                  <td colSpan={9} className="px-4 py-16 text-center text-xs text-muted-foreground">
                    No exceptions match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((i) => {
                  const Icon = statusIcon[i.status]
                  const canEvaluateRound1 = i.status === 'Escalated — Round 1 Review'
                  const canEvaluateRound2 = i.status === 'Escalated — Round 2 Review'
                  const canEditRound1 = i.round1DecidedBy === 'Executive'
                  const canEditRound2 = i.round2DecidedBy === 'Executive'
                  const isEscalated = canEvaluateRound1 || canEvaluateRound2
                  const canAct = isEscalated || canEditRound1 || canEditRound2
                  return (
                    <tr
                      key={i.id}
                      onClick={() => openView(i)}
                      className={cn(
                        'cursor-pointer border-t border-border/60 align-top transition-colors hover:bg-muted/40',
                        isEscalated && 'bg-rose-50/60 hover:bg-rose-50',
                      )}
                    >
                      <td className="px-4 py-4">
                        <div className="size-6 rounded bg-muted" />
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'text-xs font-bold tracking-wide',
                            isEscalated ? 'text-rose-700' : 'text-card-foreground',
                          )}
                        >
                          {i.logId}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-serif text-sm text-card-foreground">
                        {i.boundEvent}
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold text-card-foreground">
                        {i.reportingOfficer}
                      </td>
                      <td className="px-4 py-4 text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
                        {i.officerRole}
                      </td>
                      <td className="max-w-xs px-4 py-4">
                        <p
                          className={cn(
                            'text-sm font-semibold',
                            isEscalated ? 'text-rose-700' : 'text-card-foreground',
                          )}
                        >
                          {i.assetName}
                        </p>
                        <p className="mt-0.5 text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
                          SKU: {i.assetSku}
                        </p>
                      </td>
                      <td className="px-4 py-4 font-mono text-[0.65rem] leading-relaxed text-muted-foreground">
                        <p>GPS: {i.gps}</p>
                        <p>{i.capturedAt}</p>
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.55rem] font-bold uppercase tracking-[0.1em]',
                            statusStyles[i.status],
                          )}
                        >
                          <Icon className="size-3" />
                          {i.status}
                        </span>
                      </td>
                      <td className="px-4 py-4" onClick={(evt) => evt.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          {canAct && !isAdmin ? (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(evt) => {
                                  evt.stopPropagation()
                                  setOpenMenuId(openMenuId === i.id ? null : i.id)
                                }}
                                className="rounded p-1.5 text-muted-foreground transition hover:bg-muted"
                                aria-label="Actions"
                              >
                                <MoreVertical className="size-4" />
                              </button>
                              {openMenuId === i.id && (
                                <div className="absolute right-0 z-10 w-48 rounded-md border border-border bg-card py-1 shadow-lg">
                                  {canEvaluateRound1 && (
                                    <button
                                      type="button"
                                      onClick={(evt) => {
                                        evt.stopPropagation()
                                        setModalMode('evaluate-round1')
                                        setActive(i)
                                        setOpenMenuId(null)
                                      }}
                                      className="block w-full px-3 py-1.5 text-left text-[0.65rem] font-bold uppercase tracking-[0.12em] text-rose-700 transition hover:bg-rose-50"
                                    >
                                      Evaluate
                                    </button>
                                  )}
                                  {canEvaluateRound2 && (
                                    <button
                                      type="button"
                                      onClick={(evt) => {
                                        evt.stopPropagation()
                                        setModalMode('evaluate-round2')
                                        setActive(i)
                                        setOpenMenuId(null)
                                      }}
                                      className="block w-full px-3 py-1.5 text-left text-[0.65rem] font-bold uppercase tracking-[0.12em] text-rose-700 transition hover:bg-rose-50"
                                    >
                                      Evaluate
                                    </button>
                                  )}
                                  {canEditRound1 && (
                                    <button
                                      type="button"
                                      onClick={(evt) => {
                                        evt.stopPropagation()
                                        setModalMode('edit-round1')
                                        setActive(i)
                                        setOpenMenuId(null)
                                      }}
                                      className="block w-full px-3 py-1.5 text-left text-[0.65rem] font-bold uppercase tracking-[0.12em] text-card-foreground transition hover:bg-muted"
                                    >
                                      {canEditRound2 ? 'Edit Round 1 Decision' : 'Edit'}
                                    </button>
                                  )}
                                  {canEditRound2 && (
                                    <button
                                      type="button"
                                      onClick={(evt) => {
                                        evt.stopPropagation()
                                        setModalMode('edit-round2')
                                        setActive(i)
                                        setOpenMenuId(null)
                                      }}
                                      className="block w-full px-3 py-1.5 text-left text-[0.65rem] font-bold uppercase tracking-[0.12em] text-card-foreground transition hover:bg-muted"
                                    >
                                      {canEditRound1 ? 'Edit Round 2 Decision' : 'Edit'}
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span
                              className="flex size-7 items-center justify-center rounded p-1.5 text-sm text-muted-foreground/40"
                              aria-label="No actions available"
                            >
                              —
                            </span>
                          )}
                          <div className="flex w-3.5 items-center justify-center">
                            {i.noPhotographicEvidence ? (
                              <span title="Evidence gap — incomplete verification">
                                <AlertTriangle className="size-3.5 text-amber-500" />
                              </span>
                            ) : i.validated ? (
                              <span title="Validated at Step 1">
                                <BadgeCheck className="size-3.5 text-emerald-600" />
                              </span>
                            ) : null}
                          </div>
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

      <DamageVerdictModal
        exception={active}
        mode={isAdmin ? 'view' : modalMode}
        onClose={() => {
          setActive(null)
          setModalMode('view')
        }}
        onResolve={resolve}
      />
    </ExecutiveShell>
  )
}
