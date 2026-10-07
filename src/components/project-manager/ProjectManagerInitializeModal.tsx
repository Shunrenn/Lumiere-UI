import { useState } from 'react'
import type { PMProject } from '@/lib/project-manager-sample-data'
import { PMFields, ProjectManagerModal } from './ProjectManagerModal'

export function ProjectManagerInitializeModal({ projects, manager, onClose, onCreate, onLive, onWorkspace }: {
  projects: PMProject[]; manager: string; onClose: () => void; onCreate: (project: PMProject) => void; onLive: () => void; onWorkspace: (project: PMProject) => void
}) {
  const [step, setStep] = useState(1)
  const [review, setReview] = useState<PMProject | null>(null)
  const [draft, setDraft] = useState({ title: '', client: '', venue: '', date: '', start: '18:00', end: '22:00', type: '', guests: '120', notes: '' })
  const match = projects.find(project => project.sample && project.client.trim().toLowerCase() === draft.client.trim().toLowerCase() && project.date === draft.date)
  const fields: [string, string | number | undefined][] = [['Event Title', draft.title], ['Client', draft.client], ['Venue', draft.venue], ['Event Date', draft.date], ['Start Time', draft.start], ['End Time', draft.end], ['Event Type', draft.type], ['Guest Count', draft.guests], ['Notes', draft.notes]]
  if (review) return <ProjectManagerModal title="Project Details" onClose={() => setReview(null)}>
    <p className="pm-notice">SAMPLE — possible duplicate</p>
    <PMFields fields={ [['Reference ID', review.refId], ['Event Name', review.title], ['Client', review.client], ['Venue', review.venue], ['Event Date', review.date], ['Status', review.status], ['Progress', review.progress === undefined ? undefined : `${review.progress}%`], ['Project Manager', review.manager]] } />
    <div className="pm-actions"><button onClick={() => setReview(null)}>Back to verification</button><button onClick={() => setReview(null)}>Close</button><button className="pm-primary" onClick={() => onWorkspace(review)}>Open Event Workspace</button></div>
  </ProjectManagerModal>
  return <ProjectManagerModal title={step === 1 ? 'Initialize Event' : step === 2 ? 'Verify Event Information' : 'Confirm & Create'} onClose={onClose}>
    <p className="pm-notice">SAMPLE mode — records stay in this page session. No backend writes.</p>
    {step === 1 ? <form onSubmit={event => { event.preventDefault(); setStep(2) }}>
      <div className="pm-form-grid">{fields.map(([label, value]) => {
        const keys: Record<string, keyof typeof draft> = { 'Event Title': 'title', Client: 'client', Venue: 'venue', 'Event Date': 'date', 'Start Time': 'start', 'End Time': 'end', 'Event Type': 'type', 'Guest Count': 'guests', Notes: 'notes' }
        const key = keys[label]
        return <label key={label}>{label}<input value={value ?? ''} required={key !== 'notes'} type={key === 'date' ? 'date' : ['start', 'end'].includes(key) ? 'time' : key === 'guests' ? 'number' : 'text'} min={key === 'guests' ? 1 : undefined} onChange={event => setDraft(previous => ({ ...previous, [key]: event.target.value }))} /></label>
      })}</div>
      <div className="pm-actions"><button type="button" onClick={onLive}>Use live registration</button><button className="pm-primary" type="submit">Continue</button></div>
      <p className="pm-muted">Live registration uses the existing supported fields and server conflict checks.</p>
    </form> : <>
      <PMFields fields={fields} />
      {step === 2 && match && <section className="pm-warning"><h3>Possible Duplicate Found</h3><p>SAMPLE duplicate warning: {match.refId} — {match.title}</p><p>Same client · Same event date{match.title.toLowerCase().includes(draft.title.toLowerCase()) ? ' · Similar event name' : ''}</p><button onClick={() => setReview(match)}>Review Existing</button></section>}
      {step === 2 && !match && <p className="pm-muted">No matching sample client and date found. This is not backend validation.</p>}
      <div className="pm-actions"><button onClick={() => setStep(step - 1)}>Back</button>{step === 2 ? <button className="pm-primary" onClick={() => setStep(3)}>{match ? 'Continue Anyway' : 'Continue'}</button> : <button className="pm-primary" onClick={() => {
        const now = new Date().toISOString()
        onCreate({ ...draft, id: `sample-${crypto.randomUUID()}`, refId: `SAMPLE-${projects.filter(project => project.sample).length + 1}`, manager, sample: true, guests: Number(draft.guests), status: 'Initialized', progress: 10, created: now, createdBy: manager, planning: 'Not started', canvas: 'Not started', production: 'Not started', assets: [], requiredStaff: 0, assignedStaff: 0, blockers: [...(match ? ['Possible duplicate (sample)'] : []), 'Project not activated', 'Planning not started'] })
      }}>Confirm & Create</button>}</div>
    </>}
  </ProjectManagerModal>
}
