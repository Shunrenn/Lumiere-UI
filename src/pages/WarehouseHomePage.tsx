import { useState } from 'react'
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
import type { PortalEvent } from '@/shared/types'
import { WAREHOUSE_MODULE_ROUTES } from '@/lib/warehouse-modules'
import { WarehouseShell } from '@/components/warehouse/WarehouseShell'

import { canAccessWarehouseModule } from '@/lib/route-guard'

export function WarehouseHomePage() {
  const { navigate } = useNav()
  const { events } = usePortal()
  const { currentUser } = useAuth()
  const [detailEvent, setDetailEvent] = useState<PortalEvent | null>(null)
  const [summaryEvent, setSummaryEvent] = useState<PortalEvent | null>(null)
  const [isLoading] = useState(false)
  const [isError, setIsError] = useState(false)

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
    return <ErrorFallback title="Warehouse Portal Unavailable" message="Could not load warehouse schedule & inventory records." onRetry={() => setIsError(false)} />
  }

  if (isLoading) {
    return <LoadingSkeleton variant="dashboard" />
  }

  return (
    <WarehouseShell activeRoute="overview">
      <div className="mx-auto flex max-w-[90rem] w-full flex-col gap-8 sm:gap-10">
        <WarehouseHeader />

        {/* Month Calendar + Upcoming Events Side Panel */}
        <WarehouseCalendarEventsView
          events={events}
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
