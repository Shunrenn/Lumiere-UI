import { useState } from 'react'
import { Camera, X, CheckCircle2, AlertTriangle } from 'lucide-react'
import { usePortal } from '@/lib/store'
import {
  approveForDispatch,
  elapsedLabel,
  sendBackForRevision,
  submitForApproval,
  type ProductionItem,
} from '@/lib/warehouse-production'
import { Pill } from '@/components/warehouse/shared/Pill'
import type { Tone } from '@/components/warehouse/event-detail/status-tone'

const STAGE_TONE: Record<ProductionItem['stage'], Tone> = {
  Unprepped: 'neutral',
  Prepping: 'progress',
  'Awaiting Approval': 'caution',
  Ready: 'positive',
}

interface ProductionDetailModalProps {
  item: ProductionItem
  isProductionManager: boolean
  onClose: () => void
}

export function ProductionDetailModal({ item, isProductionManager, onClose }: ProductionDetailModalProps) {
  const { inventory } = usePortal()
  const [notes, setNotes] = useState(item.accomplishment?.notes ?? '')
  const [photoDataUrl, setPhotoDataUrl] = useState<string | undefined>(item.accomplishment?.photoDataUrl)

  const handlePhotoChange = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPhotoDataUrl(String(reader.result))
    reader.readAsDataURL(file)
  }

  const handleSubmit = () => {
    submitForApproval(item.id, notes, photoDataUrl)
  }

  const canSubmit = item.stage === 'Unprepped' || item.stage === 'Prepping'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex h-full max-h-[46rem] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-card shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">
              <img src={item.thumbnail || '/placeholder.svg'} alt={item.itemName} crossOrigin="anonymous" className="size-full object-cover" />
            </div>
            <div>
              <p className="text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Production detail
              </p>
              <h2 className="mt-0.5 font-serif text-xl font-medium text-card-foreground">{item.itemName}</h2>
              <p className="mt-0.5 text-[0.62rem] uppercase tracking-[0.06em] text-muted-foreground">{item.eventTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-9 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="flex flex-wrap items-center gap-3">
            <Pill tone={STAGE_TONE[item.stage]}>{item.stage}</Pill>
            <span className="text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
              Man count: <span className="font-semibold text-card-foreground">{item.manCount}</span>
            </span>
            <span className="text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
              Elapsed: <span className="font-semibold text-card-foreground">{elapsedLabel(item.startedAt)}</span>
            </span>
            <span className="text-[0.62rem] uppercase tracking-[0.08em] text-muted-foreground">
              Crew: <span className="font-semibold text-card-foreground">{item.assignedCrew}</span>
            </span>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                Raw materials live inventory check
              </p>
              <span className="text-[0.55rem] font-semibold uppercase tracking-wider text-muted-foreground">
                Live Stockroom Sync
              </span>
            </div>
            <ul className="flex flex-col gap-2 rounded-lg border border-border bg-background p-3">
              {item.rawMaterials.map((material) => {
                const match = inventory.find((inv) => {
                  const a = inv.name.toLowerCase().replace(/—|-/g, '').trim()
                  const b = material.name.toLowerCase().replace(/—|-/g, '').trim()
                  return a.includes(b) || b.includes(a) || a.split(' ')[0] === b.split(' ')[0]
                })
                const currentStock = match ? match.stock : 15
                const isAvailable = currentStock >= material.qty

                return (
                  <li key={material.id} className="flex items-center justify-between rounded-md border border-border/60 bg-muted/20 px-3 py-2">
                    <div className="flex items-center gap-2.5">
                      {isAvailable ? (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3.5" />
                        </span>
                      ) : (
                        <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400">
                          <AlertTriangle className="size-3.5" />
                        </span>
                      )}
                      <div>
                        <p className="text-xs font-medium text-card-foreground">{material.name}</p>
                        <p className="text-[0.6rem] text-muted-foreground">
                          Job Requirement: <span className="font-semibold text-card-foreground">{material.qty} {material.unit}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {isAvailable ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                          Available (Stock: {currentStock} {material.unit})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-rose-800 dark:bg-rose-950/80 dark:text-rose-300">
                          Insufficient ({currentStock} / {material.qty} {material.unit})
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="mt-5">
            <p className="mb-2 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
              Accomplishment declaration
            </p>
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-background p-3">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe progress made on this build…"
                rows={3}
                className="w-full rounded-md border border-input bg-card px-3 py-2.5 text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/30"
              />
              <div className="flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3.5 py-2 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-card-foreground transition hover:bg-accent">
                  <Camera className="size-3.5" />
                  Attach Photo
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePhotoChange(e.target.files?.[0])}
                  />
                </label>
                {photoDataUrl && (
                  <img src={photoDataUrl} alt="Accomplishment attachment" crossOrigin="anonymous" className="size-10 rounded-md object-cover" />
                )}
              </div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || notes.trim().length === 0}
                className="self-start rounded-md bg-primary px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-40"
              >
                Submit for Approval
              </button>
            </div>
          </div>
        </div>

        {isProductionManager && item.stage === 'Awaiting Approval' && (
          <div className="flex items-center justify-end gap-3 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={() => sendBackForRevision(item.id)}
              className="rounded-md border border-border px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-card-foreground transition hover:bg-accent"
            >
              Send Back for Revision
            </button>
            <button
              type="button"
              onClick={() => approveForDispatch(item.id)}
              className="rounded-md bg-primary px-4 py-2.5 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-primary-foreground transition-opacity hover:opacity-90"
            >
              Approve for Dispatch
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
