import { useMemo, useState } from 'react'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import type { PortalEvent } from '@/lib/types'
import type { WarehouseModuleId } from '@/lib/warehouse-modules'
import {
  computeProductionBanner,
  dispatchBannerFor,
  getEventDetailSnapshot,
  resolveCatalogAssetForItem,
  type EventAllocatedItem,
  type EventCrewAssignment,
} from '@/lib/event-detail'
import {
  addNewBatch,
  advanceBatchStage,
  markBatchStalled,
  resolveBatchStall,
  updateBatchHandoffNote,
  updateReconciliationRow,
  useDispatchStore,
} from '@/lib/warehouse-dispatch'
import { useProductionItems, type ProductionItem } from '@/lib/warehouse-production'
import { EventDetailHeader } from '@/components/warehouse/event-detail/EventDetailHeader'
import { CrewPanel } from '@/components/warehouse/event-detail/CrewPanel'
import { ItemsPanel } from '@/components/warehouse/event-detail/ItemsPanel'
import { ProductionPanel } from '@/components/warehouse/event-detail/ProductionPanel'
import { ReplenishmentPanel } from '@/components/warehouse/event-detail/ReplenishmentPanel'
import { DispatchPanel } from '@/components/warehouse/event-detail/DispatchPanel'
import { BatchDetailView } from '@/components/warehouse/event-detail/BatchDetailView'
import { AssignCrewModal } from '@/components/warehouse/event-detail/AssignCrewModal'
import { CrewInfoModal } from '@/components/warehouse/event-detail/CrewInfoModal'
import { EventChangesModal } from '@/components/warehouse/event-detail/EventChangesModal'
import { AssetDetailModal } from '@/components/warehouse/asset-catalog/AssetDetailModal'
import { ProductionDetailModal } from '@/components/warehouse/production/ProductionDetailModal'

interface WarehouseEventDetailPageProps {
  event: PortalEvent
  onBack: () => void
  onOpenModule: (id: WarehouseModuleId) => void
}

let batchSeq = 0

