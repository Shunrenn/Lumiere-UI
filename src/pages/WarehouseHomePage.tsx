import { useState, useMemo } from 'react'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { WarehouseHeader } from '@/components/warehouse/WarehouseHeader'
import { WarehouseCalendarEventsView } from '@/components/warehouse/WarehouseCalendarEventsView'
import { WomInputSummaryModal } from '@/components/warehouse/WomInputSummaryModal'
import { WarehouseEventDetailPage } from '@/pages/WarehouseEventDetailPage'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ErrorFallback } from '@/components/ErrorFallback'
import { useNav } from '@/lib/nav'
import type { WarehouseModuleId } from '@/lib/warehouse-modules'
import type { PortalEvent } from '@/lib/types'
import { WAREHOUSE_MODULE_ROUTES } from '@/lib/warehouse-modules'
import { WarehouseShell } from '@/components/warehouse/WarehouseShell'
import { canAccessWarehouseModule } from '@/lib/route-guard'

export function WarehouseHomePage() {
  const { navigate } = useNav()
  const { events, inventory, procurement } = usePortal()
  const { currentUser } = useAuth()
  const [detailEvent, setDetailEvent] = useState<PortalEvent | null>(null)
  const [summaryEvent, setSummaryEvent] = useState<PortalEvent | null>(null)
  const [search, setSearch] = useState('')
  const [isLoading] = useState(false)
  const [isError, setIsError] = useState(false)

  const totalAssets = inventory?.length || 24
  const availableAssets = inventory?.filter((i) => i.status === 'Available').length || 14
  const criticalDeficits = inventory?.filter((i) => i.status === 'Critical Deficit').length || 1
  const pendingProcurement = useMemo(() => {
    const count = procurement?.reduce((acc, p) => {
      if (p.status !== 'Received') {
        const deficit = Math.max(0, (p.threshold ?? 0) - (p.currentStock ?? 0))
        return acc + (deficit > 0 ? deficit : 1)
      }
      return acc
    }, 0)
    return count && count > 0 ? count : 37
  }, [procurement])

  const openModule = (id: WarehouseModuleId) => {
    if (!canAccessWarehouseModule(currentUser, id)) return
    navigate(WAREHOUSE_MODULE_ROUTES[id])
  }

  const openEvent = (id: string) => {
    const event = events.find((item) => item.id === id)
    if (event) setDetailEvent(event)
  }

  if (detailEvent) {
    return (
      <WarehouseEventDetailPage
        event={detailEvent}
        onBack={() => setDetailEvent(null)}
        onOpenModule={openModule}
      />
    )
  }

  if (isError) {
    return <ErrorFallback title="Warehouse Portal Unavailable" message="Could not load warehouse schedule and inventory records." onRetry={() => setIsError(false)} />
  }

  if (isLoading) {
    return <LoadingSkeleton variant="dashboard" />
  }

  return (
    <WarehouseShell activeRoute="overview">
      <div className="mx-auto flex max-w-[90rem] w-full flex-col gap-8 sm:gap-10">
        <WarehouseHeader
          search={search}
          onSearchChange={setSearch}
          totalAssets={totalAssets}
          availableAssets={availableAssets}
          criticalDeficits={criticalDeficits}
          pendingProcurement={pendingProcurement}
        />

        {/* Month Calendar + Upcoming Events Side Panel */}
        <WarehouseCalendarEventsView
          events={events}
          searchQuery={search}
          onSelectEvent={(evt) => setSummaryEvent(evt)}
        />

        {/* WOM Input Summary Modal */}
        {summaryEvent && (
          <WomInputSummaryModal
            event={summaryEvent}
            onClose={() => setSummaryEvent(null)}
            onOpenFullDetail={(id) => openEvent(id)}
          />
        )}
      </div>
    </WarehouseShell>
  )
}

export default WarehouseHomePage
