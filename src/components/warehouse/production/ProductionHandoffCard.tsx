import { useState } from 'react'
import { updateProductionHandoff, type ProductionItem } from '@/lib/warehouse-production'

export function ProductionHandoffCard({ items }: { items: ProductionItem[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h1 className="font-serif text-xl font-bold">Production Work</h1>
        <p className="mt-1 text-xs text-muted-foreground">Your assigned tasks.</p>
      </div>
      {items.length === 0 ? <p className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">No production work assigned.</p> : items.map((item) => (
        <ProductionItemCard key={item.id} item={item} />
      ))}
    </section>
  )
}

function ProductionItemCard({ item }: { item: ProductionItem }) {
  const [stage, setStage] = useState(item.stage)
  const isMaking = stage === 'InProgress'
  const isQualityCheck = stage === 'CompletedAwaitingApproval' || stage === 'RejectedRework'
  const isReady = stage === 'Approved' || stage === 'DispatchReady'
  const startWork = () => {
    setStage('InProgress')
    updateProductionHandoff(item.id, 'start')
  }
  const submitCheck = () => {
    setStage('CompletedAwaitingApproval')
    updateProductionHandoff(item.id, 'submit')
  }
  const undoAction = () => {
    const previousStage = stage === 'InProgress' ? 'Pending' : 'InProgress'
    setStage(previousStage)
    updateProductionHandoff(item.id, stage === 'InProgress' ? 'undo-start' : 'undo-submit')
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">{item.subCategory || 'Production'}</p>
          <h2 className="mt-1 font-serif text-base font-bold">{item.itemName}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{item.eventTitle} · {item.assignedCrew}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${isReady ? 'bg-emerald-500/15 text-emerald-700' : isQualityCheck ? 'bg-amber-500/15 text-amber-700' : 'bg-primary/10 text-primary'}`}>
          {isReady ? 'Ready' : isQualityCheck ? 'Quality Check' : isMaking ? 'Making' : 'Planned'}
        </span>
      </div>
      <div className="mt-4 rounded-xl border border-border bg-background p-3">
        <p className="text-xs font-semibold">Fabrication Check</p>
        <p className="mt-1 text-[10px] text-muted-foreground">Check finish, size, and readiness.</p>
      </div>
      {stage === 'Pending' || stage === 'MaterialsVerified' ? <button type="button" onClick={startWork} className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">Start Work</button> : isMaking ? <button type="button" onClick={submitCheck} className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">Submit Check</button> : isQualityCheck ? <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-center text-xs font-semibold text-amber-800 dark:text-amber-200">Needs Review</p> : <p className="mt-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-center text-xs font-semibold text-emerald-800 dark:text-emerald-200">Ready</p>}
      {(isMaking || isQualityCheck) && <button type="button" onClick={undoAction} className="mt-2 w-full rounded-xl border border-border px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-muted">Undo</button>}
      <p className="mt-2 text-center text-[10px] text-muted-foreground">Required before dispatch.</p>
    </div>
  )
}
