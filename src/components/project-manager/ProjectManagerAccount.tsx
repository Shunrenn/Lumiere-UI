import { useEffect, useMemo, useState } from 'react'
import { LayoutDashboard, Folder, CalendarDays, FileText, Menu, PanelLeftClose, PanelLeftOpen, X, Package, Search, Sparkles, Plus, LogOut } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { useThemeMode, type ThemeMode } from '@/lib/theme'
import { fetchProjectManagerEvents } from '@/lib/project-manager-events'
import { useProjectPitches } from '@/lib/project-pitch'
import type { PortalEvent } from '@/lib/types'
import { realProject, realPitch, sampleProjects, samplePitches, type PMProject, type PMAsset, type PMPitch, workspaceTabs } from '@/lib/project-manager-sample-data'
import { RegisterEventDrawer } from '@/components/RegisterEventDrawer'
import { ProjectManagerModal, PMFields } from './ProjectManagerModal'
import { ProjectManagerInitializeModal } from './ProjectManagerInitializeModal'
import { ProjectManagerCreatePitchModal } from './ProjectManagerCreatePitchModal'
import { ProjectManagerWorkspace, projectFields, planningFields } from './ProjectManagerWorkspace'
import { useProjectManagerWorkspace } from './useProjectManagerWorkspace'
import './project-manager.css'

