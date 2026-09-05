import { useEffect, useMemo, useState } from 'react'
import { Search, CheckCircle2, XCircle, Clock3, Scale, MoreVertical, Wrench, Ban, UserCheck2 } from 'lucide-react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { DamageVerdictModal } from '@/components/DamageVerdictModal'
import { CompactStatStrip } from '@/components/CompactStatStrip'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { useNav } from '@/lib/nav'
import { cn } from '@/lib/utils'
import type { DamageException, DamageVerdict } from '@/lib/types'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'

const statusStyles: Record<DamageVerdict, string> = {
  'Pending Verdict': 'border border-primary/40 bg-primary/10 text-primary',
  Validated: 'bg-emerald-100 text-emerald-700',
  Dismissed: 'bg-muted text-muted-foreground',
  'Held for Audit': 'bg-amber-100 text-amber-800',
  'Pending Second Sign-off': 'bg-amber-100 text-amber-800',
  Repair: 'bg-sky-100 text-sky-700',
  'Write-off': 'bg-muted text-muted-foreground',
}

const statusIcon: Record<DamageVerdict, typeof Clock3> = {
  'Pending Verdict': Clock3,
  Validated: CheckCircle2,
  Dismissed: XCircle,
  'Held for Audit': Scale,
  'Pending Second Sign-off': UserCheck2,
  Repair: Wrench,
  'Write-off': Ban,
}

type Filter = 'All' | 'Pending' | 'Held for Audit' | 'Second Sign-off' | 'Validated' | 'Dismissed'
const filters: Filter[] = ['All', 'Pending', 'Held for Audit', 'Second Sign-off', 'Validated', 'Dismissed']

