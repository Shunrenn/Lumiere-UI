import { useAuth } from '@/lib/auth'
import { DashboardRoleHeader } from '@/components/dashboard/DashboardRoleHeader'

export function WarehouseHeader() {
  const { adminName } = useAuth()

  return <DashboardRoleHeader roleLabel="Warehouse Operations Manager" name={adminName} />
}
