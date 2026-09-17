export type SecurityEventStatus = 'Success' | 'Failed' | 'Blocked' | 'Warning'
export type SecurityEventAccount = 'Admin' | 'Executive' | 'Event Planner' | 'Warehouse Ops' | 'Ground Crew'

export interface SecurityEvent {
  id: string
  timestamp: string
  date: string
  logId: string
  employeeId: string
  role: SecurityEventAccount
  action: string
  status: SecurityEventStatus
  ip: string
  terminal: string
  token: string
  note: string
  dotColor: string
}

export const SECURITY_EVENTS: SecurityEvent[] = []

export type SecurityEventType = SecurityEvent['action']

export const SECURITY_EVENT_TYPES = SECURITY_EVENTS.map((event) => event.action)

export default SECURITY_EVENTS
