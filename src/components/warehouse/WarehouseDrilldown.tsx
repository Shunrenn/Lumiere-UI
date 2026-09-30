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
  onSelectModule?: (id: WarehouseModuleId) => void
}

function moduleParamName(id: WarehouseModuleId): string {
  return id === 'assets' ? 'inventory' : id
}

export function WarehouseDrilldown({ entry, onExit, onSelectModule }: WarehouseDrilldownProps) {
  const [internalModuleId, setInternalModuleId] = useState<WarehouseModuleId>(entry.moduleId)

  useEffect(() => {
    setInternalModuleId(entry.moduleId)
  }, [entry.moduleId])

  const activeModuleId = entry.moduleId || internalModuleId

  const handleSelectModule = (id: WarehouseModuleId) => {
    if (onSelectModule) {
      onSelectModule(id)
    } else {
      setInternalModuleId(id)
      const param = moduleParamName(id)
      const targetSearch = `?module=${param}`
      if (typeof window !== 'undefined' && window.location.search !== targetSearch) {
        window.history.pushState({ route: 'overview', module: param }, '', `/overview${targetSearch}`)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex bg-background">
      <WarehouseRail activeModuleId={activeModuleId} onSelectModule={handleSelectModule} onExit={onExit} />
      <CompanionPanel moduleId={activeModuleId} onClose={onExit} />
    </div>
  )
}
