import { useState } from 'react'
import type { PMPitch } from '@/lib/project-manager-sample-data'
import type { ProjectPitch } from '@/lib/project-pitch'
import { ProjectManagerModal } from './ProjectManagerModal'

export function ProjectManagerCreatePitchModal({ sample, brief, onClose, onSample, onSave }: {
  sample: boolean; brief: boolean; onClose: () => void; onSample: (pitch: PMPitch) => void; onSave: (pitch: Partial<ProjectPitch>) => Promise<unknown>
}) {
  const [draft, setDraft] = useState({ client: '', title: '', concept: '', date: '', guests: '120', budget: '', venue: '', contact: '', notes: '' })
  const [saving, setSaving] = useState(false), [error, setError] = useState('')
  const fields = [['client', 'Client'], ['title', 'Pitch Name'], ['concept', 'Concept'], ['date', 'Target Date'], ['guests', 'Guests'], ['budget', 'Budget'], ['venue', 'Venue'], ['contact', 'Contact'], ['notes', 'Notes']] as const
  return <ProjectManagerModal title={brief ? 'Create New Brief' : 'New Client Pitch'} onClose={onClose}>
    {sample && <p className="pm-notice">SAMPLE — draft stays in this page session.</p>}
    <form onSubmit={async event => {
      event.preventDefault(); setSaving(true); setError('')
      try {
        if (sample) onSample({ ...draft, id: `sample-pitch-${crypto.randomUUID()}`, status: 'Draft', guests: Number(draft.guests), sample: true })
        else await onSave({ status: 'Draft', brief: { clientName: draft.client, contactPerson: draft.contact, contactEmail: '', contactPhone: '', eventType: '', proposedDate: draft.date, proposedVenue: draft.venue, estimatedGuests: Number(draft.guests), budgetRange: draft.budget, requirements: '', notes: draft.notes }, proposal: { conceptTitle: draft.title, conceptSummary: draft.concept, scopeOfWork: '', deliverables: [], estimatedBudget: 0, proposedTimeline: '', notes: '' } })
        onClose()
      } catch { setError('Could not save this draft. Your entries are preserved. Please try again.') }
      finally { setSaving(false) }
    }}>
      <div className="pm-form-grid">{fields.map(([key, label]) => <label key={key}>{label}<input aria-label={label} required={['client', 'title', 'date'].includes(key)} type={key === 'date' ? 'date' : key === 'guests' ? 'number' : 'text'} min={key === 'guests' ? 1 : undefined} value={draft[key]} onChange={event => setDraft(previous => ({ ...previous, [key]: event.target.value }))} /></label>)}</div>
      {error && <p className="pm-warning" role="alert">{error}</p>}
      <div className="pm-actions"><button type="button" onClick={onClose} disabled={saving}>Cancel</button><button className="pm-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save Draft'}</button></div>
    </form>
  </ProjectManagerModal>
}
