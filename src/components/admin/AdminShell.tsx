import type { ReactNode } from 'react'
import { AdminRail } from '@/components/admin/AdminRail'
import { AdminTopBar } from '@/components/admin/AdminTopBar'
import type { AdminDestinationId } from '@/lib/admin-destinations'

interface AdminShellProps {
  activeId: AdminDestinationId
  onSelect: (id: AdminDestinationId) => void
  /* Sticky region pinned to the top of the scroll area (title and subtitle only). */
  stickyHeader?: ReactNode
  children: ReactNode
}

// Fixed console frame for the Admin experience.
//
// Hard layout rule: the icon rail and top bar live OUTSIDE the scroll
// container, so they never move. Inside the content column only the body
// scrolls; the optional sticky header stays pinned while the body slides
// beneath it. Tables rendered in `children` pin their own column-header row
// independently, via a bounded, self-scrolling wrapper (see WorkforceTable /
// AdminSecurityAuditPage) rather than reading this header's height — nesting
// sticky inside this page scroll would require the table's own horizontal
// scroll wrapper to stay `overflow-visible` on the y axis, which the CSS spec
// doesn't allow once `overflow-x` is set to anything but `visible`.
export function AdminShell({ activeId, onSelect, stickyHeader, children }: AdminShellProps) {
  return (
    <div className="fixed inset-0 flex bg-background">
      <AdminRail activeId={activeId} onSelect={onSelect} />

      <div className="flex min-w-0 flex-1 flex-col">
        <AdminTopBar />

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
