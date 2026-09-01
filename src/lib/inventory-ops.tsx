import { useSyncExternalStore } from 'react'

export type InventoryStatus = 'Available' | 'Low Stock' | 'Reserved' | 'Maintenance'
export type OrderStatus = 'Requested' | 'Ordered' | 'Partially Received' | 'Received'
export type TrackingStatus = 'Warehouse' | 'Loaded' | 'In Transit' | 'On Site' | 'Returned'

export interface OpsInventoryItem {
  id: string
  name: string
  sku: string
  imageUrl?: string
  category: string
  total: number
  reserved: number
  unit: string
  condition: string
  status: InventoryStatus
}

export interface OpsOrder {
  id: string
  vendor: string
  itemName: string
  eventName: string
  quantity: number
  received: number
  status: OrderStatus
  deliveryDate: string
  createdAt: string
}

export interface DispatchBatch {
  id: string
  eventName: string
  truck: string
  driver: string
  scheduledDate: string
  itemCount: number
  status: TrackingStatus
  itemNames: string[]
}

export interface OpsEventItem {
  id: string
  eventName: string
  eventDate: string
  itemName: string
  requested: number
  allocated: number
  tracked: TrackingStatus
  batchId?: string
}

export interface OpsActivity {
  id: string
  message: string
  at: string
  source: string
}

export interface OpsNote { [date: string]: string }

interface OpsState {
  inventory: OpsInventoryItem[]
  orders: OpsOrder[]
  batches: DispatchBatch[]
  eventItems: OpsEventItem[]
  activity: OpsActivity[]
  notes: OpsNote
}

const seed: OpsState = {
  inventory: [
    { id: 'inv-1', name: 'Premium Crystal Candelabra', sku: 'LUM-CAN-001', imageUrl: '/images/items/candelabra.png', category: 'Lighting & Atmosphere', total: 48, reserved: 24, unit: 'pcs', condition: 'Good', status: 'Available' },
    { id: 'inv-2', name: 'Brass Plinths', sku: 'LUM-PLN-014', imageUrl: '/images/items/brass-plinths.png', category: 'Furniture Stock', total: 18, reserved: 12, unit: 'pcs', condition: 'Good', status: 'Available' },
    { id: 'inv-3', name: 'Custom Gold Table Runners', sku: 'LUM-TXT-022', imageUrl: '/images/items/linen-runners.png', category: 'Textiles & Tableware', total: 36, reserved: 20, unit: 'pcs', condition: 'New', status: 'Available' },
    { id: 'inv-4', name: 'Frosted Glass Chargers', sku: 'LUM-GLS-008', imageUrl: '/images/items/frosted-chargers.png', category: 'Textiles & Tableware', total: 120, reserved: 86, unit: 'pcs', condition: 'Good', status: 'Low Stock' },
    { id: 'inv-5', name: 'Velvet Drapery Panels', sku: 'LUM-TXT-031', category: 'Décor & Backdrop', total: 14, reserved: 12, unit: 'panels', condition: 'Good', status: 'Low Stock' },
  ],
  orders: [
    { id: 'ord-1', vendor: 'Maison Textile Co.', itemName: 'Gold edge trim', eventName: 'Founders Dinner', quantity: 24, received: 12, status: 'Partially Received', deliveryDate: '2026-08-21', createdAt: 'Aug 16, 2026' },
    { id: 'ord-2', vendor: 'Lumière Glassworks', itemName: 'Frosted Glass Chargers', eventName: 'Maison Privée Launch', quantity: 80, received: 0, status: 'Ordered', deliveryDate: '2026-08-24', createdAt: 'Aug 18, 2026' },
  ],
  batches: [
    { id: 'batch-1', eventName: 'Founders Dinner', truck: 'Truck 02 · LMR-482', driver: 'Andre M.', scheduledDate: '2026-08-19', itemCount: 68, status: 'In Transit', itemNames: ['Premium Crystal Candelabra', 'Brass Plinths'] },
    { id: 'batch-2', eventName: 'Maison Privée Launch', truck: 'Truck 01 · LMR-301', driver: 'Maya R.', scheduledDate: '2026-08-25', itemCount: 42, status: 'Warehouse', itemNames: ['Frosted Glass Chargers'] },
  ],
  eventItems: [
    { id: 'ei-1', eventName: 'Founders Dinner', eventDate: '2026-08-19', itemName: 'Premium Crystal Candelabra', requested: 24, allocated: 24, tracked: 'In Transit', batchId: 'batch-1' },
    { id: 'ei-2', eventName: 'Founders Dinner', eventDate: '2026-08-19', itemName: 'Brass Plinths', requested: 12, allocated: 12, tracked: 'In Transit', batchId: 'batch-1' },
    { id: 'ei-3', eventName: 'Maison Privée Launch', eventDate: '2026-08-25', itemName: 'Frosted Glass Chargers', requested: 86, allocated: 86, tracked: 'Warehouse', batchId: 'batch-2' },
  ],
  activity: [
    { id: 'act-1', message: 'Truck 02 departed with Founders Dinner batch.', at: 'Aug 19 · 08:40', source: 'Inventory Officer' },
    { id: 'act-2', message: '12 Gold edge trim pieces received from Maison Textile Co.', at: 'Aug 18 · 16:20', source: 'Purchasing Officer' },
  ],
  notes: {},
}

