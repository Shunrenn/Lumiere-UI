// Shared crew roster — the single source of truth for crew manning and
// auto-allocated event deployments. Consumed by the Warehouse "Crew Roster"
// console and the Ground Crew field app's Schedule tab so both stay in sync.

export type CrewStatus = 'Available' | 'Assigned' | 'On Leave'

// An auto-generated event allocation pushed to a crew member by the deployment scheduler.
export interface Allocation {
  event: string
  venue: string
  date: string
  task: string
}

export interface CrewMember {
  id: string
  name: string
  employeeId: string
  // Login email — links the roster record to the authenticated field account.
  email: string
  role: string
  status: CrewStatus
  // Weekly manning (Mon–Sun): 'on' working, 'off' resting, 'leave' on leave.
  week: ('on' | 'off' | 'leave')[]
  // Live event allocation, or null when the member is unassigned / on leave.
  allocation: Allocation | null
}

export const CREW: CrewMember[] = [
  {
    id: 'c-0',
    name: 'Mateo Reyes',
    employeeId: 'GC-2041',
    email: 'crew@lumiere.com',
    role: 'Event Field',
    status: 'Assigned',
    week: ['on', 'on', 'on', 'on', 'on', 'on', 'off'],
    allocation: {
      event: 'Aurelio Wedding · EVT-2026-014',
      venue: 'The Peninsula Manila',
      date: '20 Jun 2026',
      task: 'Dispatch & Egress Chain of Custody',
    },
  },
  {
    id: 'c-1',
    name: 'Eleanor Vance',
    employeeId: 'EMP-9021',
    email: 'eleanor.vance@lumiere.com',
    role: 'Event Field',
    status: 'Assigned',
    week: ['on', 'on', 'on', 'on', 'off', 'off', 'off'],
    allocation: {
      event: 'Spring Gala 2026',
      venue: 'The Peninsula Manila',
      date: '28 May 2026',
      task: 'Scenic Backdrop Installation',
    },
  },
  {
    id: 'c-2',
    name: 'Sebastian Cross',
    employeeId: 'EMP-8842',
    email: 'sebastian.cross@lumiere.com',
    role: 'Event Field',
    status: 'Assigned',
    week: ['on', 'on', 'on', 'on', 'on', 'on', 'off'],
    allocation: {
      event: 'Fashion Week Gala',
      venue: 'Chateau Grand Ballroom',
      date: '28 May 2026',
      task: 'Logistics & Fleet Coordination',
    },
  },
  {
    id: 'c-3',
    name: 'Isolde Thorne',
    employeeId: 'EMP-7721',
    email: 'isolde.thorne@lumiere.com',
    role: 'Warehouse Field',
    status: 'On Leave',
    week: ['leave', 'leave', 'leave', 'off', 'off', 'off', 'off'],
    allocation: null,
  },
  {
    id: 'c-4',
    name: 'Marcus Sterling',
    employeeId: 'EMP-4521',
    email: 'marcus.sterling@lumiere.com',
    role: 'Event Field',
    status: 'Assigned',
    week: ['on', 'on', 'on', 'on', 'off', 'off', 'off'],
    allocation: {
      event: 'Private Exhibit',
      venue: 'Shangri-La Horizon Room',
      date: '30 May 2026',
      task: 'Lighting Rig Setup & Calibration',
    },
  },
  {
    id: 'c-5',
    name: 'Camille Laurent',
    employeeId: 'EMP-0007',
    email: 'camille.laurent@lumiere.com',
    role: 'Warehouse Field',
    status: 'Assigned',
    week: ['on', 'on', 'on', 'on', 'on', 'off', 'off'],
    allocation: {
      event: 'Aurelio Wedding',
      venue: 'Ritz-Carlton Residency',
      date: '26 May 2026',
      task: 'Inventory Dispatch Oversight',
    },
  },
  {
    id: 'c-6',
    name: 'Theo Almeida',
    employeeId: 'EMP-3310',
    email: 'theo.almeida@lumiere.com',
    role: 'Event Field',
    status: 'Available',
    week: ['on', 'on', 'off', 'off', 'on', 'on', 'off'],
    allocation: {
      event: 'Horizon Product Launch',
      venue: 'Grand Hyatt Skyhall',
      date: '02 Jun 2026',
      task: 'Ambient Lighting Pre-Stage',
    },
  },
]

// Resolve the roster record for an authenticated field account by email.
export function findCrewByEmail(email: string): CrewMember | null {
  if (!email) return null
  const target = email.toLowerCase()
  return CREW.find((c) => c.email.toLowerCase() === target) ?? null
}

// Load and sync the roster from the Supabase database
export async function loadRosterFromDatabase() {
  try {
    const { supabase } = await import('./supabase')

    // Fetch crew from database with their event allocations
    const { data: crewData, error } = await supabase
      .from('crew_roster')
      .select(
        `
        id,
        employee_id,
        name,
        role,
        status,
        week_mon,
        week_tue,
        week_wed,
        week_thu,
        week_fri,
        week_sat,
        week_sun,
        account_id,
        portal_accounts (
          email
        ),
        allocations (
          event:event_id (
            title,
            venue,
            date,
            task
          )
        )
      `,
      )
      .order('employee_id')

    if (error) {
      console.error('[v0] Failed to load roster from database:', error)
      return
    }

    if (!crewData) return

    // Transform database records into CrewMember format
    const loaded: CrewMember[] = crewData.map((row: any) => ({
      id: row.id,
      name: row.name,
      employeeId: row.employee_id,
      email: row.portal_accounts?.[0]?.email || '',
      role: row.role,
      status: row.status as CrewStatus,
      week: [
        row.week_mon === 1 ? 'on' : row.week_mon === 2 ? 'leave' : 'off',
        row.week_tue === 1 ? 'on' : row.week_tue === 2 ? 'leave' : 'off',
        row.week_wed === 1 ? 'on' : row.week_wed === 2 ? 'leave' : 'off',
        row.week_thu === 1 ? 'on' : row.week_thu === 2 ? 'leave' : 'off',
        row.week_fri === 1 ? 'on' : row.week_fri === 2 ? 'leave' : 'off',
        row.week_sat === 1 ? 'on' : row.week_sat === 2 ? 'leave' : 'off',
        row.week_sun === 1 ? 'on' : row.week_sun === 2 ? 'leave' : 'off',
      ] as ('on' | 'off' | 'leave')[],
      allocation: row.allocations?.[0]?.event
        ? {
            event: row.allocations[0].event.title,
            venue: row.allocations[0].event.venue,
            date: row.allocations[0].event.date,
            task: row.allocations[0].event.task,
          }
        : null,
    }))

    // Update the in-memory CREW
    CREW.length = 0
    CREW.push(...loaded)
  } catch (err) {
    console.error('[v0] Error loading roster from database:', err)
  }
}
