import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

export type TaskStatus = 'Assigned' | 'In Progress' | 'Submitted' | 'Approved' | 'Rejected'
export type EventStatus = 'Upcoming' | 'In Prep' | 'Completed'
export type ProductionStage = 'Unprepped' | 'Prepping' | 'Awaiting Approval' | 'Ready'

export interface WarehouseItem {
  id: string
  name: string
  sku: string
  qty: number
  color: string
  /** Present only when a reference photo exists for the item. */
  imageUrl?: string
  /** True when the item must be created/sourced rather than pulled from existing stock. */
  needsCreation: boolean
}

export interface WarehouseEvent {
  id: string
  name: string
  date: string
  venue: string
  status: EventStatus
  items: WarehouseItem[]
}

export interface WarehouseTask {
  id: string
  eventId: string
  itemId: string
  title: string
  description: string
  assignees: string[]
  deadline: string // ISO date (yyyy-mm-dd)
  deadlineTime: string // HH:mm
  status: TaskStatus
}

export interface CrewMember {
  id: string
  name: string
  role: string
  available: boolean
}

export interface ActivityEntry {
  id: string
  message: string
  at: string
  kind: 'task' | 'approval' | 'note' | 'system'
}

export interface NotificationItem {
  id: string
  label: string
  detail: string
}

export interface RawMaterial {
  id: string
  name: string
  qty: number
  unit: string
  checked: boolean
}

export interface ProductionJob {
  id: string
  eventId: string
  itemId: string
  itemName: string
  imageUrl?: string
  crew: string[]
  manCount: number
  estimatedHours: number
  stage: ProductionStage
  materials: RawMaterial[]
  notes: string
}

export const EVENTS: WarehouseEvent[] = [
  {
    id: 'evt-014',
    name: 'Founders Dinner',
    date: '2026-08-20',
    venue: 'The Peninsula Manila',
    status: 'In Prep',
    items: [
      { id: 'i1', name: 'Premium Crystal Candelabra', sku: 'LM-0012', qty: 24, color: 'Clear / Gold', imageUrl: '/images/items/candelabra.png', needsCreation: false },
      { id: 'i2', name: 'Custom Gold Table Runners', sku: 'LM-0099', qty: 20, color: 'Antique Gold', needsCreation: true },
      { id: 'i3', name: 'Velvet Drapery Panels', sku: 'LM-0211', qty: 40, color: 'Midnight Blue', needsCreation: false },
    ],
  },
  {
    id: 'evt-015',
    name: 'Maison Privée Launch',
    date: '2026-08-27',
    venue: 'BGC Arts Center',
    status: 'Upcoming',
    items: [
      { id: 'i4', name: 'Round Banquet Tables', sku: 'LM-0103', qty: 25, color: 'Walnut', needsCreation: false },
      { id: 'i5', name: 'Brass Plinths', sku: 'LM-0304', qty: 12, color: 'Brushed Brass', imageUrl: '/images/items/brass-plinths.png', needsCreation: false },
    ],
  },
  {
    id: 'evt-016',
    name: 'Lumière Summer Gala',
    date: '2026-09-05',
    venue: 'Shangri-La Fort',
    status: 'Upcoming',
    items: [
      { id: 'i6', name: 'Linen Lounge Sofas', sku: 'LM-0411', qty: 18, color: 'Natural Linen', needsCreation: false },
      { id: 'i7', name: 'Frosted Glass Chargers', sku: 'LM-0520', qty: 180, color: 'Frosted White', needsCreation: true },
    ],
  },
]

export const CREW_POOL: CrewMember[] = [
  { id: 'c1', name: 'Warehouse Member', role: 'Warehouse Member', available: true },
  { id: 'c2', name: 'Camille Laurent', role: 'Warehouse Member', available: true },
  { id: 'c3', name: 'Mateo Reyes', role: 'Warehouse Member', available: true },
  { id: 'c4', name: 'Theo Almeida', role: 'Warehouse Member', available: false },
  { id: 'c5', name: 'Priya Santos', role: 'Warehouse Member', available: true },
]

