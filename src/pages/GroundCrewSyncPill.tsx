import type { MyManningAssignmentDto } from '@/features/manning/api/manningApi'

interface GroundCrewSyncPillProps {
  assignments: MyManningAssignmentDto[]
  isCachedData?: boolean
}

export function GroundCrewSyncPill({ assignments, isCachedData = false }: GroundCrewSyncPillProps) {
  const syncLabel = !navigator.onLine
    ? 'Offline - changes are saved on this phone'
    : isCachedData
      ? 'Offline - changes are saved on this phone'
      : assignments.some((assignment) => assignment.pendingSync)
        ? `${assignments.filter((assignment) => assignment.pendingSync).length} waiting to sync`
        : 'Online'

  return (
    <span className="inline-flex rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
      {syncLabel}
    </span>
  )
}

export default GroundCrewSyncPill
