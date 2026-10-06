import { CompanionPanel } from '@/components/warehouse/CompanionPanel'
import { WarehouseShell } from '@/components/warehouse/WarehouseShell'
import { useNav } from '@/lib/nav'
import { WAREHOUSE_MODULE_ROUTES, type WarehouseModuleId } from '@/lib/warehouse-modules'

interface WarehouseModulePageProps {
  moduleId: WarehouseModuleId
}

/** Renders every Warehouse Operations module inside the same desktop frame. */
export function WarehouseModulePage({ moduleId }: WarehouseModulePageProps) {
  const { navigate } = useNav()

  return (
    <WarehouseShell activeRoute={WAREHOUSE_MODULE_ROUTES[moduleId]}>
      <CompanionPanel moduleId={moduleId} onClose={() => navigate('overview')} />
    </WarehouseShell>
  )
}
