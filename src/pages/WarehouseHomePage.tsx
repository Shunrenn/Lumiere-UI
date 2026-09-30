import { useEffect, useState } from 'react'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { WarehouseHeader } from '@/components/warehouse/WarehouseHeader'
import { ModuleEntryRow } from '@/components/warehouse/ModuleEntryRow'
import { WarehouseCalendarEventsView } from '@/components/warehouse/WarehouseCalendarEventsView'
import { WomInputSummaryModal } from '@/components/warehouse/WomInputSummaryModal'
import { WarehouseDrilldown, type DrilldownEntry } from '@/components/warehouse/WarehouseDrilldown'
import { WarehouseEventDetailPage } from '@/pages/WarehouseEventDetailPage'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ErrorFallback } from '@/components/ErrorFallback'
import type { WarehouseModuleId } from '@/lib/warehouse-modules'
import type { PortalEvent } from '@/lib/types'

function parseWarehouseModuleFromUrl(): WarehouseModuleId | null {
  if (typeof window === 'undefined') return null
  const params = new URLSearchParams(window.location.search)
  const raw = params.get('module')?.toLowerCase().trim()
  if (!raw) return null
  const validModules: Record<string, WarehouseModuleId> = {
    inventory: 'assets',
    assets: 'assets',
    replenishment: 'replenishment',
    vendors: 'vendors',
    dispatch: 'dispatch',
    manning: 'manning',
    production: 'production',
    incidents: 'incidents',
  }
  return validModules[raw] ?? null
}

function isModuleAllowedForRole(modId: WarehouseModuleId, isAssociate: boolean): boolean {
  if (isAssociate && (modId === 'manning' || modId === 'production' || modId === 'incidents')) {
    return false
  }
  return true
}

export function WarehouseHomePage() {
  const { events } = usePortal()
  const { isWarehouseAssociate } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [drilldown, setDrilldown] = useState<DrilldownEntry | null>(null)
  const [summaryEvent, setSummaryEvent] = useState<PortalEvent | null>(null)
  const [isLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  useEffect(() => {
    const syncFromUrl = () => {
      const modId = parseWarehouseModuleFromUrl()
      if (modId && isModuleAllowedForRole(modId, isWarehouseAssociate)) {
        setDrilldown({ kind: 'module', moduleId: modId })
      } else {
        setDrilldown((prev) => (prev?.kind === 'module' ? null : prev))
      }
    }

    syncFromUrl()
    window.addEventListener('popstate', syncFromUrl)
    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [isWarehouseAssociate])

  const openModule = (id: WarehouseModuleId) => {
    if (!isModuleAllowedForRole(id, isWarehouseAssociate)) return
    setDrilldown({ kind: 'module', moduleId: id })
    const paramName = id === 'assets' ? 'inventory' : id
    const targetSearch = `?module=${paramName}`
    if (typeof window !== 'undefined' && window.location.search !== targetSearch) {
      window.history.pushState({ route: 'overview', module: paramName }, '', `/overview${targetSearch}`)
    }
  }

  const handleCloseDrilldown = () => {
    setDrilldown(null)
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.pushState({ route: 'overview' }, '', '/overview')
    }
  }

  const openEvent = (id: string) => {
    const event = events.find((item) => item.id === id)
    if (event) setDrilldown({ kind: 'event', event })
  }

  if (drilldown?.kind === 'event') {
    return (
      <WarehouseEventDetailPage
        event={drilldown.event}
        onBack={handleCloseDrilldown}
        onOpenModule={openModule}
      />
    )
  }

  if (drilldown?.kind === 'module') {
    return <WarehouseDrilldown entry={drilldown} onExit={handleCloseDrilldown} />
  }

  if (isError) {
    return <ErrorFallback title="Warehouse Portal Unavailable" message="Could not load warehouse schedule & inventory records." onRetry={() => setIsError(false)} />
  }

  if (isLoading) {
    return <LoadingSkeleton variant="dashboard" />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-[90rem] w-full flex-col gap-8 sm:gap-10 px-6 py-8 sm:px-10 sm:py-12">
        {/* Header section — untouched */}
        <WarehouseHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} />

        {/* 4-per-row Restructured Module Grid */}
        <ModuleEntryRow onOpenModule={openModule} />

        {/* Month Calendar + Upcoming Events Side Panel */}
        <WarehouseCalendarEventsView
          events={events}
          onSelectEvent={(evt) => setSummaryEvent(evt)}
        />
      </div>

      {/* WOM Input Summary Modal */}
      {summaryEvent && (
        <WomInputSummaryModal
          event={summaryEvent}
          onClose={() => setSummaryEvent(null)}
          onOpenFullDetail={(id) => openEvent(id)}
        />
      )}
    </div>
  )
}

export default WarehouseHomePage