let state = seed
const listeners = new Set<() => void>()
let hydrated = false
const storageKey = 'lumiere_ops_state_v1'

function emit() {
  if (typeof window !== 'undefined') localStorage.setItem(storageKey, JSON.stringify(state))
  listeners.forEach((listener) => listener())
}
function hydrate() {
  if (hydrated || typeof window === 'undefined') return
  hydrated = true
  const raw = localStorage.getItem(storageKey)
  if (raw) { try { state = JSON.parse(raw) as OpsState } catch { localStorage.removeItem(storageKey) } }
}
const snapshot = () => { hydrate(); return state }
const subscribe = (listener: () => void) => { hydrate(); listeners.add(listener); const onStorage = (event: StorageEvent) => { if (event.key === storageKey && event.newValue) { state = JSON.parse(event.newValue) as OpsState; listener() } }; window.addEventListener('storage', onStorage); return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage) } }

export function useInventoryOps() { return useSyncExternalStore(subscribe, snapshot, () => seed) }
export const inventoryOps = {
  adjustStock(id: string, delta: number) { state = { ...state, inventory: state.inventory.map((item) => item.id === id ? { ...item, total: Math.max(0, item.total + delta), status: item.total + delta - item.reserved <= 0 ? 'Low Stock' : item.status } : item), activity: [{ id: `act-${Date.now()}`, message: `Stock count adjusted for ${state.inventory.find((i) => i.id === id)?.name ?? 'item'} by ${delta > 0 ? '+' : ''}${delta}.`, at: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), source: 'Inventory Officer' }, ...state.activity] }; emit() },
  createOrder(order: Omit<OpsOrder, 'id' | 'createdAt' | 'received' | 'status'>) { state = { ...state, orders: [{ ...order, id: `ord-${Date.now()}`, received: 0, status: 'Requested', createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) }, ...state.orders], activity: [{ id: `act-${Date.now()}`, message: `New order requested: ${order.itemName} from ${order.vendor}.`, at: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), source: 'Inventory Officer' }, ...state.activity] }; emit() },
  updateOrder(id: string, patch: Partial<OpsOrder>) { state = { ...state, orders: state.orders.map((order) => order.id === id ? { ...order, ...patch } : order) }; emit() },
  updateTracking(id: string, status: TrackingStatus) { state = { ...state, eventItems: state.eventItems.map((item) => item.id === id ? { ...item, tracked: status } : item), activity: [{ id: `act-${Date.now()}`, message: `Tracking updated to ${status}.`, at: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), source: 'Inventory Officer' }, ...state.activity] }; emit() },
  assignBatch(itemId: string, batchId: string) { state = { ...state, eventItems: state.eventItems.map((item) => item.id === itemId ? { ...item, batchId } : item), activity: [{ id: `act-${Date.now()}`, message: `Item assigned to dispatch batch ${batchId}.`, at: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), source: 'Inventory Officer' }, ...state.activity] }; emit() },
  saveNote(date: string, note: string) { state = { ...state, notes: { ...state.notes, [date]: note } }; emit() },
}
export function resetInventoryOps() { state = seed; emit() }
