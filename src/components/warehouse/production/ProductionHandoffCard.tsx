import { updateProductionHandoff, type ProductionItem } from '@/lib/warehouse-production'

export function ProductionHandoffCard({ items }: { items: ProductionItem[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h1 className="font-serif text-xl font-bold">Production Work</h1>
        <p className="mt-1 text-xs text-muted-foreground">Your assigned tasks.</p>
      </div>
      {items.length === 0 ? <p className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">No production work assigned.</p> : items.map((item) => {
        const completed = item.stage === 'CompletedAwaitingApproval' || item.stage === 'Approved' || item.stage === 'DispatchReady'
        return <div key={item.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">{item.subCategory || 'Production'}</p><h2 className="mt-1 font-serif text-base font-bold">{item.itemName}</h2><p className="mt-1 text-xs text-muted-foreground">{item.eventTitle} · {item.assignedCrew}</p></div>
            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${completed ? 'bg-emerald-500/15 text-emerald-700' : 'bg-primary/10 text-primary'}`}>{completed ? 'Crew work complete' : 'Assigned'}</span>
          </div>
          <div className="mt-4 rounded-xl border border-border bg-background p-3"><p className="text-xs font-semibold">Fabrication Check</p><p className="mt-1 text-[10px] text-muted-foreground">Check finish, size, and readiness.</p></div>
          <button type="button" onClick={() => updateProductionHandoff(item.id, completed)} className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">{completed ? 'Reopen Check' : 'Complete Check'}</button>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">Required before dispatch.</p>
        </div>
      })}
    </section>
  )
}
