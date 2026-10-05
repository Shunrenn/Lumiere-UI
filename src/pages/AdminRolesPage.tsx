import { useCallback, useEffect, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { AdminShell } from '@/components/admin/AdminShell'
import { useNav } from '@/lib/nav'
import { useAuth } from '@/lib/auth'
import { fetchAdminRolePermissions, extractExecutiveAssetCapability, updateRoleAssetCapability } from '@/features/admin/api/adminPermissionsApi'
import { ACCESS_LEVELS, STRUCTURAL_ROLES } from '@/lib/rbac'
import { cn } from '@/lib/utils'
import type { AdminDestinationId } from '@/lib/admin-destinations'

type CurrentRole = {
  id: string
  name: string
  scope: string
  description: string
}

const CURRENT_ROLES: CurrentRole[] = [
  ...STRUCTURAL_ROLES,
  {
    id: 'warehouse-ops-manager',
    name: 'Warehouse Operations Manager',
    scope: 'Warehouse operations and inventory workflows',
    description: 'Coordinates warehouse operations, inventory, purchasing, and physical asset handling as one top-level account role.',
  },
  {
    id: 'ground-crew',
    name: 'Ground Crew',
    scope: 'Field execution and event support',
    description: 'Executes field operations and event support workflows as one top-level account role.',
  },
]

export function AdminRolesPage() {
  const { navigate } = useNav()
  const { refreshCapabilities } = useAuth()
  const [execCapability, setExecCapability] = useState(false)
  const [loadingExecCapability, setLoadingExecCapability] = useState(true)
  const [mutatingExecCapability, setMutatingExecCapability] = useState(false)
  const [execCapabilityError, setExecCapabilityError] = useState<string | null>(null)

  const loadExecCapability = useCallback(async () => {
    setLoadingExecCapability(true)
    setExecCapabilityError(null)
    try {
      const response = await fetchAdminRolePermissions()
      if (response.success && response.data) {
        setExecCapability(extractExecutiveAssetCapability(response.data) ?? false)
      } else {
        setExecCapability(false)
        setExecCapabilityError(response.error || 'Unable to fetch role permissions from backend authority.')
      }
    } catch (error) {
      setExecCapability(false)
      setExecCapabilityError(error instanceof Error ? error.message : 'Network failure loading permissions.')
    } finally {
      setLoadingExecCapability(false)
    }
  }, [])

  useEffect(() => {
    void loadExecCapability()
  }, [loadExecCapability])

  const handleToggleExecutiveAssetCapability = async () => {
    if (loadingExecCapability || mutatingExecCapability) return
    setMutatingExecCapability(true)
    setExecCapabilityError(null)
    try {
      const response = await updateRoleAssetCapability('Executive', !execCapability)
      if (response.success) {
        setExecCapability(!execCapability)
        await loadExecCapability()
        void refreshCapabilities?.()
      } else {
        setExecCapabilityError(response.error || 'Server rejected capability update.')
      }
    } catch (error) {
      setExecCapabilityError(error instanceof Error ? error.message : 'Network error updating capability.')
    } finally {
      setMutatingExecCapability(false)
    }
  }

  const railSelect = (id: AdminDestinationId) => {
    if (id === 'system-dashboard') navigate('overview')
    else if (id === 'workforce') navigate('workforce')
    else if (id === 'security-audit') navigate('security-audit')
  }

  return (
    <AdminShell
      activeId="rbac"
      onSelect={railSelect}
      stickyHeader={
        <div>
          <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Admin Console / Access</p>
          <h1 className="mt-2 font-serif text-3xl font-medium text-foreground sm:text-4xl">Roles &amp; Access</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Manage the six top-level system roles and their access scope.</p>
        </div>
      }
    >
      <div className="space-y-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-1 text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Access levels</span>
          {ACCESS_LEVELS.map((level) => (
            <span key={level.level} className="rounded-full border border-border bg-card px-2.5 py-1 text-[0.65rem] text-muted-foreground">
              <span className={cn('mr-1.5 rounded-full px-1.5 py-0.5 text-[0.55rem] font-bold uppercase', {
                'bg-sky-500/15 text-sky-300': level.level === 'View',
                'bg-amber-500/15 text-amber-300': level.level === 'Interact',
                'bg-emerald-500/15 text-emerald-300': level.level === 'Modify',
                'bg-muted text-muted-foreground': level.level === 'None',
              })}>{level.label}</span>
              {level.hint}
            </span>
          ))}
        </div>
        <section>
          <div className="mb-4">
            <h2 className="font-serif text-xl font-medium text-foreground">Current account roles</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Each role is a top-level account role. Access scope follows the existing permission model.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {CURRENT_ROLES.map((role) => (
              <article key={role.id} className="rounded-xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-sm font-semibold uppercase tracking-[0.1em] text-card-foreground">{role.name}</h3>
                  <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden="true" />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{role.description}</p>
                <p className="mt-4 border-t border-border/60 pt-3 text-[0.68rem] font-medium text-primary">{role.scope}</p>
                {role.id === 'executive' && (
                  <>
                    <button type="button" disabled={loadingExecCapability || mutatingExecCapability} onClick={handleToggleExecutiveAssetCapability} className="mt-4 rounded-full border border-border bg-muted/60 px-3 py-1.5 text-[0.65rem] font-semibold text-foreground disabled:opacity-50" aria-pressed={execCapability}>
                      {loadingExecCapability ? 'Asset Inventory: Syncing...' : execCapability ? 'Asset Inventory: ON' : 'Asset Inventory: OFF'}
                    </button>
                    {execCapabilityError && <p className="mt-2 text-[0.65rem] text-amber-500">Server sync notice: {execCapabilityError}</p>}
                  </>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </AdminShell>
  )
}

export default AdminRolesPage
