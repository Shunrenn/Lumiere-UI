import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { UserGrowthSummaryModal } from '@/components/admin/UserGrowthSummaryModal'
import { usePortal } from '@/lib/store'
import { useNav } from '@/lib/nav'

// Shared across every entry point that can open the User Growth Summary
// modal (System Dashboard's Trend Analytics card, Workforce Management's
// toolbar button, etc.) so the modal and its "highlight in Workforce"
// behavior are defined once instead of duplicated per page.
interface GrowthSummaryContextValue {
  openGrowthSummary: () => void
}

const GrowthSummaryContext = createContext<GrowthSummaryContextValue | null>(null)

export function AdminGrowthSummaryProvider({ children }: { children: ReactNode }) {
  const { staff } = usePortal()
  const { navigate } = useNav()
  const [open, setOpen] = useState(false)

  const openGrowthSummary = useCallback(() => setOpen(true), [])

  const value = useMemo(() => ({ openGrowthSummary }), [openGrowthSummary])

  return (
    <GrowthSummaryContext.Provider value={value}>
      {children}
      <UserGrowthSummaryModal
        open={open}
        staff={staff}
        onClose={() => setOpen(false)}
        onViewInWorkforce={(staffId) => {
          setOpen(false)
          // Scoped, feature-specific URL param — only this highlight target is
          // synced to the URL; the rest of the app keeps its in-memory useNav
          // routing untouched. Lets refresh/back/forward restore the highlight.
          const url = new URL(window.location.href)
          url.searchParams.set('highlight', staffId)
          window.history.pushState({ ...window.history.state, highlight: staffId }, '', url)
          navigate('workforce')
        }}
      />
    </GrowthSummaryContext.Provider>
  )
}

export function useGrowthSummary() {
  const ctx = useContext(GrowthSummaryContext)
  if (!ctx) throw new Error('useGrowthSummary must be used within an AdminGrowthSummaryProvider')
  return ctx
}
