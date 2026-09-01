import { useMemo, useState } from 'react'
import { usePortal } from '@/lib/store'
import { useDeployments } from '@/lib/deployments'
import { WarehouseHeader } from '@/components/warehouse/WarehouseHeader'
import { ModuleEntryRow } from '@/components/warehouse/ModuleEntryRow'
import { StatStrip } from '@/components/warehouse/StatStrip'
import { EventsSection } from '@/components/warehouse/EventsSection'
import { WarehouseDrilldown, type DrilldownEntry } from '@/components/warehouse/WarehouseDrilldown'
import { WarehouseEventDetailPage } from '@/pages/WarehouseEventDetailPage'
import type { WarehouseModuleId } from '@/lib/warehouse-modules'

export function WarehouseHomePage() {
  const { events, procurement, staff } = usePortal()
  const deployments = useDeployments()
  const [searchQuery, setSearchQuery] = useState('')
  const [drilldown, setDrilldown] = useState<DrilldownEntry | null>(null)

  const stats = useMemo(() => {
    const criticalDeficits = procurement.filter((item) => item.status === 'Critical Deficit').length
    const pendingProcurements = procurement.filter(
      (item) => (item.status === 'Critical Deficit' || item.status === 'Low Stock') && !item.poRef,
    ).length
    const activeBatchesInTransit = deployments.filter((record) => record.status === 'In Progress').length
    // Crew-conflict detection lands with the Manpower & Crew module in a later phase;
    // this placeholder reflects active field crew as a proxy signal for now.
    const crewConflictsFlagged = staff.filter(
      (member) => member.role === 'Field & Production Crew' && member.sessionStatus === 'Active Session',
    ).length
    return { criticalDeficits, pendingProcurements, activeBatchesInTransit, crewConflictsFlagged }
  }, [procurement, deployments, staff])

  const openModule = (id: WarehouseModuleId) => setDrilldown({ kind: 'module', moduleId: id })
  const openEvent = (id: string) => {
    const event = events.find((item) => item.id === id)
    if (event) setDrilldown({ kind: 'event', event })
  }

  if (drilldown?.kind === 'event') {
    return (
      <WarehouseEventDetailPage
        event={drilldown.event}
        onBack={() => setDrilldown(null)}
        onOpenModule={openModule}
      />
    )
  }

  if (drilldown?.kind === 'module') {
    return <WarehouseDrilldown entry={drilldown} onExit={() => setDrilldown(null)} />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 sm:px-8 sm:py-14">
        <WarehouseHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        <ModuleEntryRow onOpenModule={openModule} />

        <StatStrip
          criticalDeficits={stats.criticalDeficits}
          pendingProcurements={stats.pendingProcurements}
          activeBatchesInTransit={stats.activeBatchesInTransit}
          crewConflictsFlagged={stats.crewConflictsFlagged}
          onOpenModule={openModule}
        />

        <EventsSection events={events} searchQuery={searchQuery} onOpenEvent={openEvent} />
      </div>
    </div>
  )
}

export default WarehouseHomePage
