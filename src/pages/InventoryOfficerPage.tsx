import { useEffect, useState } from 'react'
import { Activity as ActivityIcon, Bell, CalendarDays, Check, ClipboardList, Package, Plus, Search, Truck, UserCircle2, Warehouse, X } from 'lucide-react'
import { useAuth } from '@/lib/auth'
import { LoadingSkeleton } from '@/components/LoadingSkeleton'
import { ErrorFallback } from '@/components/ErrorFallback'
import { inventoryOps, useInventoryOps, type OpsEventItem, type OpsInventoryItem, type OpsOrder, type TrackingStatus } from '@/lib/inventory-ops'

type Tab = 'home' | 'inventory' | 'orders' | 'tracking' | 'calendar' | 'activity' | 'account'
const dates = Array.from({ length: 31 }, (_, index) => index + 1)
const trackingOrder: TrackingStatus[] = ['Warehouse', 'Loaded', 'In Transit', 'On Site', 'Returned']
const dateLabel = (date: string) => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })

export function InventoryOfficerPage() {
  const { adminName, adminEmail, logout } = useAuth()
  const ops = useInventoryOps()
  const [tab, setTab] = useState<Tab>('home')
  const [selectedItem, setSelectedItem] = useState<OpsInventoryItem | null>(null)
  const [selectedDate, setSelectedDate] = useState('2026-08-20')
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState('')
  const notify = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 5000) }
  const go = (next: Tab) => setTab(next)
  const tabs: [Tab, string, typeof ClipboardList][] = [['home', 'Home', ClipboardList], ['inventory', 'Inventory', Package], ['orders', 'Orders', ClipboardList], ['tracking', 'Tracking', Truck], ['calendar', 'Calendar', CalendarDays], ['activity', 'Activity', ActivityIcon], ['account', 'Account', UserCircle2]]
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)

  const handleRefetch = async () => {
    setIsError(false)
    setIsLoading(true)
    try {
      await new Promise((r) => setTimeout(r, 200))
    } catch {
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    handleRefetch()
  }, [])

  return <div className="mobile-shell admin-fade">
    <header className="app-header"><div><p className="eyebrow">Lumière Operations</p><div className="brand-mark">INVENTORY</div></div><button className="avatar" onClick={() => go('account')} aria-label="Open account">{(adminName || 'IO').slice(0, 2).toUpperCase()}</button></header>
    <main className="app-main">
      {isError ? (
        <ErrorFallback
          title="Inventory Officer Portal Unavailable"
          message="Could not load stock records and dispatch tracking."
          onRetry={handleRefetch}
        />
      ) : isLoading ? (
        <LoadingSkeleton variant="dashboard" />
      ) : (
        <>
      {tab === 'home' && <Home ops={ops} onNavigate={go} onEvent={() => go('tracking')} />}
      {tab === 'inventory' && <Inventory items={ops.inventory} search={search} setSearch={setSearch} onOpen={setSelectedItem} />}
      {tab === 'orders' && <Orders orders={ops.orders} onNotify={notify} />}
      {tab === 'tracking' && <Tracking items={ops.eventItems} batches={ops.batches} onNotify={notify} />}
      {tab === 'calendar' && <CalendarView selectedDate={selectedDate} setSelectedDate={setSelectedDate} notes={ops.notes} onSave={(note) => { inventoryOps.saveNote(selectedDate, note); notify('Calendar note saved.') }} orders={ops.orders} batches={ops.batches} />}
      {tab === 'activity' && <Activity entries={ops.activity} />}
      {tab === 'account' && <Account name={adminName || 'Inventory Officer'} email={adminEmail || 'inventory@lumiere.com'} onLogout={logout} />}
        </>
      )}
    </main>
    <nav className="bottom-nav" aria-label="Inventory navigation">{tabs.slice(0, 5).map(([key, label, Icon]) => <button key={key} onClick={() => go(key)} className={tab === key ? 'active' : ''}><Icon className="size-5" /><span>{label}</span></button>)}<button onClick={() => go('activity')} className={tab === 'activity' ? 'active' : ''}><ActivityIcon className="size-5" /><span>Activity</span></button><button onClick={() => go('account')} className={tab === 'account' ? 'active' : ''}><UserCircle2 className="size-5" /><span>Account</span></button></nav>
    {selectedItem && <InventoryDetail item={ops.inventory.find((item) => item.id === selectedItem.id) ?? selectedItem} onClose={() => setSelectedItem(null)} onNotify={notify} />}
    {toast && <div className="fixed bottom-24 left-1/2 z-40 w-[calc(100%-32px)] max-w-[528px] -translate-x-1/2 rounded-md bg-primary px-4 py-3 text-center text-sm text-primary-foreground shadow-lg">{toast}</div>}
  </div>
}