export function DamageValidationPage() {
  const { damageExceptions: items, resolveDamage, staff, subRolesByParent, setSubRolesByParent } = usePortal()
  const { isExecutive, isAdmin, isWarehouse, adminRole, adminEmail, adminName, subRole: userSubRole } = useAuth()
  const { intent, clearIntent, navigate } = useNav()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('All')
  const [active, setActive] = useState<DamageException | null>(null)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  const canEvaluate = !isExecutive && (isWarehouse || isAdmin)

  const currentWomSubRole = useMemo(() => {
    const womList = subRolesByParent['warehouse-ops-manager'] ?? []
    return womList.find((s) => s.name === userSubRole) ?? womList[0]
  }, [subRolesByParent, userSubRole])

  const activeWomCount = useMemo(
    () =>
      staff.filter(
        (s) =>
          s.accountStatus !== 'Suspended' &&
          (s.role === 'Warehouse Manager' ||
            (s as any).subRole === 'Warehouse Manager' ||
            (s as any).subRole === 'Inventory Officer' ||
            (s as any).fullWarehouseAccess === true ||
            s.email === 'warehouse@lumiere.com' ||
            s.email === 'warehouseops@lumiere.com'),
      ).length,
    [staff],
  )

  // Consume a "review-damage" intent handed over from the Executive dashboard.
  useEffect(() => {
    if (intent?.kind === 'review-damage') {
      const target = items.find((i) => i.id === intent.payload?.id)
      if (target) setActive(target)
      clearIntent()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent])

  const stats = useMemo(
    () => ({
      total: items.length,
      pending: items.filter((i) => i.status === 'Pending Verdict').length,
      resolved: items.filter((i) => i.status !== 'Pending Verdict').length,
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
      const matchesFilter =
        filter === 'All' ||
        (filter === 'Pending' && i.status === 'Pending Verdict') ||
        (filter === 'Second Sign-off' && i.status === 'Pending Second Sign-off') ||
        (filter !== 'Pending' && filter !== 'Second Sign-off' && i.status === filter)
      return matchesQuery && matchesFilter
    })
  }, [items, query, filter])

  const resolve = (
    id: string,
    verdict: Exclude<DamageVerdict, 'Pending Verdict'>,
    note: string,
    unblockMetadata?: any,
    selfValRecord?: any,
  ) => {
    resolveDamage(id, verdict, note, adminRole || userSubRole || 'Warehouse Manager', adminEmail, adminName, unblockMetadata, selfValRecord)
    setActive(null)
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

  const handlePermanentUnblockSubRole = (subRoleName: string, metadata: any) => {
    setSubRolesByParent((prev) => {
      const womList = prev['warehouse-ops-manager'] ?? []
      const updated = womList.map((s) => {
        if (s.name === subRoleName) {
          return {
            ...s,
            allowSelfValidation: true,
            permanentlyEnabledViaEmergency: true,
            emergencyUnblockMetadata: metadata,
          }
        }
        return s
      })
      return {
        ...prev,
        'warehouse-ops-manager': updated,
      }
    })
  }

  return (
    <ExecutiveShell activeId="damage" onSelect={destination} stickyHeader={stickyHeader}>
      {/* Filter tabs */}
      <div className="mt-6 flex flex-wrap items-center gap-1.5">
        {filters.map((f) => {
          const count =
            f === 'All'
              ? items.length
              : f === 'Pending'
                ? stats.pending
                : items.filter((i) => i.status === f).length
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
                const pending = i.status === 'Pending Verdict'
                return (
                  <tr
                    key={i.id}
                    className={cn(
                      'border-t border-border/60 align-top',
                      pending && 'bg-primary/5',
                    )}
                  >
                    {/* Preview */}
                    <td className="px-4 py-4">
                      <div className="size-6 rounded bg-muted" />
                    </td>
                    {/* Log ID */}
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          'text-xs font-bold tracking-wide',
                          pending ? 'text-primary' : 'text-card-foreground',
                        )}
                      >
                        {i.logId}
                      </span>
                    </td>
                    {/* Event Title */}
                    <td className="px-4 py-4 font-serif text-sm text-card-foreground">
                      {i.boundEvent}
                    </td>
                    {/* Submitter */}
                    <td className="px-4 py-4 text-xs font-semibold text-card-foreground">
                      {i.reportingOfficer}
                    </td>
                    {/* Role */}
                    <td className="px-4 py-4 text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
                      {i.officerRole}
                    </td>
                    {/* Asset */}
                    <td className="max-w-xs px-4 py-4">
                      <p
                        className={cn(
                          'text-sm font-semibold',
                          pending ? 'text-primary' : 'text-card-foreground',
                        )}
                      >
                        {i.assetName}
                      </p>
                      <p className="mt-0.5 text-[0.6rem] uppercase tracking-[0.1em] text-muted-foreground">
                        SKU: {i.assetSku}
                      </p>
                    </td>
                    {/* Details */}
                    <td className="px-4 py-4 font-mono text-[0.65rem] leading-relaxed text-muted-foreground">
                      <p>GPS: {i.gps}</p>
                      <p>{i.capturedAt}</p>
                    </td>
                    {/* Status */}
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
                      {i.status === 'Pending Second Sign-off' && i.firstSignOff && (
                        <p className="mt-1.5 text-[0.6rem] leading-relaxed text-muted-foreground">
                          First sign-off: {i.firstSignOff.staffName} ({i.firstSignOff.verdict})
                        </p>
                      )}
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActive(i)}
                          className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-primary underline-offset-4 transition hover:underline"
                        >
                          {pending ? (canEvaluate ? 'Evaluate Report' : 'View Report') : 'View Report'}
                        </button>
                        {canEvaluate && !pending && (
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setOpenMenuId(openMenuId === i.id ? null : i.id)}
                              className="rounded p-1 text-muted-foreground hover:bg-muted"
                            >
                              <MoreVertical className="size-4" />
                            </button>
                            {openMenuId === i.id && (
                              <div className="absolute right-0 z-10 rounded-md border border-border bg-card shadow-lg">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActive(i)
                                    setOpenMenuId(null)
                                  }}
                                  className="block w-full px-4 py-2 text-left text-[0.6rem] font-bold uppercase tracking-[0.12em] text-card-foreground hover:bg-muted rounded"
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </div>
                        )}
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
        editable={canEvaluate}
        onClose={() => setActive(null)}
        onResolve={resolve}
        currentExecutiveEmail={adminEmail}
        currentExecutiveName={adminName}
        activeExecutiveCount={activeWomCount}
        allowSelfValidation={currentWomSubRole?.allowSelfValidation ?? true}
        permanentlyEnabledViaEmergency={currentWomSubRole?.permanentlyEnabledViaEmergency ?? false}
        womSubRoleName={currentWomSubRole?.name ?? 'Warehouse Manager'}
        onPermanentUnblockSubRole={handlePermanentUnblockSubRole}
      />
    </ExecutiveShell>
  )
}