const initialTasks: WarehouseTask[] = [
  { id: 'wt-1', eventId: 'evt-014', itemId: 'i2', title: 'Sew custom gold table runners', description: 'Create 20 table runners in antique gold to match the candelabra staging plan.', assignees: ['Warehouse Member', 'Camille Laurent'], deadline: '2026-08-18', deadlineTime: '17:00', status: 'In Progress' },
  { id: 'wt-2', eventId: 'evt-014', itemId: 'i1', title: 'Polish & crate candelabras', description: 'Polish all 24 units and crate for outbound transport. Handle with gloves.', assignees: ['Mateo Reyes'], deadline: '2026-08-19', deadlineTime: '12:00', status: 'Submitted' },
  { id: 'wt-3', eventId: 'evt-015', itemId: 'i5', title: 'Refinish brass plinths', description: 'Buff and refinish 12 plinths, check for corner dents before dispatch.', assignees: ['Warehouse Member'], deadline: '2026-08-25', deadlineTime: '15:00', status: 'Assigned' },
]

const initialActivity: ActivityEntry[] = [
  { id: 'a1', message: 'Mateo Reyes submitted "Polish & crate candelabras" for approval.', at: 'Aug 19, 2026 · 09:10', kind: 'task' },
  { id: 'a2', message: 'Lead approved "Verify chair count" for Founders Dinner.', at: 'Aug 18, 2026 · 16:40', kind: 'approval' },
]

export const LEAD_NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', label: 'Meeting', detail: 'Production sync · Aug 19, 15:00, Lumière Depot' },
  { id: 'n2', label: 'Approval needed', detail: '"Polish & crate candelabras" is awaiting your review.' },
  { id: 'n3', label: 'Reminder', detail: 'Confirm crew availability for Maison Privée before Friday.' },
]

export const MEMBER_NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', label: 'Meeting', detail: 'Production sync · Aug 19, 15:00, Lumière Depot' },
  { id: 'n2', label: 'Assignment', detail: 'You were assigned "Refinish brass plinths."' },
  { id: 'n3', label: 'Reminder', detail: 'Table runners are due tomorrow at 17:00.' },
]

export const PRODUCTION_NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', label: 'Meeting', detail: 'Production sync · Aug 19, 15:00, Lumière Depot' },
  { id: 'n2', label: 'Awaiting approval', detail: '"Custom Gold Table Runners" is ready for your review.' },
  { id: 'n3', label: 'Reminder', detail: 'Brass plinth refinish crew reports low on wood stain.' },
]

const initialProductionJobs: ProductionJob[] = [
  {
    id: 'pj-1',
    eventId: 'evt-014',
    itemId: 'i2',
    itemName: 'Custom Gold Table Runners',
    crew: ['Warehouse Member', 'Camille Laurent'],
    manCount: 2,
    estimatedHours: 14,
    stage: 'Awaiting Approval',
    notes: 'All 20 runners sewn and pressed. Gold trim matched to the candelabra staging sample.',
    materials: [
      { id: 'm1', name: 'Fabric — velvet backdrop', qty: 22, unit: 'meters', checked: true },
      { id: 'm2', name: 'Antique gold trim', qty: 20, unit: 'meters', checked: true },
    ],
  },
  {
    id: 'pj-2',
    eventId: 'evt-014',
    itemId: 'i1',
    itemName: 'Premium Crystal Candelabra',
    imageUrl: '/images/items/candelabra.png',
    crew: ['Mateo Reyes'],
    manCount: 1,
    estimatedHours: 6,
    stage: 'Prepping',
    notes: '',
    materials: [
      { id: 'm3', name: 'Polishing cloth', qty: 24, unit: 'pcs', checked: true },
      { id: 'm4', name: 'Crystal polish', qty: 2, unit: 'bottles', checked: false },
    ],
  },
  {
    id: 'pj-3',
    eventId: 'evt-015',
    itemId: 'i5',
    itemName: 'Brass Plinths',
    imageUrl: '/images/items/brass-plinths.png',
    crew: ['Warehouse Member'],
    manCount: 1,
    estimatedHours: 9,
    stage: 'Unprepped',
    notes: '',
    materials: [
      { id: 'm5', name: 'Brass polish', qty: 3, unit: 'bottles', checked: false },
      { id: 'm6', name: 'Wood stain', qty: 1, unit: 'liters', checked: false },
    ],
  },
  {
    id: 'pj-4',
    eventId: 'evt-016',
    itemId: 'i7',
    itemName: 'Frosted Glass Chargers',
    crew: ['Priya Santos'],
    manCount: 1,
    estimatedHours: 20,
    stage: 'Unprepped',
    notes: '',
    materials: [
      { id: 'm7', name: 'Glass etching kit', qty: 4, unit: 'kits', checked: false },
      { id: 'm8', name: 'Foam board', qty: 8, unit: 'sheets', checked: false },
    ],
  },
]

