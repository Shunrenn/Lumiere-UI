import { useState, useMemo } from 'react'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { useNav } from '@/lib/nav'
import { useProjectPitches, type ProjectPitch } from '@/lib/project-pitch'
import { ProjectManagerHeader } from '@/components/project-manager/ProjectManagerHeader'
import { ProjectManagerMasterCalendar } from '@/components/project-manager/ProjectManagerMasterCalendar'
import { ProjectManagerEventsList } from '@/components/project-manager/ProjectManagerEventsList'
import { ProjectManagerActionRequired } from '@/components/project-manager/ProjectManagerActionRequired'
import { ProjectManagerPitchingSummary } from '@/components/project-manager/ProjectManagerPitchingSummary'
import { ProjectManagerPitchModal } from '@/components/project-manager/ProjectManagerPitchModal'
import { ProjectManagerEventWorkspace } from '@/components/project-manager/ProjectManagerEventWorkspace'
import { RegisterEventDrawer } from '@/components/RegisterEventDrawer'
import { OfflineBanner } from '@/components/OfflineBanner'
import type { PortalEvent } from '@/lib/types'
import { fetchEventsApi } from '@/lib/eventsApi'
import { CheckCircle2, Clock, Sparkles, Layers, AlertCircle } from 'lucide-react'

