import type { ReactNode } from 'react'
import { ExecutiveRail } from '@/components/executive/ExecutiveRail'
import { ExecutiveTopBar } from '@/components/executive/ExecutiveTopBar'
import type { ExecutiveDestinationId } from '@/lib/executive-destinations'

interface ExecutiveShellProps {
  activeId: ExecutiveDestinationId
  onSelect: (id: ExecutiveDestinationId) => void
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
export function ExecutiveShell({ activeId, onSelect, stickyHeader, children }: ExecutiveShellProps) {
  return (
    <div className="fixed inset-0 flex bg-background">
      <ExecutiveRail activeId={activeId} onSelect={onSelect} />

      <div className="flex min-w-0 flex-1 flex-col">
        <ExecutiveTopBar />

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
