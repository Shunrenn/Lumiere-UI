import { describe, expect, it } from 'vitest'
import { filterItemsBySubRole, SUBROLE_DISPLAY } from '../../pages/GroundCrewPage'
import type { GroundCrewSubRoleWire } from '../types'

// Minimal item shape matching EventItem['items'][number] for test purposes
type TestItem = { id: string; name: string; sku: string; qty: number; color: string; subRoles: GroundCrewSubRoleWire[] }

const ALL_ITEMS: TestItem[] = [
  { id: 'i-1', name: 'Premium Crystal Candelabra', sku: 'LM-0012', qty: 24, color: 'Clear / Gold', subRoles: ['Warehouse', 'Field', 'Production'] },
  { id: 'i-2', name: 'Gold Chiavari Chairs',       sku: 'LM-0048', qty: 200, color: 'Antique Gold',  subRoles: ['Warehouse', 'Field'] },
  { id: 'i-3', name: 'Velvet Drapery Panels',      sku: 'LM-0211', qty: 40,  color: 'Midnight Blue', subRoles: ['Warehouse', 'Production'] },
  { id: 'i-4', name: 'Stage Platform Sections',    sku: 'LM-1104', qty: 12,  color: 'Matte Black',   subRoles: ['Field'] },
  { id: 'i-5', name: 'LED Par Can Lights',         sku: 'LM-2201', qty: 48,  color: 'RGB Multi',     subRoles: ['Field', 'Production'] },
  { id: 'i-6', name: 'Table Linen Rolls',          sku: 'LM-0520', qty: 80,  color: 'Ivory White',   subRoles: ['Inventory', 'Warehouse'] },
  { id: 'i-7', name: 'Centerpiece Floral Frames',  sku: 'LM-0715', qty: 30,  color: 'Brushed Gold',  subRoles: ['Inventory'] },
  { id: 'i-8', name: 'Truss Tower Sections',       sku: 'LM-3301', qty: 8,   color: 'Aluminum',      subRoles: ['Production'] },
  { id: 'i-9', name: 'Pipe & Drape Kits',          sku: 'LM-3402', qty: 6,   color: 'Black / Chrome', subRoles: ['Production', 'Warehouse'] },
]

describe('filterItemsBySubRole', () => {
  it('Warehouse crew sees warehouse-tagged items only', () => {
    const result = filterItemsBySubRole(ALL_ITEMS, 'Warehouse')
    const names = result.map((i) => i.name)
    expect(names).toContain('Premium Crystal Candelabra')  // Warehouse ✓
    expect(names).toContain('Gold Chiavari Chairs')         // Warehouse ✓
    expect(names).toContain('Velvet Drapery Panels')        // Warehouse ✓
    expect(names).toContain('Table Linen Rolls')            // Warehouse ✓
    expect(names).toContain('Pipe & Drape Kits')            // Warehouse ✓
    // Items NOT tagged for Warehouse
    expect(names).not.toContain('Stage Platform Sections')  // Field only
    expect(names).not.toContain('LED Par Can Lights')        // Field, Production
    expect(names).not.toContain('Centerpiece Floral Frames') // Inventory only
    expect(names).not.toContain('Truss Tower Sections')      // Production only
  })

  it('Field crew sees field-tagged items only', () => {
    const result = filterItemsBySubRole(ALL_ITEMS, 'Field')
    const names = result.map((i) => i.name)
    expect(names).toContain('Premium Crystal Candelabra')
    expect(names).toContain('Gold Chiavari Chairs')
    expect(names).toContain('Stage Platform Sections')
    expect(names).toContain('LED Par Can Lights')
    // Not field
    expect(names).not.toContain('Centerpiece Floral Frames')
    expect(names).not.toContain('Truss Tower Sections')
    expect(names).not.toContain('Table Linen Rolls')
  })

  it('Inventory crew sees inventory-tagged items only', () => {
    const result = filterItemsBySubRole(ALL_ITEMS, 'Inventory')
    const names = result.map((i) => i.name)
    expect(names).toContain('Table Linen Rolls')
    expect(names).toContain('Centerpiece Floral Frames')
    // Not inventory
    expect(names).not.toContain('Stage Platform Sections')
    expect(names).not.toContain('Velvet Drapery Panels')
    expect(names).not.toContain('Truss Tower Sections')
  })

  it('Production crew sees production-tagged items only', () => {
    const result = filterItemsBySubRole(ALL_ITEMS, 'Production')
    const names = result.map((i) => i.name)
    expect(names).toContain('Premium Crystal Candelabra')
    expect(names).toContain('LED Par Can Lights')
    expect(names).toContain('Velvet Drapery Panels')
    expect(names).toContain('Truss Tower Sections')
    expect(names).toContain('Pipe & Drape Kits')
    // Not production
    expect(names).not.toContain('Gold Chiavari Chairs')
    expect(names).not.toContain('Centerpiece Floral Frames')
    expect(names).not.toContain('Table Linen Rolls')
  })

  it('EventAdmin sees all items (oversight — no filter applied)', () => {
    const result = filterItemsBySubRole(ALL_ITEMS, 'EventAdmin')
    expect(result).toHaveLength(ALL_ITEMS.length)
  })

  it('undefined sub-role falls back to all items', () => {
    const result = filterItemsBySubRole(ALL_ITEMS, undefined)
    expect(result).toHaveLength(ALL_ITEMS.length)
  })

  it('each sub-role gets at least one item (no sub-role is left with empty checklist)', () => {
    const subRoles: GroundCrewSubRoleWire[] = ['Warehouse', 'Field', 'Inventory', 'Production']
    for (const subRole of subRoles) {
      const result = filterItemsBySubRole(ALL_ITEMS, subRole)
      expect(result.length, `Expected ${subRole} to see at least 1 item`).toBeGreaterThan(0)
    }
  })
})

describe('SUBROLE_DISPLAY', () => {
  it('maps every GroundCrewSubRoleWire to a non-empty display name', () => {
    const subRoles: GroundCrewSubRoleWire[] = ['Warehouse', 'Field', 'Inventory', 'Production', 'EventAdmin']
    for (const subRole of subRoles) {
      expect(SUBROLE_DISPLAY[subRole], `Missing display name for ${subRole}`).toBeTruthy()
    }
  })
})
