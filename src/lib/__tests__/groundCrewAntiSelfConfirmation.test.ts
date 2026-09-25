import { describe, expect, it } from 'vitest'
import {
  isSelfFiledDeclaration,
  isSoleEventAdminForEvent,
  type GroundCrewDeclaration,
} from '../ground-crew-declarations'
import type { ManningAssignment } from '../manning'

describe('Ground Crew Anti-Self-Confirmation & Escalation', () => {
  const currentUserId = 'user-admin-123'

  const selfFiledByUserId: GroundCrewDeclaration = {
    id: 'decl-self-1',
    eventId: 'e-1',
    eventName: 'La Nuit Dorée — Spring Gala 2026',
    item: 'Gold Chiavari Chairs',
    condition: 'Damaged',
    quantity: 2,
    description: 'Self-filed declaration test',
    submittedBy: 'Event Admin Demo',
    submittedByUserId: 'user-admin-123',
    submittedRole: 'Team Lead',
    submittedAt: new Date().toISOString(),
    status: 'Pending Event Admin',
  }

  const missingUserIdDeclaration: GroundCrewDeclaration = {
    ...selfFiledByUserId,
    id: 'decl-missing-1',
    submittedByUserId: undefined,
  }

  const nonSelfDeclaration: GroundCrewDeclaration = {
    ...selfFiledByUserId,
    id: 'decl-other-1',
    submittedByUserId: 'user-member-999',
    submittedBy: 'Sofia Reyes',
  }

  const soleAdminAssignment: ManningAssignment[] = [
    {
      id: 'assign-1',
      work_date: '2026-09-25',
      event_name: 'La Nuit Dorée — Spring Gala 2026',
      venue: 'Grand Ballroom',
      deployment_ref: 'EVT-2026-081',
      lead_name: 'Event Admin Demo',
      lead_email: 'eventadmin@lumiere.com',
      IsShiftLead: true,
      member_names: ['Noah Williams'],
      sub_role: 'EventAdmin',
      inherited_from: null,
      notes: null,
      status: 'Active',
      created_by: 'Test',
      created_at: new Date().toISOString(),
    },
  ]

  const multipleAdminAssignments: ManningAssignment[] = [
    ...soleAdminAssignment,
    {
      id: 'assign-2',
      work_date: '2026-09-25',
      event_name: 'La Nuit Dorée — Spring Gala 2026',
      venue: 'Grand Ballroom',
      deployment_ref: 'EVT-2026-081',
      lead_name: 'Secondary Admin',
      lead_email: 'secadmin@lumiere.com',
      IsShiftLead: true,
      member_names: [],
      sub_role: 'EventAdmin',
      inherited_from: null,
      notes: null,
      status: 'Active',
      created_by: 'Test',
      created_at: new Date().toISOString(),
    },
  ]

  it('Requirement 1: Self-filed declaration is detected & blocked (matches user ID strictly)', () => {
    const isSelfByUserId = isSelfFiledDeclaration(selfFiledByUserId, currentUserId)
    expect(isSelfByUserId).toBe(true)
  })

  it('Requirement 2: Missing user ID fails closed (treated as blocked / self-filed)', () => {
    const isSelfWhenDeclarationMissingId = isSelfFiledDeclaration(missingUserIdDeclaration, currentUserId)
    expect(isSelfWhenDeclarationMissingId).toBe(true)

    const isSelfWhenContextMissingId = isSelfFiledDeclaration(selfFiledByUserId, undefined)
    expect(isSelfWhenContextMissingId).toBe(true)
  })

  it('Requirement 3: Non-self declaration is allowed (different user ID)', () => {
    const isSelf = isSelfFiledDeclaration(nonSelfDeclaration, currentUserId)
    expect(isSelf).toBe(false)
  })

  it('Requirement 4: Escalation trigger condition — sole Event Admin detected', () => {
    const isSole = isSoleEventAdminForEvent('La Nuit Dorée — Spring Gala 2026', soleAdminAssignment)
    expect(isSole).toBe(true)

    const isNotSole = isSoleEventAdminForEvent('La Nuit Dorée — Spring Gala 2026', multipleAdminAssignments)
    expect(isNotSole).toBe(false)
  })
})