export function ProjectManagerDashboardPage() {
  const { events, staff, procurement, damageExceptions } = usePortal()
  const { adminName, adminEmail } = useAuth()
  const { navigate } = useNav()
  const { pitches, loading: pitchesLoading, error: pitchesError, addPitch, updatePitch, addFeedback, convertToEvent } = useProjectPitches()

  // Selected event for single-event workspace
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)

  // Pitch modal
  const [pitchModalOpen, setPitchModalOpen] = useState(false)
  const [editingPitch, setEditingPitch] = useState<ProjectPitch | null>(null)

  // Register event drawer
  const [registerDrawerOpen, setRegisterDrawerOpen] = useState(false)
  const [registerDrawerMode, setRegisterDrawerMode] = useState<'create' | 'view' | 'edit'>('create')
  const [activeRegisterEvent, setActiveRegisterEvent] = useState<PortalEvent | null>(null)

  // Active selected event object
  const activeEvent = useMemo(
    () => events.find((e) => e.id === selectedEventId) || null,
    [events, selectedEventId],
  )

  // Filter events if date selected on calendar
  const displayedEvents = useMemo(() => {
    if (!selectedCalendarDate) return events
    return events.filter((e) => {
      const date = e.targetDate || e.installationStart
      return date && date.split('T')[0] === selectedCalendarDate
    })
  }, [events, selectedCalendarDate])

  // Server-side conversion from pitch to event via POST /api/pitches/{id}/convert-to-event
  const handleConvertToEvent = async (pitch: ProjectPitch) => {
    try {
      const result = await convertToEvent(pitch.id)
      await fetchEventsApi()
      if (result && result.eventId) {
        setSelectedEventId(result.eventId)
      }
    } catch (err: any) {
      alert(`Pitch conversion failed: ${err?.message || 'Unknown error'}`)
    }
  }

  // If inside an event, render the dedicated Event Workspace
  if (activeEvent) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <OfflineBanner />
        <ProjectManagerEventWorkspace
          event={activeEvent}
          staff={staff}
          procurement={procurement}
          damageExceptions={damageExceptions}
          pitches={pitches}
          assignedPmName={adminName || 'Project Manager'}
          onBack={() => setSelectedEventId(null)}
          onEditRecord={(ev) => {
            setActiveRegisterEvent(ev)
            setRegisterDrawerMode('edit')
            setRegisterDrawerOpen(true)
          }}
          onOpenCanvas={() => navigate('canvas')}
        />

        <RegisterEventDrawer
          open={registerDrawerOpen}
          onClose={() => {
            setRegisterDrawerOpen(false)
            setActiveRegisterEvent(null)
          }}
          event={activeRegisterEvent}
          mode={registerDrawerMode}
        />
      </div>
    )
  }

  // Otherwise, render the PM Command Center Dashboard
  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <OfflineBanner />

      {/* Top Header & Search Bar */}
      <ProjectManagerHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onNewPitch={() => {
          setEditingPitch(null)
          setPitchModalOpen(true)
        }}
        onRegisterEvent={() => {
          setActiveRegisterEvent(null)
          setRegisterDrawerMode('create')
          setRegisterDrawerOpen(true)
        }}
      />

      <main className="max-w-[94rem] mx-auto px-6 sm:px-8 py-8 flex flex-col gap-8">
        {/* Top KPI Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-border/80 bg-card/70 p-4 shadow-sm backdrop-blur-sm">
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Layers className="size-3.5 text-primary" />
              Active Projects
            </span>
            <div className="text-2xl font-bold text-foreground mt-1">
              {events.filter((e) => e.status !== 'Completed' && e.status !== 'Cancelled').length}
            </div>
            <p className="text-[0.68rem] text-muted-foreground mt-0.5">
              Total assigned client accounts in active lifecycle
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card/70 p-4 shadow-sm backdrop-blur-sm">
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
              <Clock className="size-3.5" />
              In Production
            </span>
            <div className="text-2xl font-bold text-foreground mt-1">
              {events.filter((e) => e.status === 'In Production').length}
            </div>
            <p className="text-[0.68rem] text-muted-foreground mt-0.5">
              Fabrication, rigging & prep execution stage
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card/70 p-4 shadow-sm backdrop-blur-sm">
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Sparkles className="size-3.5" />
              Client Pitches
            </span>
            <div className="text-2xl font-bold text-foreground mt-1">
              {pitchesLoading ? '...' : pitches.length}
            </div>
            <p className="text-[0.68rem] text-muted-foreground mt-0.5">
              Proposals in draft, presentation, or revision
            </p>
          </div>

          <div className="rounded-2xl border border-border/80 bg-card/70 p-4 shadow-sm backdrop-blur-sm">
            <span className="text-[0.65rem] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="size-3.5" />
              Completed Events
            </span>
            <div className="text-2xl font-bold text-foreground mt-1">
              {events.filter((e) => e.status === 'Completed' || e.status === 'Settled').length}
            </div>
            <p className="text-[0.68rem] text-muted-foreground mt-0.5">
              Successfully executed & delivered engagements
            </p>
          </div>
        </div>

        {/* Action Required Callouts */}
        <ProjectManagerActionRequired
          events={events}
          staff={staff}
          procurement={procurement}
          damageExceptions={damageExceptions}
          pitches={pitches}
          onOpenEvent={(id) => setSelectedEventId(id)}
          onOpenPitch={(pitchId) => {
            const p = pitches.find((item) => item.id === pitchId)
            if (p) {
              setEditingPitch(p)
              setPitchModalOpen(true)
            }
          }}
        />

        {/* Master Calendar */}
        <ProjectManagerMasterCalendar
          events={events}
          selectedDate={selectedCalendarDate}
          onSelectDate={setSelectedCalendarDate}
          onOpenEvent={(id) => setSelectedEventId(id)}
        />

        {/* My / Assigned Events Section */}
        <ProjectManagerEventsList
          events={displayedEvents}
          staff={staff}
          procurement={procurement}
          assignedPmName={adminName || 'Project Manager'}
          searchQuery={searchQuery}
          onOpenEvent={(id) => setSelectedEventId(id)}
        />

        {/* Client Pitching Summary Section */}
        {pitchesError && (
          <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center gap-2">
            <AlertCircle className="size-4" />
            <span>Could not load pitches: {pitchesError}</span>
          </div>
        )}

        <ProjectManagerPitchingSummary
          pitches={pitches}
          onNewPitch={() => {
            setEditingPitch(null)
            setPitchModalOpen(true)
          }}
          onOpenPitch={(pitch) => {
            setEditingPitch(pitch)
            setPitchModalOpen(true)
          }}
          onConvertToEvent={handleConvertToEvent}
        />
      </main>

      {/* Client Pitch Modal */}
      <ProjectManagerPitchModal
        open={pitchModalOpen}
        onClose={() => {
          setPitchModalOpen(false)
          setEditingPitch(null)
        }}
        pitch={editingPitch}
        onSave={async (saved) => {
          if (editingPitch) {
            await updatePitch(saved.id, saved)
          } else {
            await addPitch(saved)
          }
        }}
        onAddFeedback={async (pitchId, notes, author, newStatus) => {
          await addFeedback(pitchId, notes, author, newStatus)
        }}
        onConvertToEvent={async (p) => {
          setPitchModalOpen(false)
          await handleConvertToEvent(p)
        }}
        currentUserEmail={adminEmail || 'projectmanager@lumiere.com'}
        currentUserName={adminName || 'Project Manager'}
      />

      {/* Official Event Registry Drawer */}
      <RegisterEventDrawer
        open={registerDrawerOpen}
        onClose={() => {
          setRegisterDrawerOpen(false)
          setActiveRegisterEvent(null)
        }}
        event={activeRegisterEvent}
        mode={registerDrawerMode}
      />
    </div>
  )
}

export default ProjectManagerDashboardPage