function Home({ ops, onNavigate, onEvent }: { ops: ReturnType<typeof useInventoryOps>; onNavigate: (tab: Tab) => void; onEvent: () => void }) {
  const lowItems = ops.inventory.filter((item) => item.status === 'Low Stock')
  const inTransitBatches = ops.batches.filter((batch) => batch.status === 'In Transit')
  const low = lowItems.length
  const inTransit = inTransitBatches.length
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <div className="space-y-5">
      <section 
        className="paper-card cursor-pointer transition-colors hover:border-primary/50"
        onClick={() => setModalOpen(true)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="size-4 text-primary" />
            <p className="eyebrow">Operations alerts</p>
          </div>
          <span className="text-xs font-semibold text-primary">View alert details →</span>
        </div>
        <div className="mt-3 space-y-2 text-sm">
          <p><strong>{low} low-stock item{low === 1 ? '' : 's'}</strong> need review before the next event.</p>
          <p><strong>{inTransit} truck batch{inTransit === 1 ? '' : 'es'}</strong> currently in transit.</p>
        </div>
      </section>

      {modalOpen && (
        <div className="sheet-backdrop" onClick={() => setModalOpen(false)}>
          <div className="sheet space-y-5 max-w-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-border pb-3">
              <div>
                <p className="eyebrow text-primary">Warehouse Operations Alert Feed</p>
                <h2 className="mt-1 font-serif text-2xl">Inventory &amp; Dispatch Alerts</h2>
              </div>
              <button type="button" onClick={() => setModalOpen(false)} className="icon-button" aria-label="Close modal">
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
              {/* Low Stock Section */}
              <div className="space-y-2">
                <h3 className="font-serif text-base font-bold text-amber-700 dark:text-amber-400">Low Stock Review ({lowItems.length})</h3>
                {lowItems.map((item) => (
                  <div key={item.id} className="paper-card flex items-center justify-between gap-3 border-l-4 border-l-amber-500">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">SKU: {item.sku} · Category: {item.category}</p>
                      <p className="mt-1 text-xs">Total: {item.total} {item.unit} | Reserved: {item.reserved} | <strong>Free: {item.total - item.reserved}</strong></p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => { onNavigate('inventory'); setModalOpen(false); }}
                      className="button-primary shrink-0 text-xs py-1 px-3"
                    >
                      Reorder
                    </button>
                  </div>
                ))}
                {lowItems.length === 0 && <p className="text-xs text-muted-foreground italic">No items currently below safety threshold.</p>}
              </div>

              {/* In-Transit Batches Section */}
              <div className="space-y-2 pt-2 border-t border-border">
                <h3 className="font-serif text-base font-bold text-sky-600 dark:text-sky-400">In-Transit Dispatch Batches ({inTransitBatches.length})</h3>
                {inTransitBatches.map((batch) => (
                  <div key={batch.id} className="paper-card flex items-center justify-between gap-3 border-l-4 border-l-sky-500">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Truck className="size-4 text-sky-500" />
                        <p className="font-medium text-sm">{batch.truck}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Event: <strong>{batch.eventName}</strong> · Driver: {batch.driver}</p>
                      <p className="text-xs text-muted-foreground">{batch.itemCount} items allocated · Target Date: {batch.scheduledDate}</p>
                    </div>
                    <button 
                      type="button"
                      onClick={() => { onNavigate('tracking'); setModalOpen(false); }}
                      className="button-secondary shrink-0 text-xs py-1 px-3"
                    >
                      Track Fleet
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-border flex justify-end">
              <button type="button" onClick={() => setModalOpen(false)} className="button-secondary text-xs">
                Close Alert Feed
              </button>
            </div>
          </div>
        </div>
      )}

      <header><p className="eyebrow">Warehouse control</p><h1 className="mt-2 text-3xl font-serif">Inventory overview</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Counts, ordering, warehouse checks, and event dispatch in one place.</p></header><div className="grid grid-cols-2 gap-3">{[['Available', ops.inventory.filter((i) => i.status === 'Available').length], ['Low stock', low], ['Open orders', ops.orders.filter((o) => o.status !== 'Received').length], ['In transit', inTransit]].map(([label, value]) => <div key={label} className="paper-card"><p className="eyebrow">{label}</p><p className="mt-2 font-serif text-2xl">{value}</p></div>)}</div><section className="space-y-3"><div className="section-heading"><h2>Upcoming attention</h2><CalendarDays className="size-5 text-primary" /></div>{ops.orders.slice(0, 2).map((order) => <button key={order.id} onClick={() => onNavigate('orders')} className="paper-card flex w-full items-center justify-between text-left"><div><p className="font-medium">{order.itemName}</p><p className="mt-1 text-xs text-muted-foreground">Delivery {dateLabel(order.deliveryDate)} · {order.vendor}</p></div><span className="status status-submitted">{order.status}</span></button>)}<button onClick={onEvent} className="paper-card flex w-full items-center gap-3 text-left"><Truck className="size-5 text-primary" /><div><p className="font-medium">Founders Dinner dispatch</p><p className="mt-1 text-xs text-muted-foreground">Track allocated items and batch assignment.</p></div></button></section></div>
  )
}

function Inventory({ items, search, setSearch, onOpen }: { items: OpsInventoryItem[]; search: string; setSearch: (value: string) => void; onOpen: (item: OpsInventoryItem) => void }) { const filtered = items.filter((item) => `${item.name} ${item.sku} ${item.category}`.toLowerCase().includes(search.toLowerCase())); return <div className="space-y-5"><header><p className="eyebrow">Catalog & counts</p><h1 className="mt-2 text-3xl font-serif">Inventory</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Image-rich stock records shared with Event Planner.</p></header><label className="relative block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search items or SKU" className="field-input pl-10" /></label><div className="space-y-3">{filtered.map((item) => <button key={item.id} onClick={() => onOpen(item)} className="paper-card flex w-full gap-3 text-left"><div className="size-16 shrink-0 overflow-hidden rounded-md bg-secondary">{item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="size-full object-cover" /> : <Package className="m-5 size-6 text-muted-foreground" />}</div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="font-medium">{item.name}</p><span className={`status shrink-0 ${item.status === 'Available' ? 'status-approved' : 'status-submitted'}`}>{item.status}</span></div><p className="mt-1 text-xs text-muted-foreground">{item.sku} · {item.category}</p><p className="mt-2 text-xs">Available <strong>{item.total - item.reserved} {item.unit}</strong> · Reserved {item.reserved}</p></div></button>)}</div></div> }

function InventoryDetail({ item, onClose, onNotify }: { item: OpsInventoryItem; onClose: () => void; onNotify: (message: string) => void }) { return <div className="sheet-backdrop"><div className="sheet space-y-4"><div className="flex items-start justify-between"><div><p className="eyebrow">Stock record · {item.sku}</p><h2 className="mt-1 font-serif text-2xl">{item.name}</h2></div><button onClick={onClose} className="icon-button" aria-label="Close"><X className="size-4" /></button></div><div className="aspect-[16/9] overflow-hidden rounded-md bg-secondary">{item.imageUrl ? <img src={item.imageUrl} alt={item.name} className="size-full object-cover" /> : <div className="flex size-full items-center justify-center"><Package className="size-10 text-muted-foreground" /></div>}</div><div className="grid grid-cols-3 gap-2 text-center"><div className="paper-card p-3"><p className="eyebrow">Total</p><p className="mt-1 font-serif text-xl">{item.total}</p></div><div className="paper-card p-3"><p className="eyebrow">Reserved</p><p className="mt-1 font-serif text-xl">{item.reserved}</p></div><div className="paper-card p-3"><p className="eyebrow">Free</p><p className="mt-1 font-serif text-xl">{item.total - item.reserved}</p></div></div><div className="flex gap-3"><button onClick={() => { inventoryOps.adjustStock(item.id, -1); onNotify('Removed one from stock count.') }} className="button-secondary flex-1">− 1</button><button onClick={() => { inventoryOps.adjustStock(item.id, 1); onNotify('Added one to stock count.') }} className="button-primary flex-1">+ 1</button></div><p className="text-xs text-muted-foreground">Condition: {item.condition}. Changes also appear in the shared Event Planner inventory record.</p></div></div> }

function Orders({ orders, onNotify }: { orders: OpsOrder[]; onNotify: (message: string) => void }) { const [open, setOpen] = useState(false); const [itemName, setItemName] = useState(''); const [vendor, setVendor] = useState(''); const [deliveryDate, setDeliveryDate] = useState('2026-08-28'); return <div className="space-y-5"><header className="flex items-end justify-between"><div><p className="eyebrow">Procurement schedule</p><h1 className="mt-2 text-3xl font-serif">Orders</h1></div><button onClick={() => setOpen(true)} className="button-primary px-3"><Plus className="size-4" /> New</button></header><div className="space-y-3">{orders.map((order) => <div key={order.id} className="paper-card"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{order.itemName}</p><p className="mt-1 text-xs text-muted-foreground">{order.vendor} · {order.eventName}</p></div><span className="status status-submitted">{order.status}</span></div><div className="mt-3 flex justify-between border-t border-border pt-3 text-xs text-muted-foreground"><span>{order.received}/{order.quantity} received</span><span>Due {dateLabel(order.deliveryDate)}</span></div></div>)}</div>{open && <div className="sheet-backdrop"><form className="sheet space-y-4" onSubmit={(event) => { event.preventDefault(); inventoryOps.createOrder({ itemName, vendor, eventName: 'Founders Dinner', quantity: 10, deliveryDate }); setOpen(false); onNotify('Order request created.'); setItemName(''); setVendor('') }}><div className="flex items-start justify-between"><div><p className="eyebrow">Procurement</p><h2 className="mt-1 font-serif text-2xl">New order</h2></div><button type="button" onClick={() => setOpen(false)} className="icon-button"><X className="size-4" /></button></div><label className="field-label">Item<input required value={itemName} onChange={(event) => setItemName(event.target.value)} className="field-input" placeholder="Item or material" /></label><label className="field-label">Vendor<input required value={vendor} onChange={(event) => setVendor(event.target.value)} className="field-input" placeholder="Vendor name" /></label><label className="field-label">Delivery date<input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} className="field-input" /></label><button className="button-primary w-full"><Check className="size-4" /> Create order</button></form></div>}</div> }

function Tracking({ items, batches, onNotify }: { items: OpsEventItem[]; batches: ReturnType<typeof useInventoryOps>['batches']; onNotify: (message: string) => void }) { return <div className="space-y-5"><header><p className="eyebrow">Dispatch control</p><h1 className="mt-2 text-3xl font-serif">Tracking</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Assign event items to truck batches and keep warehouse status current.</p></header><section className="space-y-3"><h2 className="font-serif text-xl">Truck batches</h2>{batches.map((batch) => <div key={batch.id} className="paper-card"><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{batch.truck}</p><p className="mt-1 text-xs text-muted-foreground">{batch.eventName} · {batch.driver}</p></div><span className="status status-in-progress">{batch.status}</span></div><p className="mt-3 text-xs text-muted-foreground">{batch.itemCount} items · scheduled {dateLabel(batch.scheduledDate)}</p></div>)}</section><section className="space-y-3"><h2 className="font-serif text-xl">Event items</h2>{items.map((item) => <div key={item.id} className="paper-card"><div className="flex justify-between gap-3"><div><p className="font-medium">{item.itemName}</p><p className="mt-1 text-xs text-muted-foreground">{item.eventName} · {item.allocated}/{item.requested} allocated</p></div><Truck className="size-4 text-primary" /></div><div className="mt-3 flex gap-2"><select value={item.tracked} onChange={(event) => { inventoryOps.updateTracking(item.id, event.target.value as TrackingStatus); onNotify('Tracking status updated.') }} className="field-input text-xs"><option>{trackingOrder[0]}</option>{trackingOrder.slice(1).map((status) => <option key={status}>{status}</option>)}</select><select value={item.batchId ?? ''} onChange={(event) => { if (event.target.value) { inventoryOps.assignBatch(item.id, event.target.value); onNotify('Item assigned to truck batch.') } }} className="field-input text-xs"><option value="">Assign batch</option>{batches.map((batch) => <option key={batch.id} value={batch.id}>{batch.id}</option>)}</select></div></div>)}</section></div> }

function CalendarView({ selectedDate, setSelectedDate, notes, onSave, orders, batches }: { selectedDate: string; setSelectedDate: (date: string) => void; notes: Record<string, string>; onSave: (note: string) => void; orders: OpsOrder[]; batches: ReturnType<typeof useInventoryOps>['batches'] }) { const note = notes[selectedDate] ?? ''; const [draft, setDraft] = useState(note); const hasSchedule = new Set([...orders.map((order) => order.deliveryDate), ...batches.map((batch) => batch.scheduledDate)]); return <div className="space-y-5"><header><p className="eyebrow">Orders, dispatch & warehouse checks</p><h1 className="mt-2 text-3xl font-serif">Calendar</h1></header><section className="paper-card"><h2 className="font-serif text-xl">August 2026</h2><div className="mt-4 grid grid-cols-7 gap-1 text-center text-xs"><div className="col-span-7 grid grid-cols-7 text-muted-foreground">{['S','M','T','W','T','F','S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div><span /><span /><span /><span /><span /><span /><span />{dates.map((day) => { const date = `2026-08-${String(day).padStart(2, '0')}`; const active = date === selectedDate; return <button key={date} onClick={() => { setSelectedDate(date); setDraft(notes[date] ?? '') }} className={`rounded p-2 ${active ? 'bg-primary text-primary-foreground' : ''}`}><span className="block">{day}</span><span className="mt-1 flex h-1.5 justify-center gap-1">{hasSchedule.has(date) && <span className="size-1.5 rounded-full bg-primary" />}{notes[date] && <span className="size-1.5 rounded-full border border-current" />}</span></button>})}</div></section><section className="space-y-3"><h2 className="font-serif text-xl">Schedule for {dateLabel(selectedDate)}</h2>{orders.filter((order) => order.deliveryDate === selectedDate).map((order) => <div key={order.id} className="paper-card"><p className="font-medium">Order delivery · {order.itemName}</p><p className="text-xs text-muted-foreground">{order.vendor}</p></div>)}{batches.filter((batch) => batch.scheduledDate === selectedDate).map((batch) => <div key={batch.id} className="paper-card"><p className="font-medium">Dispatch · {batch.eventName}</p><p className="text-xs text-muted-foreground">{batch.truck}</p></div>)}<div className="paper-card"><label className="field-label mt-0">Personal note<textarea value={draft} onChange={(event) => setDraft(event.target.value)} rows={3} className="field-input" placeholder="Warehouse check, call, or reminder" /></label><button onClick={() => onSave(draft)} className="button-primary mt-3 w-full">Save note</button></div></section></div> }

function Activity({ entries }: { entries: ReturnType<typeof useInventoryOps>['activity'] }) { return <div className="space-y-5"><header><p className="eyebrow">Shared operations record</p><h1 className="mt-2 text-3xl font-serif">Activity</h1></header><div className="space-y-3">{entries.map((entry) => <div key={entry.id} className="paper-card"><p className="text-sm">{entry.message}</p><p className="mt-2 text-xs text-muted-foreground">{entry.at} · {entry.source}</p></div>)}</div></div> }
function Account({ name, email, onLogout }: { name: string; email: string; onLogout: () => void }) { return <div className="space-y-5"><header><p className="eyebrow">Operations account</p><h1 className="mt-2 text-3xl font-serif">{name}</h1><p className="mt-1 text-sm text-muted-foreground">{email}</p></header><div className="paper-card flex gap-3"><Warehouse className="size-5 text-primary" /><p className="text-sm text-muted-foreground">Inventory counts, procurement schedules, warehouse checks, and dispatch tracking.</p></div><button onClick={onLogout} className="button-secondary w-full">Sign out</button></div> }
