import type { PortalEvent } from './types'
import type { ProjectPitch } from './project-pitch'

export interface PMAsset {
  id: string; name: string; classification?: string; required?: number; available?: number; status: string; image?: string
}
export interface PMProject {
  id: string; refId: string; title: string; client: string; venue: string; date: string; status: string
  manager: string; sample: boolean; progress?: number; start?: string; end?: string; type?: string; guests?: number; notes?: string
  created?: string; activated?: string; createdBy?: string; activatedBy?: string
  planning?: string; planner?: string; canvas?: string; approval?: string; updated?: string
  assets?: PMAsset[]; requiredStaff?: number; assignedStaff?: number; teams?: string[]; production?: string
  technical?: string; planningDate?: string; assetDate?: string; productionDate?: string; blockers: string[]
}
export interface PMPitch {
  id: string; title: string; client: string; status: string; concept?: string; theme?: string; objectives?: string
  audience?: string; venue?: string; budget?: string; notes?: string; sample: boolean; date?: string; guests?: number; contact?: string; eventId?: string
}
export const workspaceTabs = ['Overview', 'Event Details', 'Registry', 'Timeline', 'Planning', 'Assets', 'Manning', 'Production', 'Oversight'] as const

// Preview fixtures only. No store, API, database, audit or persistence imports.
export function sampleProjects(): PMProject[] {
  return [
    ['draft', 'PRT-2026-0196', 'Garden reception', 'Isla & Co.', '', '2026-11-02', 'Draft', 0],
    ['initialized', 'PRT-2026-0198', 'Aurora launch', 'Aurora', 'Grand Ballroom', '2026-11-12', 'Initialized', 10],
    ['active', 'PRT-2026-0199', 'Studio showcase', 'Studio North', 'Gallery Hall', '2026-11-18', 'Active', 65],
    ['attention', 'PRT-2026-0200', 'Founders gala', 'Meridian', 'Convention Center', '2026-11-25', 'Needs Attention', 40],
    ['completed', 'PRT-2026-0190', 'Harvest celebration', 'Greenfield', 'Garden Pavilion', '2026-09-28', 'Completed', 100],
  ].map(([id, refId, title, client, venue, date, status, progress]) => {
    const underway = ['active', 'attention', 'completed'].includes(String(id))
    const issue = id === 'attention'
    const done = id === 'completed'
    return {
      id: `sample-${id}`, refId: String(refId), title: String(title), client: String(client), venue: String(venue), date: String(date), status: String(status), progress: Number(progress),
      sample: true, manager: 'Sample Project Manager', start: '18:00', end: '22:00', type: 'Corporate event', guests: 120, notes: 'Frontend sample record.',
      created: '2026-09-20', createdBy: 'Sample Project Manager', activated: underway ? '2026-09-24' : undefined, activatedBy: underway ? 'Sample Project Manager' : undefined,
      planning: done ? 'Completed' : underway ? 'In progress' : 'Not started', planner: underway ? 'Sample Event Planner' : undefined,
      canvas: done ? 'Approved' : underway ? 'Submitted' : 'Not started', approval: done ? 'Approved' : underway ? 'Pending review' : undefined, updated: '2026-10-07',
      planningDate: underway ? '2026-09-25' : undefined, assetDate: underway ? '2026-09-26' : undefined, productionDate: underway ? '2026-09-27' : undefined,
      assets: underway ? [
        { id: 'chairs', name: 'Banquet chairs', classification: 'Furniture', required: 120, available: issue ? 100 : 120, status: issue ? 'Issue' : 'Confirmed' },
        { id: 'lights', name: 'Stage lights', classification: 'Lighting', required: 8, available: 8, status: issue ? 'Pending' : 'Confirmed' },
      ] : [],
      requiredStaff: underway ? 12 : 0, assignedStaff: underway ? (issue ? 8 : 12) : 0, teams: underway ? ['Setup team', 'Technical team'] : [],
      production: done ? 'Completed' : issue ? 'Delayed' : underway ? 'In progress' : 'Not started', technical: done ? 'Ready' : 'Pending',
      blockers: issue ? ['20 chairs unavailable', 'Stage lights pending confirmation', '4 staff slots still open', 'Production delayed'] : id === 'draft' ? ['Missing venue'] : id === 'initialized' ? ['Project not activated', 'Planning not started'] : [],
    }
  })
}
export function realProject(event: PortalEvent): PMProject {
  return { id: event.id, refId: event.refId, title: event.title, client: event.client, venue: event.venue, date: event.targetDate, status: event.status,
    manager: event.projectManagerName || 'Not available', sample: false, start: event.eventStart, end: event.eventEnd, notes: event.moodPlan,
    blockers: [...(!event.venue ? ['Missing venue'] : []), ...(!event.targetDate ? ['Missing date'] : []), ...(event.status === 'Initialized' ? ['Project not activated'] : [])] }
}
export function realPitch(pitch: ProjectPitch): PMPitch {
  return { id: pitch.id, title: pitch.proposal.conceptTitle || `${pitch.brief.clientName} Pitch`, client: pitch.brief.clientName, status: pitch.status,
    concept: pitch.proposal.conceptSummary, objectives: pitch.proposal.scopeOfWork, venue: pitch.brief.proposedVenue,
    budget: pitch.proposal.estimatedBudget ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(pitch.proposal.estimatedBudget) : pitch.brief.budgetRange,
    notes: [pitch.brief.notes, pitch.proposal.notes].filter(Boolean).join('\n'), date: pitch.brief.proposedDate, contact: pitch.brief.contactPerson, guests: pitch.brief.estimatedGuests, eventId: pitch.convertedEventId, sample: false }
}
export const samplePitches: PMPitch[] = [
  { id: 'sample-pitch-draft', title: 'Summer garden party', client: 'Isla & Co.', status: 'Draft', concept: 'An outdoor celebration', theme: 'Botanical', objectives: 'Celebrate the team', audience: 'Employees and families', venue: 'Garden Pavilion', budget: '₱180,000', notes: 'Sample brief for discussion.', sample: true },
  { id: 'sample-pitch-submitted', title: 'Aurora launch', client: 'Aurora', status: 'Presented', concept: 'An immersive product launch', theme: 'Light and color', objectives: 'Introduce the new collection', audience: 'Press and clients', venue: 'Grand Ballroom', budget: '₱350,000', notes: 'Sample proposal awaiting review.', sample: true },
  { id: 'sample-pitch-approved', title: 'Founders gala', client: 'Meridian', status: 'Approved', concept: 'A formal anniversary gala', theme: 'Modern heritage', objectives: 'Celebrate company milestones', audience: 'Partners and founders', venue: 'Convention Center', budget: '₱500,000', notes: 'Sample approved concept.', sample: true },
  { id: 'sample-pitch-converted', title: 'Studio showcase', client: 'Studio North', status: 'Converted to Event', concept: 'A gallery showcase', venue: 'Gallery Hall', date: '2026-11-18', guests: 120, contact: 'Sample contact', budget: '₱280,000', eventId: 'sample-active', sample: true },
]
