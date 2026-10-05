import { useEffect, useState } from 'react'
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
  const [mobileOpen, setMobileOpen] = useState(false)
  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false) }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])
  const handleSelect = (id: AdminDestinationId) => { onSelect(id); setMobileOpen(false) }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background md:fixed md:inset-0 md:flex-row">
      <div className="hidden md:flex"><AdminRail activeId={activeId} onSelect={onSelect} /></div>
      {mobileOpen && <button type="button" aria-label="Close admin navigation" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden" />}
      {mobileOpen && <div className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[86%] md:hidden"><AdminRail activeId={activeId} onSelect={handleSelect} collapsed={false} onToggleCollapse={() => setMobileOpen(false)} /></div>}

      <div className="flex min-w-0 flex-1 flex-col md:min-h-0">
        <AdminTopBar onMenu={() => setMobileOpen(true)} />

        {/* Only this region scrolls. */}
        <div className="flex-1 overflow-x-hidden pb-[env(safe-area-inset-bottom,0px)] md:min-h-0 md:overflow-y-auto">
          {stickyHeader && (
            <div className="sticky top-0 z-20 border-b border-border bg-background px-5 py-6 sm:px-8">
              {stickyHeader}
            </div>
          )}
          <div className="px-5 py-6 sm:px-8">{children}</div>
        </div>
      </div>
    </div>
  )
}
