import { useEffect, useState } from 'react'
import type { PortalEvent } from '@/lib/types'
import type { WarehouseModuleId } from '@/lib/warehouse-modules'
import { WarehouseRail } from '@/components/warehouse/WarehouseRail'
import { CompanionPanel } from '@/components/warehouse/CompanionPanel'

export type DrilldownEntry =
  | { kind: 'module'; moduleId: WarehouseModuleId }
  | { kind: 'event'; event: PortalEvent }

interface WarehouseDrilldownProps {
  entry: { kind: 'module'; moduleId: WarehouseModuleId }
  onExit: () => void
}

function moduleParamName(id: WarehouseModuleId): string {
  return id === 'assets' ? 'inventory' : id
}

export function WarehouseDrilldown({ entry, onExit }: WarehouseDrilldownProps) {
  const [activeModuleId, setActiveModuleId] = useState<WarehouseModuleId>(entry.moduleId)

  // Sync state when props change
  useEffect(() => {
    setActiveModuleId(entry.moduleId)
  }, [entry.moduleId])

  // Sync address bar on mount or module change
  useEffect(() => {
    const param = moduleParamName(activeModuleId)
    const targetSearch = `?module=${param}`
    if (typeof window !== 'undefined' && window.location.search !== targetSearch) {
      window.history.replaceState({ route: 'overview', module: param }, '', `/overview${targetSearch}`)
    }
  }, [activeModuleId])

  // Listen to popstate changes to sync activeModuleId when navigating history
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search)
      const raw = params.get('module')?.toLowerCase().trim()
      if (raw) {
        const modId: WarehouseModuleId = (raw === 'inventory' || raw === 'assets') ? 'assets' : (raw as WarehouseModuleId)
        setActiveModuleId(modId)
      }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleSelectModule = (id: WarehouseModuleId) => {
    setActiveModuleId(id)
    const param = moduleParamName(id)
    const targetSearch = `?module=${param}`
    if (typeof window !== 'undefined' && window.location.search !== targetSearch) {
      window.history.pushState({ route: 'overview', module: param }, '', `/overview${targetSearch}`)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex bg-background">
      <WarehouseRail activeModuleId={activeModuleId} onSelectModule={handleSelectModule} onExit={onExit} />
      <CompanionPanel moduleId={activeModuleId} onClose={onExit} />
    </div>
  )
}