const destinations = [
  { id: 'dashboard', label: 'Project Manager Dashboard', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', icon: Folder },
  { id: 'event-workspace', label: 'Event Workspace', icon: CalendarDays },
  { id: 'pitches-briefs', label: 'Pitches & Briefs', icon: FileText },
] as const
type Destination = typeof destinations[number]['id']
type Modal = { kind: 'project'; id: string } | { kind: 'asset'; asset: PMAsset } | { kind: 'pitch'; id: string } | { kind: 'planning' } | { kind: 'activate' } | { kind: 'initialize' } | { kind: 'profile' } | { kind: 'create-pitch'; brief: boolean } | null
const getDestination = (): Destination => {
  const hash = window.location.hash.slice(1)
  return destinations.find(destination => destination.id === hash)?.id || 'dashboard'
}
const progressLabel = (project: PMProject) => project.progress === undefined ? 'Not available' : `${project.progress}%`

function ProjectDirectory({ projects, onView, workspace = false }: { projects: PMProject[]; onView: (project: PMProject) => void; workspace?: boolean }) {
  const action = workspace ? 'Open Workspace' : 'View'
  if (workspace) return projects.length ? <div className="pm-event-grid">{projects.map(project => <article className="pm-panel pm-event-card" key={project.id}>
    <div className="pm-card-meta"><span className="pm-eyebrow">{project.refId}{project.sample && ' · SAMPLE'}</span><span className="pm-status">{project.status}</span></div>
    <h3>{project.title}</h3><p className="pm-muted">{project.client || 'Client not available'}</p>
    <div className="pm-card-details"><p><CalendarDays size={13} />Target Date: <strong>{project.date || 'Not available'}</strong></p><p>Venue: {project.venue || 'Not available'}</p><p>Assigned PM: <strong>{project.manager}</strong></p></div>
    <div className="pm-card-footer"><span>Progress: {progressLabel(project)}</span><button onClick={() => onView(project)} aria-label={`${action} ${project.title}`}>Open Workspace →</button></div>
  </article>)}</div> : <p className="pm-empty">No projects match this view.</p>
  return projects.length ? <>
    <div className="pm-table-wrap"><table><thead><tr>{['Reference ID', 'Project / Event', 'Client', 'Event Date', 'Status', 'Progress', 'Action'].map(label => <th key={label}>{label}</th>)}</tr></thead><tbody>{projects.map(project => <tr key={project.id} onClick={() => onView(project)}>
      <td>{project.refId}</td><td><strong>{project.title}</strong>{project.sample && <small className="pm-sample">SAMPLE</small>}</td><td>{project.client || 'Not available'}</td><td>{project.date || 'Not available'}</td><td><span className="pm-status">{project.status}</span></td><td>{progressLabel(project)}</td><td><button onClick={event => { event.stopPropagation(); onView(project) }} aria-label={`${action} ${project.title}`}>{action}</button></td>
    </tr>)}</tbody></table></div>
    <div className="pm-project-cards">{projects.map(project => <article className="pm-panel" key={project.id}><p className="pm-eyebrow">{project.refId} {project.sample && '· SAMPLE'}</p><h3>{project.title}</h3><p>{project.client} · {project.date || 'Date not set'}</p><p>{project.status} · Progress: {progressLabel(project)}</p><button onClick={() => onView(project)} aria-label={`${action} ${project.title}`}>{action}</button></article>)}</div>
  </> : <p className="pm-empty">No projects match this view.</p>
}

export function ProjectManagerAccount() {
  const { currentUser, adminName, setConfirmLogout } = useAuth()
  const { mode, setMode } = useThemeMode()
  const { pitches, loading: pitchesLoading, error: pitchesError, refreshPitches, addPitch } = useProjectPitches()
  const [destination, setDestination] = useState<Destination>(getDestination)
  const [collapsed, setCollapsed] = useState(false), [mobileOpen, setMobileOpen] = useState(false)
  const [preview, setPreview] = useState(false), [samples, setSamples] = useState(sampleProjects)
  const [previewPitches, setPreviewPitches] = useState(samplePitches)
  const [globalSearch, setGlobalSearch] = useState(''), [eventStatus, setEventStatus] = useState('All')
  const [briefsTab, setBriefsTab] = useState<'Client Pitches' | 'Concept Briefs'>('Client Pitches')
  const [liveEvents, setLiveEvents] = useState<PortalEvent[]>([]), [eventsLoading, setEventsLoading] = useState(true), [eventsError, setEventsError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null), [workspaceTab, setWorkspaceTab] = useState<typeof workspaceTabs[number]>('Overview')
  const [modal, setModal] = useState<Modal>(null), [pitchTab, setPitchTab] = useState<'Pitch' | 'Concept Brief'>('Pitch')
  const [search, setSearch] = useState(''), [eventSearch, setEventSearch] = useState(''), [pitchSearch, setPitchSearch] = useState('')
  const [status, setStatus] = useState(''), [date, setDate] = useState(''), [client, setClient] = useState(''), [sort, setSort] = useState('Newest'), [pitchStatus, setPitchStatus] = useState('')
  const [message, setMessage] = useState(''), [liveDrawer, setLiveDrawer] = useState<{ mode: 'create' | 'edit'; event?: PortalEvent } | null>(null)

  useEffect(() => {
    let disposed = false, pending = false
    const load = async () => {
      if (pending) return
      pending = true
      try { const records = await fetchProjectManagerEvents(); if (!disposed) { setLiveEvents(records); setEventsError('') } }
      catch { if (!disposed) setEventsError('Could not verify current projects. Any previously loaded records may be out of date.') }
      finally { pending = false; if (!disposed) setEventsLoading(false) }
    }
    void load()
    const interval = setInterval(load, 30000)
    window.addEventListener('focus', load)
    return () => { disposed = true; clearInterval(interval); window.removeEventListener('focus', load) }
  }, [])
  useEffect(() => {
    const interval = setInterval(refreshPitches, 30000)
    window.addEventListener('focus', refreshPitches)
    return () => { clearInterval(interval); window.removeEventListener('focus', refreshPitches) }
  }, [refreshPitches])
  useEffect(() => {
    const onHistory = () => { setDestination(getDestination()); setSelectedId(null); setModal(null); setLiveDrawer(null) }
    window.addEventListener('popstate', onHistory); window.addEventListener('hashchange', onHistory)
    return () => { window.removeEventListener('popstate', onHistory); window.removeEventListener('hashchange', onHistory) }
  }, [])

  const projects = useMemo(() => preview ? samples : liveEvents.filter(event => event.projectManagerId ? event.projectManagerId === currentUser?.id : !!event.projectManagerName && event.projectManagerName === currentUser?.name).map(realProject), [preview, samples, liveEvents, currentUser])
  const pitchRecords = preview ? previewPitches : pitches.filter(pitch => pitch.assignedPmEmail ? pitch.assignedPmEmail === currentUser?.email : pitch.assignedPmName === currentUser?.name).map(realPitch)
  const selected = projects.find(project => project.id === selectedId) || null
  const workspace = useProjectManagerWorkspace(destination === 'event-workspace' ? selected : null)
  const detailProject = modal?.kind === 'project' ? projects.find(project => project.id === modal.id) : null
  const detailPitch = modal?.kind === 'pitch' ? pitchRecords.find(pitch => pitch.id === modal.id) : null
  const attention = projects.filter(project => project.blockers.length)

  const changeDestination = (next: Destination) => {
    setDestination(next); setMobileOpen(false); setSelectedId(null); setModal(null); setLiveDrawer(null); setMessage('')
    window.history.pushState(null, '', `${window.location.pathname}#${next}`)
  }
  const openWorkspace = (project: PMProject) => { changeDestination('event-workspace'); setSelectedId(project.id); setWorkspaceTab('Overview') }
  const switchMode = () => { setPreview(previous => !previous); setSelectedId(null); setModal(null); setLiveDrawer(null); setMessage(''); setStatus(''); setClient(''); setDate(''); setSearch(''); setEventSearch(''); setPitchSearch(''); setPitchStatus(''); setEventStatus('All'); setGlobalSearch('') }
  const visibleProjects = projects.filter(project => `${project.refId} ${project.title} ${project.client}`.toLowerCase().includes(search.toLowerCase()) && (!status || project.status === status) && (!date || project.date === date) && (!client || project.client === client)).sort((a, b) => {
    if (sort === 'Project Name') return a.title.localeCompare(b.title)
    if (sort === 'Event Date') return a.date.localeCompare(b.date)
    const order = (a.created || a.refId).localeCompare(b.created || b.refId) || a.refId.localeCompare(b.refId)
    return sort === 'Oldest' ? order : -order
  })
  const showPitch = (pitch: PMPitch) => { setPitchTab('Pitch'); setModal({ kind: 'pitch', id: pitch.id }) }
  const heading = destinations.find(item => item.id === destination)!.label
  const descriptions: Record<Destination, string> = { dashboard: 'Overview of your projects, priorities, and upcoming work.', projects: 'View and manage projects assigned to your workflow.', 'event-workspace': 'Search and open events assigned to your project workflow.', 'pitches-briefs': 'Manage client proposals and planning briefs.' }
  const matchesEventStatus = (project: PMProject, filter: string) => filter === 'All' || (filter === 'Attention' ? project.blockers.length > 0 : filter === 'Planning' ? /progress|not started/i.test(project.planning || '') && !['Completed', 'Settled'].includes(project.status) : filter === 'Completed' ? ['Completed', 'Settled'].includes(project.status) : project.status === filter)
  const query = globalSearch.trim().toLowerCase()
  const searchProjects = query ? projects.filter(project => `${project.title} ${project.client} ${project.venue} ${project.refId}`.toLowerCase().includes(query)) : []
  const searchPitches = query ? pitchRecords.filter(pitch => `${pitch.title} ${pitch.client} ${pitch.venue}`.toLowerCase().includes(query)) : []
  const openConverted = (pitch: PMPitch) => { const project = projects.find(project => project.id === pitch.eventId); if (project) openWorkspace(project); else setMessage('The linked event is not in your assigned project records. Check again after the next update.') }

  return <div className={`pm-account pm-shell ${collapsed ? 'pm-collapsed' : ''}`}>
    {mobileOpen && <button className="pm-mobile-shade" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
    <aside className={`pm-rail ${mobileOpen ? 'pm-mobile-open' : ''}`}>
      <div className="pm-brand"><span>L</span>{!collapsed && <strong>LUMIÈRE</strong>}<button className="pm-mobile-close" aria-label="Close navigation" onClick={() => setMobileOpen(false)}><X size={20} /></button></div>
      <nav aria-label="Project Manager navigation">{destinations.map(({ id, label, icon: Icon }) => <button key={id} aria-current={destination === id ? 'page' : undefined} aria-label={label} title={label} onClick={() => changeDestination(id)}><Icon size={20} /><span>{label}</span></button>)}</nav>
      <div className="pm-rail-footer"><button aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed(previous => !previous)}>{collapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}<span>Collapse sidebar</span></button><button aria-label="Sign out" title="Sign out" onClick={() => setConfirmLogout(true)}><span>Sign out</span>{collapsed && '↪'}</button></div>
    </aside>
    <main className="pm-main">
      <header className="pm-topbar"><button className="pm-mobile-menu" aria-label="Open navigation" onClick={() => setMobileOpen(true)}><Menu size={18} /></button>
        <div className="pm-command-brand"><span className="pm-logo">L</span><div><strong>LUMIÈRE</strong><span className="pm-command-badge">PROJECT COMMAND</span><small>Strategic Event Lifecycle, Client Pitching & Scheduling</small></div></div>
        <div className="pm-global-search"><Search size={15} /><input aria-label="Search Project Manager" placeholder="Search events, clients, venues, pitches..." value={globalSearch} onChange={event => setGlobalSearch(event.target.value)} />
          {query && <div className="pm-search-results"><button aria-label="Close search" onClick={() => setGlobalSearch('')}>Close search</button>{searchProjects.map(project => <button key={project.id} onClick={() => { setModal({ kind: 'project', id: project.id }); setGlobalSearch('') }}><span>Project · {project.refId}</span><strong>{project.title}</strong></button>)}{searchPitches.map(pitch => <button key={pitch.id} onClick={() => { showPitch(pitch); setGlobalSearch('') }}><span>Pitch · {pitch.client}</span><strong>{pitch.title}</strong></button>)}{!searchProjects.length && !searchPitches.length && <p>No matching projects or pitches.</p>}</div>}
        </div>
        <div className="pm-topbar-actions"><button onClick={() => setModal({ kind: 'create-pitch', brief: false })}><Sparkles size={14} />New Client Pitch</button><button className="pm-primary" onClick={() => setModal({ kind: 'initialize' })}><Plus size={14} />Register Event</button><select aria-label="Theme" value={mode} onChange={event => setMode(event.target.value as ThemeMode)}><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select><button className="pm-profile" aria-label="Profile" onClick={() => setModal({ kind: 'profile' })}><span>{(adminName || 'PM').split(' ').map(word => word[0]).slice(0, 2).join('')}</span><div><strong>{adminName}</strong><small>{currentUser?.email}</small></div></button><button aria-label="Logout" onClick={() => setConfirmLogout(true)}><LogOut size={16} /></button></div>
      </header>
      <div className="pm-mode-line"><span>{preview ? 'SAMPLE ACCOUNT — frontend only. Changes reset on reload. No sample records are saved to the backend.' : 'Assigned projects · checkpoint-based updates every 30 seconds and on window focus.'}</span><button onClick={switchMode}>{preview ? 'Show live projects' : 'Preview sample account'}</button></div>
      {message && <p className="pm-notice" role="status">{message}</p>}
      {!preview && eventsError && <p className="pm-warning" role="alert">{eventsError}</p>}
      {!(destination === 'event-workspace' && selected) && <div className="pm-page-heading"><div><p className="pm-eyebrow">Project Manager Workspace</p><h1>{heading}</h1><p className="pm-muted">{descriptions[destination]}</p></div></div>}
      {!preview && eventsLoading && <p role="status">Loading assigned projects…</p>}
      {destination === 'dashboard' && <>
        <div className="pm-stats">{[['Assigned Projects', projects.length], ['In Production', projects.filter(project => project.status === 'In Production').length], ['Client Pitches', pitchRecords.length], ['Completed Events', projects.filter(project => ['Completed', 'Settled'].includes(project.status)).length]].map(([label, value]) => <article key={label} className="pm-panel"><p className="pm-eyebrow">{label}</p><strong>{value}</strong></article>)}</div>
        <section className="pm-panel pm-attention"><p className="pm-eyebrow">Action Required</p><h2>Needs Attention</h2><p className="pm-muted">Resolve current project blockers without leaving your workspace.</p>{attention.length ? attention.map(project => <button className="pm-attention-row" key={project.id} onClick={() => openWorkspace(project)}><small className="pm-eyebrow">{project.sample ? 'SAMPLE · ' : ''}Project Review</small><strong>{project.title}</strong><span>{project.blockers.join(' · ')}</span><span>Resolve in Event Workspace →</span></button>) : <p className="pm-muted">No attention items reported in the available project records.</p>}{!preview && <p className="pm-muted">Open a workspace to review planning, assets, staffing, and production checkpoints.</p>}</section>
        <section className="pm-panel"><h2>Recent Projects</h2><ProjectDirectory projects={[...projects].sort((a, b) => (b.created || b.refId).localeCompare(a.created || a.refId) || b.refId.localeCompare(a.refId)).slice(0, 3)} onView={project => setModal({ kind: 'project', id: project.id })} /></section>
      </>}
      {destination === 'projects' && <>
        <div className="pm-filters"><input aria-label="Search projects" placeholder="Search projects..." value={search} onChange={event => setSearch(event.target.value)} /><select aria-label="Status" value={status} onChange={event => setStatus(event.target.value)}><option value="">All statuses</option>{[...new Set(projects.map(project => project.status))].map(value => <option key={value}>{value}</option>)}</select><label>Date<input aria-label="Date" type="date" value={date} onChange={event => setDate(event.target.value)} /></label><select aria-label="Client" value={client} onChange={event => setClient(event.target.value)}><option value="">All clients</option>{[...new Set(projects.map(project => project.client))].map(value => <option key={value}>{value}</option>)}</select><select aria-label="Sort projects" value={sort} onChange={event => setSort(event.target.value)}>{['Newest', 'Oldest', 'Event Date', 'Project Name'].map(value => <option key={value}>{value}</option>)}</select><button onClick={() => { setSearch(''); setStatus(''); setDate(''); setClient(''); setSort('Newest') }}>Clear filters</button></div>
        {!preview && <p className="pm-muted">Newest and Oldest use the reference ID when created dates are unavailable.</p>}
        <ProjectDirectory projects={visibleProjects} onView={project => setModal({ kind: 'project', id: project.id })} />
      </>}
      {destination === 'event-workspace' && (workspace.project ? <>
        {workspace.loading && <p role="status">Loading workflow checkpoints…</p>}
        {workspace.errors.length > 0 && <p className="pm-warning" role="alert">{workspace.errors.join(' · ')}. Missing data is not a readiness confirmation.</p>}
        <ProjectManagerWorkspace project={workspace.project} tab={workspaceTab} onTab={setWorkspaceTab} onAll={() => setSelectedId(null)} onPlanning={() => setModal({ kind: 'planning' })} onAsset={asset => setModal({ kind: 'asset', asset })} onActivate={() => setModal({ kind: 'activate' })} onEdit={() => { const event = liveEvents.find(event => event.id === selectedId); if (event) setLiveDrawer({ mode: 'edit', event }) }} />
      </> : <><div className="pm-directory-heading"><h2>Assigned Event Projects</h2><div className="pm-workspace-tabs" role="tablist" aria-label="Event filters">{['All', 'In Production', 'Planning', 'Attention', 'Completed'].filter(filter => filter === 'All' || projects.some(project => matchesEventStatus(project, filter))).map(filter => <button key={filter} role="tab" aria-selected={eventStatus === filter} onClick={() => setEventStatus(filter)}>{filter} ({projects.filter(project => matchesEventStatus(project, filter)).length})</button>)}</div></div><div className="pm-filters"><input aria-label="Search events" placeholder="Search events..." value={eventSearch} onChange={event => setEventSearch(event.target.value)} /></div><ProjectDirectory workspace projects={projects.filter(project => `${project.refId} ${project.title} ${project.client} ${project.venue}`.toLowerCase().includes(eventSearch.toLowerCase()) && matchesEventStatus(project, eventStatus))} onView={openWorkspace} /></>)}
      {destination === 'pitches-briefs' && <>
        <div className="pm-workspace-tabs" role="tablist" aria-label="Pitches and briefs">{(['Client Pitches', 'Concept Briefs'] as const).map(tab => <button key={tab} role="tab" aria-selected={briefsTab === tab} onClick={() => setBriefsTab(tab)}>{tab}</button>)}</div>
        <div className="pm-directory-heading"><div><h2>{briefsTab}</h2><p className="pm-muted">Early-stage proposals before event registration</p></div><button onClick={() => setModal({ kind: 'create-pitch', brief: true })}>+ Create New Brief</button></div>
        <div className="pm-stats pm-pitch-stats">{['Draft', 'For Presentation', 'Presented', 'For Revision', 'Approved', 'Converted to Event'].map(stage => <article className="pm-panel" key={stage}><p className="pm-eyebrow">{stage === 'Converted to Event' ? 'Converted' : stage}</p><strong>{pitchRecords.filter(pitch => pitch.status === stage).length}</strong></article>)}</div>
        <div className="pm-filters"><input aria-label="Search pitches" placeholder="Search pitches and briefs..." value={pitchSearch} onChange={event => setPitchSearch(event.target.value)} /><select aria-label="Pitch status" value={pitchStatus} onChange={event => setPitchStatus(event.target.value)}><option value="">All statuses</option>{[...new Set(pitchRecords.map(pitch => pitch.status))].map(value => <option key={value}>{value}</option>)}</select><button onClick={() => { setPitchSearch(''); setPitchStatus('') }}>Clear filters</button></div>
        {!preview && pitchesLoading && <p role="status">Loading pitches…</p>}{!preview && pitchesError && <p className="pm-warning" role="alert">Pitches unavailable. Previously loaded pitches may be out of date.</p>}
        <div className="pm-pitch-grid">{pitchRecords.filter(pitch => `${pitch.title} ${pitch.client}`.toLowerCase().includes(pitchSearch.toLowerCase()) && (!pitchStatus || pitch.status === pitchStatus)).map(pitch => <article className="pm-panel" key={pitch.id}><div className="pm-card-meta"><p className="pm-eyebrow">{pitch.sample ? 'SAMPLE · ' : ''}{pitch.status}</p><small>Target: {pitch.date || 'Not available'}</small></div><h2>{pitch.client}</h2><p className="pm-pitch-name">{pitch.title}</p><p className="pm-muted">{briefsTab === 'Concept Briefs' ? pitch.concept || 'Concept not available' : pitch.theme || pitch.concept || 'Theme not available'}</p><div className="pm-card-details"><p>Contact: {pitch.contact || 'Not available'} · Guests: {pitch.guests ?? 'Not available'}</p><p>Budget: {pitch.budget || 'Not available'}</p><p>Venue: {pitch.venue || 'Not available'}</p></div><div className="pm-card-footer"><span>Manage Brief & Proposal</span><button onClick={() => pitch.eventId ? openConverted(pitch) : (showPitch(pitch), setPitchTab(briefsTab === 'Concept Briefs' ? 'Concept Brief' : 'Pitch'))} aria-label={pitch.eventId ? `Open Event ${pitch.title}` : `Review ${pitch.title}`}>{pitch.eventId ? 'Open Event →' : 'Review ›'}</button></div></article>)}</div>
        {!pitchRecords.some(pitch => `${pitch.title} ${pitch.client}`.toLowerCase().includes(pitchSearch.toLowerCase()) && (!pitchStatus || pitch.status === pitchStatus)) && <p className="pm-empty">No pitches match this view.</p>}
      </>}
    </main>

    {modal?.kind === 'profile' && <ProjectManagerModal title="Profile" onClose={() => setModal(null)}><PMFields fields={ [['Name', adminName], ['Email', currentUser?.email], ['Role', currentUser?.role]] } /><div className="pm-actions"><button onClick={() => setModal(null)}>Close</button><button onClick={() => { setModal(null); setConfirmLogout(true) }}>Logout</button></div></ProjectManagerModal>}
    {modal?.kind === 'create-pitch' && <ProjectManagerCreatePitchModal sample={preview} brief={modal.brief} onClose={() => setModal(null)} onSample={pitch => { setPreviewPitches(previous => [pitch, ...previous]); changeDestination('pitches-briefs'); setMessage('Sample pitch saved — Draft.') }} onSave={async draft => { await addPitch(draft); await refreshPitches(); changeDestination('pitches-briefs'); setMessage('Pitch draft saved.'); }} />}

    {modal?.kind === 'project' && detailProject && <ProjectManagerModal title="Project Details" onClose={() => setModal(null)}>{detailProject.sample && <p className="pm-notice">SAMPLE</p>}<PMFields fields={projectFields(detailProject)} /><div className="pm-actions"><button onClick={() => setModal(null)}>Close</button><button className="pm-primary" onClick={() => openWorkspace(detailProject)}>Open Event Workspace</button></div></ProjectManagerModal>}
    {modal?.kind === 'initialize' && <ProjectManagerInitializeModal projects={samples} manager={adminName || 'Sample Project Manager'} onClose={() => setModal(null)} onWorkspace={project => { setPreview(true); openWorkspace(project) }} onLive={() => { setModal(null); setLiveDrawer({ mode: 'create' }) }} onCreate={project => { setSamples(previous => [project, ...previous]); setPreview(true); openWorkspace(project); setMessage('Sample event created — Initialized.') }} />}
    {modal?.kind === 'activate' && selected?.sample && <ProjectManagerModal title="Activate Event" onClose={() => setModal(null)}><p>You are about to activate: <strong>{selected.title}</strong></p><p>This will make the event available to downstream planning workflows in this sample preview.</p><p className="pm-notice">SAMPLE — this simulates activation locally.</p><div className="pm-actions"><button onClick={() => setModal(null)}>Cancel</button><button className="pm-primary" onClick={() => { setSamples(previous => previous.map(project => project.id === selected.id ? { ...project, status: 'Active', activated: new Date().toISOString(), activatedBy: adminName, blockers: project.blockers.filter(blocker => blocker !== 'Project not activated') } : project)); setModal(null); setMessage('Sample event activated — Active. Planning can now start in the preview.') }}>Activate Event</button></div></ProjectManagerModal>}
    {modal?.kind === 'planning' && workspace.project && <ProjectManagerModal title="Planning Summary" onClose={() => setModal(null)}>{workspace.project.sample && <p className="pm-notice">SAMPLE</p>}<PMFields fields={[...planningFields(workspace.project), ['Assets Planned', workspace.project.assets?.length], ['Warnings', workspace.project.blockers.join(' · ') || 'None reported in available data']]} /><button onClick={() => setModal(null)}>Close</button></ProjectManagerModal>}
    {modal?.kind === 'asset' && <ProjectManagerModal title="Asset Details" onClose={() => setModal(null)}>{selected?.sample && <p className="pm-notice">SAMPLE</p>}{modal.asset.image ? <img className="pm-asset-image" src={modal.asset.image} alt={modal.asset.name} /> : <div className="pm-image-placeholder"><Package size={36} /><span>Image not available</span></div>}<PMFields fields={ [['Name', modal.asset.name], ['Classification', modal.asset.classification], ['Required Qty', modal.asset.required], ['Available Qty', modal.asset.available], ['Status', modal.asset.status]] } /><button onClick={() => setModal(null)}>Close</button></ProjectManagerModal>}
    {modal?.kind === 'pitch' && detailPitch && <ProjectManagerModal title="Pitch / Brief Details" onClose={() => setModal(null)}>{detailPitch.sample && <p className="pm-notice">SAMPLE</p>}<div className="pm-workspace-tabs" role="tablist" aria-label="Pitch detail sections">{(['Pitch', 'Concept Brief'] as const).map(tab => <button key={tab} role="tab" aria-selected={pitchTab === tab} onClick={() => setPitchTab(tab)}>{tab}</button>)}</div><section role="tabpanel" aria-label={pitchTab}><h3>{pitchTab}</h3><PMFields fields={pitchTab === 'Pitch' ? [['Client', detailPitch.client], ['Concept', detailPitch.concept], ['Theme', detailPitch.theme], ['Objectives', detailPitch.objectives], ['Audience', detailPitch.audience], ['Venue', detailPitch.venue], ['Budget', detailPitch.budget], ['Notes', detailPitch.notes], ['Status', detailPitch.status]] : [['Client', detailPitch.client], ['Contact', detailPitch.contact], ['Target Date', detailPitch.date], ['Guests', detailPitch.guests], ['Concept', detailPitch.concept], ['Venue', detailPitch.venue], ['Budget', detailPitch.budget], ['Notes', detailPitch.notes]]} /></section><button onClick={() => setModal(null)}>Close</button></ProjectManagerModal>}
    {liveDrawer && <RegisterEventDrawer open mode={liveDrawer.mode} event={liveDrawer.event} onClose={() => { setLiveDrawer(null); setMessage('Live registration closed. Saved changes appear at the next checkpoint refresh.') }} />}
  </div>
}



