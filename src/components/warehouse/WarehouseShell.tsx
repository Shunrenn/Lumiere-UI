import type { ReactNode } from 'react'
import { ExecutiveShell } from '@/components/executive/ExecutiveShell'
import { useAuth } from '@/lib/auth'
import { useNav } from '@/lib/nav'
import type { Route } from '@/lib/types'
import { WAREHOUSE_DESTINATIONS } from '@/lib/warehouse-modules'
import { canAccessRoute, canAccessWarehouseModule } from '@/lib/route-guard'

interface WarehouseShellProps {
  activeRoute: Route
  children: ReactNode
  stickyHeader?: ReactNode
}

/** Shared desktop frame for Warehouse Operations pages. */
export function WarehouseShell({ activeRoute, children, stickyHeader }: WarehouseShellProps) {
  const { currentUser } = useAuth()
  const { navigate } = useNav()

  const destinations = WAREHOUSE_DESTINATIONS.filter((destination) => {
    if (destination.id === 'overview' || destination.id === 'damage') {
      return canAccessRoute(currentUser, destination.route)
    }
    return canAccessWarehouseModule(currentUser, destination.id as Parameters<typeof canAccessWarehouseModule>[1])
  })
  const activeDestinationId = destinations.find((destination) => destination.route === activeRoute)?.id ?? activeRoute

  return (
    <ExecutiveShell
      activeId={activeDestinationId}
      onSelect={(id) => {
        const destination = destinations.find((item) => item.id === id)
        if (destination) navigate(destination.route)
      }}
      destinations={destinations}
      identityRoleLabel="WAREHOUSE OPERATIONS"
      stickyHeader={stickyHeader}
    >
      {children}
    </ExecutiveShell>
  )
}
