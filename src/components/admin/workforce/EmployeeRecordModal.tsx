import { useState } from 'react'
import { X } from 'lucide-react'
import type { EmploymentType, NewEmployeeRecordDraft } from '@/lib/types'

interface Props {
  open: boolean
  onClose: () => void
  onCreate: (draft: NewEmployeeRecordDraft) => void
}

const inputClass = 'mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-ring/30'

export function EmployeeRecordModal({ open, onClose, onCreate }: Props) {
  const [draft, setDraft] = useState<NewEmployeeRecordDraft>({ firstName: '', surname: '', contact: '', employmentType: 'On-call' })
  if (!open) return null
  const valid = draft.firstName.trim() && draft.surname.trim() && /^\d{11}$/.test(draft.contact)
  const close = () => { setDraft({ firstName: '', surname: '', contact: '', employmentType: 'On-call' }); onClose() }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-700/70 p-4" role="dialog" aria-modal="true" aria-label="New employee record">
      <div className="w-full max-w-md overflow-hidden rounded-lg bg-card shadow-2xl">
        <div className="flex items-center justify-between bg-primary px-6 py-3.5"><div><h2 className="text-xs font-bold uppercase tracking-[0.2em] text-primary-foreground">New Employee Record</h2><p className="mt-1 text-[0.65rem] text-primary-foreground/80">No email, password, or portal access</p></div><button type="button" onClick={close} className="text-primary-foreground/80 hover:text-primary-foreground" aria-label="Close"><X className="size-4" /></button></div>
        <div className="space-y-4 px-6 py-6">
          <div className="grid grid-cols-2 gap-4"><label className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">First Name<input className={inputClass} value={draft.firstName} onChange={(e) => setDraft((p) => ({ ...p, firstName: e.target.value }))} placeholder="Lucia" /></label><label className="text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">Surname<input className={inputClass} value={draft.surname} onChange={(e) => setDraft((p) => ({ ...p, surname: e.target.value }))} placeholder="Mendes" /></label></div>
          <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">Contact Number<input className={inputClass} value={draft.contact} onChange={(e) => setDraft((p) => ({ ...p, contact: e.target.value.replace(/\D/g, '').slice(0, 11) }))} placeholder="09123456789" inputMode="numeric" /></label>
          <label className="block text-[0.65rem] font-bold uppercase tracking-[0.1em] text-foreground">Employment Type<select className={`${inputClass} appearance-none`} value={draft.employmentType} onChange={(e) => setDraft((p) => ({ ...p, employmentType: e.target.value as EmploymentType }))}><option value="On-call">On-call</option><option value="Seasonal">Seasonal</option></select></label>
          <div className="rounded-md border border-dashed border-border bg-muted/30 px-3 py-2.5 text-xs leading-5 text-muted-foreground">This record can be archived and reactivated, but it will never create portal credentials.</div>
          <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={close} className="rounded-md border border-border px-4 py-2 text-xs font-semibold text-foreground hover:bg-muted">Cancel</button><button type="button" disabled={!valid} onClick={() => { onCreate(draft); close() }} className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40">Create Record</button></div>
        </div>
      </div>
    </div>
  )
}

export default EmployeeRecordModal
