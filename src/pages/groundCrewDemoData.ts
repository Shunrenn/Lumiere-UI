import type { DispatchBatch } from '@/lib/event-detail'
import type { MyManningAssignmentDto } from '@/features/manning/api/manningApi'

export type GroundCrewDemoCase = 'none' | 'lead' | 'member' | 'warehouse' | 'mixed' | 'damage'

export interface GroundCrewDemoData {
  assignments: MyManningAssignmentDto[]
  events: Array<{ id: string; name: string; date: string; venue: string; status: 'Current' | 'Upcoming' | 'Completed'; editable: boolean; phase: null; items: never[] }>
  batches: Map<string, DispatchBatch[]>
  declarations: any[]
  subRole: 'Warehouse' | 'Field'
}

const atDate = (offset: number) => {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return date.toISOString().slice(0, 10)
}

const assignment = (eventId: string, eventName: string, date: string, isLead: boolean, subRole: 'Warehouse' | 'Field'): MyManningAssignmentDto => ({
  assignmentId: `demo-assignment-${eventId}`,
  eventId,
  eventName,
  shiftDate: `${date}T08:00:00Z`,
  shiftStartTime: '08:00:00',
  shiftEndTime: '18:00:00',
  workArea: subRole === 'Warehouse' ? 'Warehouse' : 'Venue',
  taskTitle: subRole === 'Warehouse' ? 'Warehouse operations' : 'Event operations',
  taskDescription: 'Development demo assignment',
  assetId: null,
  assetName: null,
  productionTaskId: null,
  taskPoolId: null,
  taskPoolName: null,
  taskPoolItemId: null,
  manningRequirementId: null,
  assignedRole: subRole === 'Warehouse' ? 'Warehouse Crew' : 'Field Crew',
  isLead,
  executionStatus: 'Assigned',
})

const batch = (id: string, stage: DispatchBatch['stage']): DispatchBatch => ({
  id: `demo-batch-${id}`,
  vehicleType: 'Van',
  plateNumber: 'DEMO-001',
  driverName: 'Demo Driver',
  direction: 'outbound',
  stage,
  handoffNote: 'Development demo batch',
  crew: [],
  reconciliation: [{ id: `demo-item-${id}`, itemName: 'Linen centerpiece', planned: 12, actual: stage === 'Returned' ? 12 : 0, status: stage === 'Returned' ? 'Matched' : 'Pahabol', justification: '' }],
  stalled: false,
  stalledReason: '',
})

export function getGroundCrewDemoData(caseName: GroundCrewDemoCase): GroundCrewDemoData {
  const role = caseName === 'warehouse' ? 'Warehouse' : 'Field'
  const lead = caseName !== 'member'
  const todayId = 'demo-today-event'
  const futureId = 'demo-future-event'
  const pastId = 'demo-past-event'
  const today = { id: todayId, name: 'Test Event', date: atDate(0), venue: 'Test Venue', status: 'Current' as const, editable: true, phase: null, items: [] as never[] }
  const events = caseName === 'none'
    ? []
    : [today, { id: futureId, name: 'Future Event', date: atDate(7), venue: 'Future Venue', status: 'Upcoming' as const, editable: false, phase: null, items: [] as never[] }, { id: pastId, name: 'Past Event', date: atDate(-7), venue: 'Past Venue', status: 'Completed' as const, editable: false, phase: null, items: [] as never[] }]
  const assignments = events.map((event) => assignment(event.id, event.name, event.date, lead, role))
  const batches = new Map<string, DispatchBatch[]>()
  if (caseName === 'mixed') batches.set(todayId, [batch('planned', 'Planned'), batch('transit', 'In Transit')])
  if (caseName === 'damage') batches.set(todayId, [batch('damage', 'Delivered')])
  if (caseName === 'lead' || caseName === 'member' || caseName === 'warehouse') batches.set(todayId, [batch('today', 'Delivered')])
  const declarations = caseName === 'damage' ? [{ id: 'demo-report', eventId: todayId, eventName: 'Test Event', item: 'Linen centerpiece', status: 'Reported', submittedAt: new Date().toISOString() }] : []
  return { assignments, events, batches, declarations, subRole: role }
}
