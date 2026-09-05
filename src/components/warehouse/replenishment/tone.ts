import type { DeficitPriority, DeficitStatus } from '@/lib/warehouse-replenishment'
import type { VendorStatus } from '@/lib/warehouse-vendors'
import type { Tone } from '@/components/warehouse/event-detail/status-tone'

export const PRIORITY_TONE: Record<DeficitPriority, Tone> = {
  Low: 'neutral',
  Medium: 'progress',
  High: 'caution',
  Critical: 'critical',
}

export const DEFICIT_STATUS_TONE: Record<DeficitStatus, Tone> = {
  'Not Purchased': 'caution',
  'In Procurement': 'progress',
  Received: 'positive',
}

export const VENDOR_STATUS_TONE: Record<VendorStatus, Tone> = {
  Active: 'positive',
  'On Hold': 'caution',
  Inactive: 'neutral',
}
