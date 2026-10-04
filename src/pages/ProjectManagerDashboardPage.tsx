import { useState, useMemo } from 'react'
import { usePortal } from '@/lib/store'
import { useAuth } from '@/lib/auth'
import { useNav } from '@/lib/nav'
import { useProjectPitches, type ProjectPitch } from '@/lib/project-pitch'
import { ProjectManagerHeader } from '@/components/project-manager/ProjectManagerHeader'
import { ProjectManagerSidebar, ProjectManagerMobileNav, projectManagerSectionMeta, type ProjectManagerSection } from '@/components/project-manager/ProjectManagerSidebar'
import { ProjectManagerMasterCalendar } from '@/components/project-manager/ProjectManagerMasterCalendar'
import { ProjectManagerEventsList } from '@/components/project-manager/ProjectManagerEventsList'
import { ProjectManagerActionRequired } from '@/components/project-manager/ProjectManagerActionRequired'
import { ProjectManagerPitchingSummary } from '@/components/project-manager/ProjectManagerPitchingSummary'
import { ProjectManagerPitchModal } from '@/components/project-manager/ProjectManagerPitchModal'
import { ProjectManagerEventWorkspace } from '@/components/project-manager/ProjectManagerEventWorkspace'
import { ProjectManagerLiteEventDetail } from '@/components/project-manager/ProjectManagerLiteEventDetail'
import { RegisterEventDrawer } from '@/components/RegisterEventDrawer'
import { OfflineBanner } from '@/components/OfflineBanner'
import type { PortalEvent } from '@/lib/types'
import { CheckCircle2, Clock, Sparkles, Layers, AlertCircle, AlertTriangle, Info, RefreshCw } from 'lucide-react'

