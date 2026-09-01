import { useRef, useState } from 'react'
import { ArrowLeft, FileDown, PencilLine, CheckCircle2 } from 'lucide-react'
import { ConsoleLayout } from '@/components/ConsoleLayout'
import { EventPipelinePanel } from '@/components/EventPipelinePanel'
import { useNav } from '@/lib/nav'
import { useAuth } from '@/lib/auth'
import { usePlanner } from '@/lib/planner'
import { cn } from '@/lib/utils'

export function EventDetailPage() {
  const { navigate } = useNav()
  const { adminName } = useAuth()
  const { events, selectedEventId, eventMaterials, hasDesignForEvent, addDesign } = usePlanner()
  const event = events.find((e) => e.id === selectedEventId) ?? events[0]

  const materials = eventMaterials[event.id] ?? []
  const hasCanvas = hasDesignForEvent(event.id)

  const [editing, setEditing] = useState(false)
  const [exported, setExported] = useState(false)
  const redirectedRef = useRef(false)

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

  const handleExport = () => {
    setExported(true)
    window.setTimeout(() => setExported(false), 2600)
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
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] text-card-foreground transition hover:bg-muted"
          >
            <FileDown className="size-3.5" />
            Export PDF
          </button>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-pressed={editing}
            className={cn(
              'inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-[0.6rem] font-bold uppercase tracking-[0.12em] transition',
              editing
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : 'bg-primary text-primary-foreground hover:opacity-90',
            )}
          >
            <PencilLine className="size-3.5" />
            {editing ? 'Save Record' : 'Edit Record'}
          </button>
        </div>
      </div>

      {exported && (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800">
          <CheckCircle2 className="size-4" />
          Record export queued — {event.recordId}.pdf is being prepared for download.
        </div>
      )}

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
