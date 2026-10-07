import { PMFields } from './ProjectManagerModal'
import { workspaceTabs, type PMProject, type PMAsset } from '@/lib/project-manager-sample-data'

export function projectFields(project: PMProject): [string, string | number | undefined][] {
  return [['Reference ID', project.refId], ['Event Name', project.title], ['Client', project.client], ['Venue', project.venue], ['Event Date', project.date], ['Status', project.status], ['Progress', project.progress === undefined ? undefined : `${project.progress}%`], ['Project Manager', project.manager]]
}
export function planningFields(project: PMProject): [string, string | number | undefined][] {
  return [['Planning Status', project.planning], ['Assigned Event Planner', project.planner], ['Staging Canvas Status', project.canvas], ['Approval Status', project.approval], ['Last Updated', project.updated]]
}
export function assetSummary(project: PMProject) {
  if (!project.assets) return 'Not available'
  if (!project.assets.length) return 'Not started'
  return project.assets.some(asset => /issue|pending|blocked|conflict|rejected/i.test(asset.status)) ? 'Needs review' : 'See reservation status'
}
export function manningSummary(project: PMProject) {
  if (project.requiredStaff === undefined) return project.assignedStaff === undefined ? 'Not available' : `${project.assignedStaff} assigned; requirements unavailable`
  if (!project.requiredStaff) return 'Requirements not set'
  return (project.assignedStaff ?? 0) < project.requiredStaff ? 'Open slots' : 'Assigned'
}
export function ProjectManagerWorkspace({ project, tab, onTab, onAll, onPlanning, onAsset, onActivate, onEdit }: {
  project: PMProject; tab: typeof workspaceTabs[number]; onTab: (tab: typeof workspaceTabs[number]) => void; onAll: () => void
  onPlanning: () => void; onAsset: (asset: PMAsset) => void; onActivate: () => void; onEdit: () => void
}) {
  const assets = project.assets
  const assetsStatus = assetSummary(project), manningStatus = manningSummary(project)
  const summaries: [string, string | number | undefined][] = [['Event Record', project.status], ['Planning', project.planning], ['Assets', assetsStatus], ['Manning', manningStatus], ['Production', project.production]]
  return <>
    <button onClick={onAll}>← All Events</button>
    <div className="pm-workspace-heading"><div><p className="pm-eyebrow">{project.refId} {project.sample && '· SAMPLE'}</p><h1>{project.title}</h1><p className="pm-muted">{project.client} · {project.venue || 'Venue not set'}</p></div>
      {project.status === 'Initialized' && project.sample && <button className="pm-primary" onClick={onActivate}>Activate Event</button>}
    </div>
    {project.status === 'Initialized' && !project.sample && <p className="pm-notice">Live activation is not verified by the current frontend contract. Use sample mode to preview activation.</p>}
    <div className="pm-workspace-tabs" role="tablist" aria-label="Event workspace sections">{workspaceTabs.map(section => <button key={section} role="tab" aria-selected={tab === section} onClick={() => onTab(section)}>{section}</button>)}</div>
    <section className="pm-panel" role="tabpanel" aria-label={tab}><h2>{tab}</h2>
      {tab === 'Overview' && <><PMFields fields={projectFields(project)} /><h3>Workflow Status</h3><PMFields fields={summaries} /></>}
      {tab === 'Event Details' && <><PMFields fields={ [['Event Title', project.title], ['Client', project.client], ['Venue', project.venue], ['Event Date', project.date], ['Start Time', project.start], ['End Time', project.end], ['Event Type', project.type], ['Guest Count', project.guests], ['Project Notes', project.notes]] } />{!project.sample && <button onClick={onEdit}>Edit Event Details</button>}</>}
      {tab === 'Registry' && <PMFields fields={ [['Reference ID', project.refId], ['Created Date', project.created], ['Activation Date', project.activated], ['Current Status', project.status], ['Created By', project.createdBy], ['Activated By', project.activatedBy]] } />}
      {tab === 'Timeline' && <ol className="pm-timeline">{[['Event Created', project.created], ['Event Activated', project.activated], ['Planning Started', project.planningDate], ['Asset Planning', project.assetDate], ['Production', project.productionDate], ['Event Day', project.date]].sort((a, b) => (a[1] || '9999').localeCompare(b[1] || '9999')).map(([label, date]) => <li key={label}><strong>{label}</strong><span>{date || 'Not available'}</span></li>)}</ol>}
      {tab === 'Planning' && <><PMFields fields={planningFields(project)} /><button onClick={onPlanning}>View Planning Summary</button></>}
      {tab === 'Assets' && <>
        <PMFields fields={ [['Assets Planned', assets?.length], ['Assets Confirmed', assets?.filter(asset => /^(confirmed|reserved|committed)$/i.test(asset.status)).length], ['Assets with Issues', assets?.filter(asset => /issue|blocked|conflict|rejected/i.test(asset.status)).length], ['Assets Pending', assets?.filter(asset => /pending|planned/i.test(asset.status)).length]] } />
        {assets?.length ? <div className="pm-asset-list">{assets.map(asset => <button className="pm-asset-row" key={asset.id} onClick={() => onAsset(asset)}><strong>{asset.name}</strong><span>Required Qty: {asset.required ?? 'Not available'}</span><span>Available: {asset.available ?? 'Not available'}</span><span>{asset.status}</span><span>View Asset</span></button>)}</div> : <p className="pm-muted">{assets ? 'No asset reservations yet.' : 'Asset data is not available.'}</p>}
      </>}
      {tab === 'Manning' && <><PMFields fields={ [['Required Staff', project.requiredStaff], ['Assigned', project.assignedStaff], ['Open Slots', project.requiredStaff === undefined || project.assignedStaff === undefined ? undefined : Math.max(0, project.requiredStaff - project.assignedStaff)], ['Status', manningStatus]] } /><p>{project.teams?.join(' · ') || 'Team summary not available'}</p></>}
      {tab === 'Production' && <PMFields fields={ [['Venue Ready', project.sample ? (project.venue ? 'Venue recorded; readiness pending' : 'Missing venue') : undefined], ['Assets Ready', assetsStatus], ['Manning Ready', manningStatus], ['Technical Setup', project.technical], ['Production Status', project.production]] } />}
      {tab === 'Oversight' && <><PMFields fields={ [['Project Health', project.blockers.length ? 'Needs attention' : project.sample ? 'No sample blockers' : 'Review available checkpoints'], ['Timeline Status', project.production === 'Delayed' || project.blockers.some(blocker => blocker.includes('delayed')) ? 'Delayed' : project.sample ? 'On schedule' : undefined], ['Planning Status', project.planning], ['Asset Status', assetsStatus], ['Manning Status', manningStatus], ['Production Status', project.production]] } /><h3>Blockers</h3>{project.blockers.length ? <ul>{project.blockers.map(blocker => <li key={blocker}>{blocker}</li>)}</ul> : <p className="pm-muted">No blockers reported in available data.{!project.sample && ' Unavailable checkpoints still need review.'}</p>}</>}
    </section>
  </>
}