export function WarehouseEventDetailPage({ event, onBack, onOpenModule }: WarehouseEventDetailPageProps) {
  const { events, staff, procurement } = usePortal()
  const { hasFullWarehouseAccess, isManningOfficer, isProductionManager } = useAuth()
  // Full crew detail is granted to the full-access Warehouse Ops Manager
  // super-account AND the Manning Officer WOM sub-role (Modify on Manpower &
  // Crew per the RBAC screen) — not the coarse account type, which every WOM
  // sub-role satisfies. Other sub-roles (e.g. Purchasing Officer) get the
  // muted restricted state.
  const canViewFullCrewDetail = hasFullWarehouseAccess || isManningOfficer
  const snapshot = useMemo(() => getEventDetailSnapshot(event, staff, procurement), [event, staff, procurement])

  const [crew, setCrew] = useState<EventCrewAssignment[]>(snapshot.crew)
  const dispatchStore = useDispatchStore(events, staff, procurement)
  const batches = dispatchStore.get(event.id) ?? snapshot.dispatch.batches
  const [activeBatchId, setActiveBatchId] = useState<string | null>(null)
  const [crewModalOpen, setCrewModalOpen] = useState(false)
  const [selectedAssetItem, setSelectedAssetItem] = useState<EventAllocatedItem | null>(null)
  const [selectedProductionItem, setSelectedProductionItem] = useState<ProductionItem | null>(null)
  const [selectedCrewMember, setSelectedCrewMember] = useState<EventCrewAssignment | null>(null)
  const [changesModalOpen, setChangesModalOpen] = useState(false)

  const fieldCrew = useMemo(() => staff.filter((member) => member.role === 'Field & Production Crew'), [staff])

  // Production/Bespoke panel — sourced from the real Production &
  // Fabrication store (scoped to this event via eventId), not a synthetic
  // per-event derivation, so the banner always matches the items rendered.
  const allProductionItems = useProductionItems(events, staff)
  const productionItems = useMemo(
    () => allProductionItems.filter((item) => item.eventId === event.id),
    [allProductionItems, event.id],
  )
  const productionBanner = useMemo(() => computeProductionBanner(productionItems), [productionItems])
  const activeProductionItem = selectedProductionItem
    ? productionItems.find((item) => item.id === selectedProductionItem.id) ?? selectedProductionItem
    : null

  const activeIndex = batches.findIndex((batch) => batch.id === activeBatchId)
  const activeBatch = activeIndex >= 0 ? batches[activeIndex] : null

  const handleNewBatch = () => {
    batchSeq += 1
    const newBatch = addNewBatch(event.id, 'outbound', procurement)
    setActiveBatchId(newBatch.id)
  }

  const handleJustificationChange = (batchId: string, rowId: string, value: string) => {
    updateReconciliationRow(event.id, batchId, rowId, { justification: value })
  }

  const handleHandoffNoteChange = (batchId: string, value: string) => {
    updateBatchHandoffNote(event.id, batchId, value)
  }

  const handleAdvanceStage = (batchId: string) => {
    advanceBatchStage(event.id, batchId)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-10 sm:px-8 sm:py-14">
        <EventDetailHeader
          event={event}
          overallStatus={snapshot.overallStatus}
          changedSinceLastView={snapshot.changedSinceLastView}
          onBack={onBack}
          onOpenChanges={() => setChangesModalOpen(true)}
        />

        <CrewPanel
          crew={crew}
          onManage={() => setCrewModalOpen(true)}
          onSelect={setSelectedCrewMember}
        />

        <ItemsPanel
          items={snapshot.items}
          onViewAllocation={() => onOpenModule('assets')}
          onOpenItem={setSelectedAssetItem}
        />

        <ProductionPanel
          banner={productionBanner}
          items={productionItems}
          onOpenItem={setSelectedProductionItem}
          onViewTracker={() => onOpenModule('production')}
        />

        <ReplenishmentPanel
          summary={snapshot.replenishment}
          onViewDeficits={() => onOpenModule('replenishment')}
        />

        <DispatchPanel
          banner={dispatchBannerFor(batches)}
          batches={batches}
          onNewBatch={handleNewBatch}
          onOpenBatch={setActiveBatchId}
        />
      </div>

      {activeBatch && (
        <BatchDetailView
          batch={activeBatch}
          hasPrevious={activeIndex > 0}
          hasNext={activeIndex < batches.length - 1}
          onPrevious={() => setActiveBatchId(batches[activeIndex - 1]?.id ?? null)}
          onNext={() => setActiveBatchId(batches[activeIndex + 1]?.id ?? null)}
          onClose={() => setActiveBatchId(null)}
          onJustificationChange={(rowId, value) => handleJustificationChange(activeBatch.id, rowId, value)}
          onHandoffNoteChange={(value) => handleHandoffNoteChange(activeBatch.id, value)}
          onAdvanceStage={() => handleAdvanceStage(activeBatch.id)}
          onStall={(reason) => markBatchStalled(event.id, activeBatch.id, reason)}
          onResume={() => resolveBatchStall(event.id, activeBatch.id)}
        />
      )}

      {crewModalOpen && (
        <AssignCrewModal
          availableStaff={fieldCrew}
          assigned={crew}
          onClose={() => setCrewModalOpen(false)}
          onSave={(nextCrew) => {
            setCrew(nextCrew)
            setCrewModalOpen(false)
          }}
        />
      )}

      {selectedAssetItem && (
        <AssetDetailModal
          asset={resolveCatalogAssetForItem(selectedAssetItem)}
          onClose={() => setSelectedAssetItem(null)}
        />
      )}

      {activeProductionItem && (
        <ProductionDetailModal
          item={activeProductionItem}
          isProductionManager={hasFullWarehouseAccess || isProductionManager}
          onClose={() => setSelectedProductionItem(null)}
        />
      )}

      {selectedCrewMember && (
        <CrewInfoModal
          member={selectedCrewMember}
          staff={staff.find((member) => member.id === selectedCrewMember.id) ?? null}
          canViewFullDetail={canViewFullCrewDetail}
          onClose={() => setSelectedCrewMember(null)}
        />
      )}

      {changesModalOpen && (
        <EventChangesModal
          eventTitle={event.title}
          editedFields={snapshot.editedFields}
          onClose={() => setChangesModalOpen(false)}
        />
      )}
    </div>
  )
}

export default WarehouseEventDetailPage
