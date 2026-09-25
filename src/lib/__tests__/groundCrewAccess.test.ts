import { describe, expect, it } from 'vitest'
import { deriveGroundCrewAccessLevel, type ManningAssignment } from '../manning'

describe('deriveGroundCrewAccessLevel', () => {
  const today = '2026-09-25'
  const yesterday = '2026-09-24'

  const sampleAssignmentToday: ManningAssignment = {
    id: 'assign-today-1',
    work_date: today,
    event_name: 'Louvre Gala Event',
    venue: 'The Grand Ballroom',
    deployment_ref: 'EVT-2026-081',
    lead_name: 'Lucia Mendes',
    lead_email: 'lucia@lumiere.com',
    IsShiftLead: true,
    member_names: ['Noah Williams', 'Sofia Reyes'],
    sub_role: 'Warehouse deployment lead',
    inherited_from: null,
    notes: null,
    status: 'Active',
    created_by: 'Test',
    created_at: new Date().toISOString(),
  }

  const sampleAssignmentYesterday: ManningAssignment = {
    id: 'assign-yesterday-1',
    work_date: yesterday,
    event_name: 'Harbor Lights Event',
    venue: 'North Loading Hall',
    deployment_ref: 'EVT-2026-094',
    lead_name: 'Lucia Mendes',
    lead_email: 'lucia@lumiere.com',
    IsShiftLead: true,
    member_names: ['Daniel Price'],
    sub_role: 'Outbound lead',
    inherited_from: null,
    notes: null,
    status: 'Active',
    created_by: 'Test',
    created_at: new Date().toISOString(),
  }

  it('Case A: Event Admin (groundCrewSubRole === "EventAdmin") resolves to Event Admin', () => {
    const result = deriveGroundCrewAccessLevel({
      groundCrewSubRole: 'EventAdmin',
      adminEmail: 'eventadmin@lumiere.com',
      manningAssignments: [sampleAssignmentToday],
      todayIso: today,
    })
    expect(result).toBe('Event Admin')
  })

  it('Case B: Shift Lead on today assignment (IsShiftLead === true on active assignment for today) resolves to Shift Lead', () => {
    const result = deriveGroundCrewAccessLevel({
      groundCrewSubRole: 'Field',
      adminEmail: 'lucia@lumiere.com',
      manningAssignments: [sampleAssignmentToday],
      todayIso: today,
    })
    expect(result).toBe('Shift Lead')
  })

  it('Case C: Ground Crew member with no lead flag (IsShiftLead === false / assigned as member) resolves to Ground Crew / Member', () => {
    const memberAssignment: ManningAssignment = {
      ...sampleAssignmentToday,
      lead_email: 'otherlead@lumiere.com',
      IsShiftLead: false,
    }
    const result = deriveGroundCrewAccessLevel({
      groundCrewSubRole: 'Field',
      adminEmail: 'noah@lumiere.com',
      manningAssignments: [memberAssignment],
      todayIso: today,
    })
    expect(result).toBe('Ground Crew / Member')
  })

  it('Case D: Shift Lead yesterday but NOT today resolves to Ground Crew / Member', () => {
    const result = deriveGroundCrewAccessLevel({
      groundCrewSubRole: 'Field',
      adminEmail: 'lucia@lumiere.com',
      manningAssignments: [sampleAssignmentYesterday],
      todayIso: today,
    })
    expect(result).toBe('Ground Crew / Member')
  })
})
