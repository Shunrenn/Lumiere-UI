import { useRef } from 'react'
import { ArrowLeft, Printer } from 'lucide-react'
import { ConsoleLayout } from '@/components/ConsoleLayout'
import { EventPipelinePanel } from '@/components/EventPipelinePanel'
import { EmptyState } from '@/components/EmptyState'
import { useNav } from '@/lib/nav'
import { useAuth } from '@/lib/auth'
import { usePortal } from '@/lib/store'
import { usePlanner } from '@/lib/planner'

export function EventDetailPage() {
  const { navigate, intent } = useNav()
  const { adminName } = useAuth()
  const { events } = usePortal()
  const { eventMaterials, hasDesignForEvent, addDesign } = usePlanner()

  // Resolve target event from nav intent or URL parameter, or first canonical event
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const targetId = intent?.payload?.id || searchParams?.get('id') || searchParams?.get('eventId')
  const event = events.find((e) => e.id === targetId || e.refId === targetId) ?? events[0]

  const redirectedRef = useRef(false)

  if (!event) {
    return (
      <ConsoleLayout>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate('canvas')}
            className="inline-flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to Dashboard
          </button>
        </div>
        <div className="mt-8">
          <EmptyState
            title="No Active Event Found"
            message="No registered events exist in the portfolio. Please initialize an event in the Event Registry."
          />
        </div>
      </ConsoleLayout>
    )
  }

  const materials = eventMaterials[event.id] ?? []
  const hasCanvas = hasDesignForEvent(event.id)

  /* When no canvas exists for this event, opening Material Requirements drops the
     planner straight into a fresh Design Canvas to start drafting. */
  function handleOpenCanvas() {
    if (materials.length > 0 || hasCanvas) {
      navigate('canvas-workspace')
      return
    }
    if (redirectedRef.current) return
    redirectedRef.current = true
    addDesign(`${event.title} — Material Layout`, event.id)
    navigate('canvas-workspace')
  }

  function handleTabChange(tab: 'overview' | 'materials' | 'documents' | 'team') {
    if (tab !== 'materials') return
    if (materials.length > 0 || hasCanvas) return
    if (redirectedRef.current) return
    redirectedRef.current = true
    addDesign(`${event.title} — Material Layout`, event.id)
    navigate('canvas-workspace')
  }

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print()
    }
  }

  return (
    <ConsoleLayout>
      <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => navigate('canvas')}
            className="inline-flex items-center gap-1.5 text-[0.6rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to Dashboard
          </button>
          <h1 className="mt-2 font-serif text-3xl font-medium leading-tight text-foreground text-balance lg:text-4xl">
            {event.title}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-card-foreground transition hover:bg-muted"
          >
            <Printer className="size-3.5" />
            Print Record
          </button>
        </div>
      </div>

      <div className="mt-6">
        <EventPipelinePanel
          event={event}
          adminName={adminName}
          onOpenCanvas={handleOpenCanvas}
          onTabChange={handleTabChange}
        />
      </div>
    </ConsoleLayout>
  )
}