export function ProjectManagerDashboardPage() {
  const { events, staff, procurement, damageExceptions, refreshEvents } = usePortal()
  const { adminName, adminEmail, isProjectManagerLite } = useAuth()
  const { navigate } = useNav()
  const {
    pitches,
    loading: pitchesLoading,
    error: pitchesError,
    refreshPitches,
    addPitch,
    updatePitch,
    addFeedback,
    convertToEvent,
  } = useProjectPitches()

  // Selected event for single-event workspace
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [activeSection, setActiveSection] = useState<ProjectManagerSection>('dashboard')
  const [pitchesView, setPitchesView] = useState<'pitches' | 'briefs'>('pitches')

  // Filters & search
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>(null)

  // Pitch modal
  const [pitchModalOpen, setPitchModalOpen] = useState(false)
  const [editingPitch, setEditingPitch] = useState<ProjectPitch | null>(null)

  // Conversion 409 Conflict Dialog State
  const [conversionConflict, setConversionConflict] = useState<{
    pitch: ProjectPitch
    message: string
    conflictingEvents: any[]
  } | null>(null)
  const [isConverting, setIsConverting] = useState(false)

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
  const handleConvertToEvent = async (pitch: ProjectPitch, allowConflictOverride = false) => {
    setIsConverting(true)
    try {
      const result = await convertToEvent(pitch.id, allowConflictOverride)
      if (result.conflict) {
        setConversionConflict({
          pitch,
          message: result.message || 'Venue scheduling conflict detected.',
          conflictingEvents: result.conflictingEvents || [],
        })
        return
      }

      if (!result.success) {
        alert(result.message || 'Pitch conversion failed.')
        return
      }

      setConversionConflict(null)
      const freshEvents = await refreshEvents()
      if (result.eventId) {
        const found = freshEvents.find((e) => e.id === result.eventId)
        if (found) {
          setSelectedEventId(found.id)
        } else {
          setSelectedEventId(result.eventId)
        }
      }
    } catch (err: any) {
      alert(`Pitch conversion failed: ${err?.message || 'Unknown error'}`)
    } finally {
      setIsConverting(false)
    }
  }

  // If inside an event, render the dedicated Event Workspace
  if (activeEvent) {
    const workspaceContent = isProjectManagerLite ? (
      <ProjectManagerLiteEventDetail
        event={activeEvent}
        staff={staff}
        procurement={procurement}
        onBack={() => setSelectedEventId(null)}
        onEditEvent={() => {
          setActiveRegisterEvent(activeEvent)
          setRegisterDrawerMode('edit')
          setRegisterDrawerOpen(true)
        }}
      />
    ) : (
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
    )

    return (
      <div className="flex min-h-screen bg-background text-foreground">
        <ProjectManagerSidebar activeSection="event-workspace" onSelect={(section) => { if (section === 'event-workspace') setSelectedEventId(null); else { setSelectedEventId(null); setActiveSection(section) } }} />
        <div className="min-w-0 flex-1 pb-20">
          <OfflineBanner />
          <ProjectManagerHeader searchQuery={searchQuery} onSearchChange={setSearchQuery} onNewPitch={() => { setEditingPitch(null); setPitchModalOpen(true) }} onRegisterEvent={() => { setActiveRegisterEvent(null); setRegisterDrawerMode('create'); setRegisterDrawerOpen(true) }} />
          <ProjectManagerMobileNav activeSection="event-workspace" onSelect={(section) => { if (section === 'event-workspace') setSelectedEventId(null); else { setSelectedEventId(null); setActiveSection(section) } }} />
          <main className="mx-auto flex max-w-[94rem] flex-col gap-5 px-4 py-6 sm:px-8">{workspaceContent}</main>
          <RegisterEventDrawer open={registerDrawerOpen} onClose={() => { setRegisterDrawerOpen(false); setActiveRegisterEvent(null) }} event={activeRegisterEvent} mode={registerDrawerMode} />
        </div>
      </div>
    )

  }

  // Otherwise, render the PM Command Center Dashboard
  const sectionMeta = projectManagerSectionMeta[activeSection]

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <ProjectManagerSidebar activeSection={activeSection} onSelect={setActiveSection} />
      <div className="min-w-0 flex-1 pb-20">
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

        <ProjectManagerMobileNav activeSection={activeSection} onSelect={setActiveSection} />
        <main className="max-w-[94rem] mx-auto px-4 sm:px-8 py-6 flex flex-col gap-6">
          <header className="flex flex-col gap-1 border-b border-border/60 pb-5">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-primary">Project Manager Workspace</p>
            <h2 className="font-serif text-2xl font-semibold text-foreground">{sectionMeta.title}</h2>
            <p className="text-sm text-muted-foreground">{sectionMeta.description}</p>
          </header>

        {activeSection === 'dashboard' && <>
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

          {isProjectManagerLite ? (
            <div className="rounded-2xl border border-border/80 bg-card/70 p-4 shadow-sm backdrop-blur-sm">
              <span className="text-[0.65rem] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Clock className="size-3.5" />
                Reserved / Initialized
              </span>
              <div className="text-2xl font-bold text-foreground mt-1">
                {events.filter((e) => e.status === 'Reserved' || e.status === 'Initialized').length}
              </div>
              <p className="text-[0.68rem] text-muted-foreground mt-0.5">
                Events pending production & asset allocations
              </p>
            </div>
          ) : (
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
          )}

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
        <section className="rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm">
          <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-primary">Action Required</p><h3 className="mt-1 font-serif text-xl font-semibold text-foreground">Needs Attention</h3><p className="mt-1 text-sm text-muted-foreground">Resolve current project blockers without leaving your workspace.</p></div></div>
          <ProjectManagerActionRequired events={events} staff={staff} procurement={procurement} damageExceptions={damageExceptions} pitches={isProjectManagerLite ? [] : pitches} onOpenEvent={(id) => { setActiveSection('event-workspace'); setSelectedEventId(id) }} onOpenPitch={(pitchId) => { const p = pitches.find((item) => item.id === pitchId); if (p) { setEditingPitch(p); setPitchModalOpen(true) } }} />
        </section>
        </>}

        {activeSection === 'event-workspace' && <section className="flex flex-col gap-5">
          <div className="rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm"><p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-primary">Project Manager Workspace</p><h3 className="mt-1 font-serif text-2xl font-semibold text-foreground">Event Workspace</h3><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Access and manage events assigned to your project workflow.</p></div>
          <ProjectManagerEventsList events={events} staff={staff} procurement={procurement} assignedPmName={adminName || 'Project Manager'} searchQuery={searchQuery} onOpenEvent={(id) => { setSelectedEventId(id) }} />
        </section>}

        {activeSection === 'projects' && <>
        {/* Master Calendar */}
        <ProjectManagerMasterCalendar
          events={events}
          selectedDate={selectedCalendarDate}
          onSelectDate={setSelectedCalendarDate}
          onOpenEvent={(id) => { setActiveSection('event-workspace'); setSelectedEventId(id) }}
        />

        {/* My / Assigned Events Section */}
        <ProjectManagerEventsList
          events={displayedEvents}
          staff={staff}
          procurement={procurement}
          assignedPmName={adminName || 'Project Manager'}
          searchQuery={searchQuery}
          onOpenEvent={(id) => { setActiveSection('event-workspace'); setSelectedEventId(id) }}
        />

        </>}

        {activeSection === 'pitches' && !isProjectManagerLite && (
          <>
            <div className="inline-flex w-fit rounded-lg border border-border bg-card p-1"><button type="button" onClick={() => setPitchesView('pitches')} className={`rounded-md px-3 py-2 text-xs font-semibold ${pitchesView === 'pitches' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Client Pitches</button><button type="button" onClick={() => setPitchesView('briefs')} className={`rounded-md px-3 py-2 text-xs font-semibold ${pitchesView === 'briefs' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>Concept Briefs</button></div>
            {pitchesView === 'pitches' && pitchesError && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-4 text-xs font-semibold text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="size-4 shrink-0" />
                  <span>Could not load pitches: {pitchesError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => refreshPitches()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-rose-700"
                >
                  <RefreshCw className="size-3.5" />
                  Retry
                </button>
              </div>
            )}

            {pitchesView === 'pitches' && <ProjectManagerPitchingSummary
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
            />}
          </>
        )}

        {activeSection === 'pitches' && pitchesView === 'briefs' && (
          <section className="flex flex-col gap-4">
            {pitches.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center">
                <h3 className="font-serif text-lg font-semibold text-foreground">No concept briefs found</h3>
                <p className="mt-1 text-sm text-muted-foreground">Existing project concepts and planning briefs will appear here when available.</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {pitches.map((pitch) => (
                  <article key={pitch.id} className="rounded-2xl border border-border/80 bg-card/70 p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-primary">Concept brief</p>
                        <h3 className="mt-1 font-serif text-lg font-semibold text-foreground">{pitch.proposal.conceptTitle || 'Untitled concept'}</h3>
                        <p className="mt-1 text-xs text-muted-foreground">{pitch.brief.clientName || 'Client not specified'}</p>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-1 text-[0.65rem] font-semibold text-muted-foreground">{pitch.status}</span>
                    </div>
                    {pitch.proposal.conceptSummary && <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{pitch.proposal.conceptSummary}</p>}
                    <button type="button" onClick={() => { setEditingPitch(pitch); setPitchModalOpen(true) }} className="mt-4 text-xs font-semibold text-primary hover:underline">View brief</button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
      </div>

      {/* Client Pitch Modal */}
      {!isProjectManagerLite && (
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
      )}

      {/* 409 Venue Scheduling Conflict Review & Override Modal */}
      {!isProjectManagerLite && conversionConflict && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-rose-500/30 bg-card p-6 shadow-2xl space-y-4 animate-in fade-in-0 zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-rose-500/10 p-2.5 text-rose-500 shrink-0">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-card-foreground">
                  Venue Schedule Conflict Warning
                </h3>
                <p className="text-[0.7rem] text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wider mt-0.5">
                  HTTP 409 Conflict — Proposed Pitch Overlaps with Existing Event
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed">
              {conversionConflict.message}
            </p>

            <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2 max-h-56 overflow-y-auto">
              <p className="text-[0.65rem] font-bold uppercase tracking-wider text-muted-foreground">
                Conflicting Active Event(s):
              </p>
              {conversionConflict.conflictingEvents.length > 0 ? (
                conversionConflict.conflictingEvents.map((ce: any, idx: number) => (
                  <div key={ce.id || idx} className="rounded border border-border/80 bg-background p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between font-semibold text-foreground">
                      <span>{ce.name || ce.title || 'Conflicting Event'}</span>
                      <span className="text-[0.6rem] font-mono uppercase bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 px-1.5 py-0.5 rounded">
                        {ce.status || 'Active'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[0.7rem] text-muted-foreground">
                      <div><span className="font-medium text-foreground">Venue:</span> {ce.venue || ce.eventVenue || 'Venue TBD'}</div>
                      <div><span className="font-medium text-foreground">Date:</span> {ce.dateOfEvent ? ce.dateOfEvent.split('T')[0] : 'N/A'}</div>
                      <div className="col-span-2">
                        <span className="font-medium text-foreground">Schedule Window:</span> {ce.ingressDate ? ce.ingressDate.split('T')[0] : 'N/A'} to {ce.returnDate ? ce.returnDate.split('T')[0] : 'N/A'}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground italic">Overlapping venue schedule detected on server.</p>
              )}
            </div>

            <div className="rounded border border-amber-500/20 bg-amber-500/10 p-2 text-[0.7rem] text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <Info className="size-4 shrink-0" />
              <span>
                Proceeding will force conversion with <code className="font-mono text-[0.65rem]">allowConflictOverride: true</code>.
              </span>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isConverting}
                onClick={() => setConversionConflict(null)}
                className="rounded-md border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isConverting}
                onClick={() => handleConvertToEvent(conversionConflict.pitch, true)}
                className="rounded-md bg-rose-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-rose-700 transition disabled:opacity-50"
              >
                {isConverting ? 'Overriding...' : 'Proceed with Override'}
              </button>
            </div>
          </div>
        </div>
      )}

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
