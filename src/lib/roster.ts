import { fetchCrewRoster } from '@/features/roster/api'

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
    role: 'Field',
    status: 'Assigned',
    week: ['on', 'on', 'on', 'on', 'on', 'on', 'off'],
    allocation: {
      event: 'Solstice Motors Electric SUV Reveal',
      venue: 'The Peninsula Manila',
      date: '16 Sep 2026',
      task: 'Dispatch & Egress Chain of Custody',
    },
  },
  {
    id: 'c-1',
    name: 'Eleanor Vance',
    employeeId: 'EMP-9021',
    email: 'eleanor.vance@lumiere.com',
    role: 'Field',
    status: 'Assigned',
    week: ['on', 'on', 'on', 'on', 'off', 'off', 'off'],
    allocation: {
      event: 'Aura Luxe Autumn Gala 2026',
      venue: 'The Peninsula Manila',
      date: '20 Sep 2026',
      task: 'Scenic Backdrop Installation',
    },
  },
  {
    id: 'c-2',
    name: 'Sebastian Cross',
    employeeId: 'EMP-8842',
    email: 'sebastian.cross@lumiere.com',
    role: 'Field',
    status: 'Assigned',
    week: ['on', 'on', 'on', 'on', 'on', 'on', 'off'],
    allocation: {
      event: 'Apex Global Financial Leaders Summit',
      venue: 'Shangri-La Fort',
      date: '24 Sep 2026',
      task: 'Logistics & Fleet Coordination',
    },
  },
  {
    id: 'c-3',
    name: 'Isolde Thorne',
    employeeId: 'EMP-7721',
    email: 'isolde.thorne@lumiere.com',
    role: 'Warehouse',
    status: 'On Leave',
    week: ['leave', 'leave', 'leave', 'off', 'off', 'off', 'off'],
    allocation: null,
  },
  {
    id: 'c-4',
    name: 'Marcus Sterling',
    employeeId: 'EMP-4521',
    email: 'marcus.sterling@lumiere.com',
    role: 'Field',
    status: 'Assigned',
    week: ['on', 'on', 'on', 'on', 'off', 'off', 'off'],
    allocation: {
      event: 'Vanguard Tech Keynote & Product Launch',
      venue: 'SMX Convention Center',
      date: '28 Sep 2026',
      task: 'Lighting Rig Setup & Calibration',
    },
  },
  {
    id: 'c-5',
    name: 'Camille Laurent',
    employeeId: 'EMP-0007',
    email: 'camille.laurent@lumiere.com',
    role: 'Warehouse',
    status: 'Assigned',
    week: ['on', 'on', 'on', 'on', 'on', 'off', 'off'],
    allocation: {
      event: 'Haute Couture Resort Collection Showcase',
      venue: 'Okura Manila',
      date: '03 Oct 2026',
      task: 'Inventory Dispatch Oversight',
    },
  },
  {
    id: 'c-6',
    name: 'Theo Almeida',
    employeeId: 'EMP-3310',
    email: 'theo.almeida@lumiere.com',
    role: 'Field',
    status: 'Available',
    week: ['on', 'on', 'off', 'off', 'on', 'on', 'off'],
    allocation: {
      event: 'Celestial Horizon Presidential Wedding',
      venue: 'Manila Hotel Tent',
      date: '08 Oct 2026',
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

function toWeekCode(value: string | undefined): 'on' | 'off' | 'leave' {
  switch (value?.toLowerCase()) {
    case 'on':
    case 'assigned':
      return 'on'
    case 'leave':
    case 'on leave':
      return 'leave'
    default:
      return 'off'
  }
}

// Load roster state only through the authenticated API. The server scopes a
// Ground Crew account to its own record and returns the complete roster only
// to operational managers.
export async function loadRosterFromDatabase() {
  try {
    const records = await fetchCrewRoster()
    const loaded: CrewMember[] = records.map((row) => {
      return {
        id: row.id,
        name: row.name,
        employeeId: row.employeeId,
        email: row.email,
        role: row.role,
        status: row.status as CrewStatus,
        week: [
          toWeekCode(row.weekMon),
          toWeekCode(row.weekTue),
          toWeekCode(row.weekWed),
          toWeekCode(row.weekThu),
          toWeekCode(row.weekFri),
          toWeekCode(row.weekSat),
          toWeekCode(row.weekSun),
        ] as ('on' | 'off' | 'leave')[],
        allocation: null,
      }
    })

    // An empty authenticated response is authoritative; do not retain preset staff.
    CREW.length = 0
    CREW.push(...loaded)
  } catch (err) {
    console.error('Failed to load roster from API:', err)
  }
}