type WarehouseContext = {
  events: WarehouseEvent[]
  tasks: WarehouseTask[]
  crew: CrewMember[]
  activity: ActivityEntry[]
  productionJobs: ProductionJob[]
  addTask: (task: Omit<WarehouseTask, 'id' | 'status'>) => void
  updateTaskStatus: (id: string, status: TaskStatus, note?: string) => void
  logActivity: (message: string, kind: ActivityEntry['kind']) => void
  moveProductionJob: (id: string, stage: ProductionStage) => void
  toggleProductionMaterial: (jobId: string, materialId: string) => void
  updateProductionNotes: (jobId: string, notes: string) => void
}

const WarehouseState = createContext<WarehouseContext | null>(null)

export function WarehouseProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useState(initialTasks)
  const [activity, setActivity] = useState(initialActivity)
  const [productionJobs, setProductionJobs] = useState(initialProductionJobs)

  const logActivity = (message: string, kind: ActivityEntry['kind']) => {
    setActivity((current) => [{ id: `act-${Date.now()}`, message, at: new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }), kind }, ...current])
  }

  const value = useMemo<WarehouseContext>(
    () => ({
      events: EVENTS,
      tasks,
      crew: CREW_POOL,
      activity,
      productionJobs,
      addTask: (task) => {
        setTasks((current) => [{ ...task, id: `wt-${Date.now()}`, status: 'Assigned' }, ...current])
        logActivity(`New task "${task.title}" assigned to ${task.assignees.join(', ')}.`, 'task')
      },
      updateTaskStatus: (id, status, note) => {
        setTasks((current) => current.map((task) => (task.id === id ? { ...task, status } : task)))
        const task = tasks.find((t) => t.id === id)
        if (!task) return
        if (status === 'Submitted') logActivity(`${task.assignees.join(', ')} submitted "${task.title}" for approval.${note ? ` Note: ${note}` : ''}`, 'task')
        else if (status === 'Approved') logActivity(`Lead approved "${task.title}".`, 'approval')
        else if (status === 'Rejected') logActivity(`Lead sent "${task.title}" back for rework.${note ? ` Note: ${note}` : ''}`, 'approval')
      },
      logActivity,
      moveProductionJob: (id, stage) => {
        setProductionJobs((current) => current.map((job) => (job.id === id ? { ...job, stage } : job)))
        const job = productionJobs.find((j) => j.id === id)
        if (!job) return
        if (stage === 'Awaiting Approval') logActivity(`"${job.itemName}" submitted for approval.`, 'task')
        else if (stage === 'Ready') logActivity(`"${job.itemName}" approved and ready for dispatch.`, 'approval')
        else if (stage === 'Prepping') logActivity(`"${job.itemName}" sent back for revision.`, 'approval')
      },
      toggleProductionMaterial: (jobId, materialId) => {
        setProductionJobs((current) => current.map((job) => job.id === jobId ? { ...job, materials: job.materials.map((m) => m.id === materialId ? { ...m, checked: !m.checked } : m) } : job))
      },
      updateProductionNotes: (jobId, notes) => {
        setProductionJobs((current) => current.map((job) => (job.id === jobId ? { ...job, notes } : job)))
      },
    }),
    [tasks, activity, productionJobs],
  )

  return <WarehouseState.Provider value={value}>{children}</WarehouseState.Provider>
}

export function useWarehouse() {
  const ctx = useContext(WarehouseState)
  if (!ctx) throw new Error('useWarehouse must be used within WarehouseProvider')
  return ctx
}
