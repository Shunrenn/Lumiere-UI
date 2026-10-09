import { updateProductionHandoff, type ProductionItem } from '@/lib/warehouse-production'

export function ProductionHandoffCard({ items }: { items: ProductionItem[] }) {
  return (
    <section className="space-y-3">
      <div>
        <h1 className="font-serif text-xl font-bold">Assigned production work</h1>
        <p className="mt-1 text-xs text-muted-foreground">Work assigned by WOM and shared with Ground Crew.</p>
      </div>
      {items.length === 0 ? <p className="rounded-2xl border border-border bg-card p-4 text-xs text-muted-foreground">No production work assigned.</p> : items.map((item) => {
        const completed = item.stage === 'CompletedAwaitingApproval' || item.stage === 'Approved' || item.stage === 'DispatchReady'
        return <div key={item.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div><p className="text-[10px] font-bold uppercase tracking-[0.12em] text-primary">{item.subCategory || 'Production work'}</p><h2 className="mt-1 font-serif text-base font-bold">{item.itemName}</h2><p className="mt-1 text-xs text-muted-foreground">{item.eventTitle} · {item.assignedCrew}</p></div>
            <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${completed ? 'bg-emerald-500/15 text-emerald-700' : 'bg-primary/10 text-primary'}`}>{completed ? 'Crew work complete' : 'Assigned'}</span>
          </div>
          <div className="mt-4 rounded-xl border border-border bg-background p-3"><p className="text-xs font-semibold">Complete fabrication check</p><p className="mt-1 text-[10px] text-muted-foreground">Verify finish, dimensions, and readiness for dispatch.</p></div>
          <button type="button" onClick={() => updateProductionHandoff(item.id, completed)} className="mt-3 w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">{completed ? 'Reopen assigned work' : 'Mark assigned work complete'}</button>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">WOM sees this handoff and reviews it before dispatch.</p>
        </div>
      })}
    </section>
  )
}
