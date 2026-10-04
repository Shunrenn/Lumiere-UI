import { useState } from 'react'

import type { ReactNode } from 'react'
import { ExecutiveRail } from '@/components/executive/ExecutiveRail'
import { ExecutiveTopBar } from '@/components/executive/ExecutiveTopBar'
import type { ExecutiveDestinationId, SharedRailDestination } from '@/lib/executive-destinations'

interface ExecutiveShellProps<T extends string = ExecutiveDestinationId> {
  activeId: T
  onSelect: (id: T) => void
  /** Optional role-specific navigation while retaining the shared rail structure. */
  destinations?: readonly SharedRailDestination[]
  identityRoleLabel?: string
  /* Sticky region pinned to the top of the scroll area (title, stat cards, filters). */
  stickyHeader?: ReactNode
  children: ReactNode
}

// Fixed console frame for the Executive experience — mirrors AdminShell
// exactly: no labeled sidebar, no wordmark, no bottom profile card.
//
// Hard layout rule: the icon rail and top bar live OUTSIDE the scroll
// container, so they never move. Inside the content column only the body
// scrolls; the optional sticky header stays pinned while the body slides
// beneath it.
export function ExecutiveShell<T extends string = ExecutiveDestinationId>({
  activeId,
  onSelect,
  destinations,
  identityRoleLabel,
  stickyHeader,
  children,
}: ExecutiveShellProps<T>) {
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSelect = (id: T) => {
    onSelect(id)
    setMobileOpen(false)
  }

  return (
    <div className="fixed inset-0 flex bg-background">
      <div className="hidden md:flex">
        <ExecutiveRail
          activeId={activeId}
          onSelect={onSelect}
          destinations={destinations}
          identityRoleLabel={identityRoleLabel}
        />
      </div>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close Executive navigation"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className="fixed inset-y-0 left-0 z-50 hidden w-72 max-w-[85vw] shadow-2xl data-[open=true]:flex md:hidden" data-open={mobileOpen}>
        <ExecutiveRail
          activeId={activeId}
          onSelect={handleSelect}
          destinations={destinations}
          identityRoleLabel={identityRoleLabel}
          collapsed={false}
          onToggleCollapse={() => setMobileOpen(false)}
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <ExecutiveTopBar onMenu={() => setMobileOpen(true)} />

        {/* Only this region scrolls. */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {stickyHeader && (
            <div className="sticky top-0 z-20 border-b border-border bg-background/95 px-5 py-6 backdrop-blur sm:px-8">
              {stickyHeader}
            </div>
          )}
          <div className="px-5 py-6 sm:px-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
