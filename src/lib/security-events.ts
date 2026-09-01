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

export const SECURITY_EVENTS: SecurityEvent[] = [
  {
    id: 'sec-1', timestamp: '08:42:11', date: 'May 14, 2026', logId: 'SEC-99281', employeeId: 'LM-0006', role: 'Executive',
    action: 'Account locked after too many failed login attempts', status: 'Blocked', ip: '192.168.4.88', terminal: 'T-04', token: 'UID-5510',
    note: 'Triggered by 9 failed logins in a row.', dotColor: 'bg-rose-400',
  },
  {
    id: 'sec-2', timestamp: '08:41:03', date: 'May 14, 2026', logId: 'SEC-99280', employeeId: 'LM-0004', role: 'Event Planner',
    action: 'Login failed — wrong email or password', status: 'Failed', ip: '192.168.4.60', terminal: 'T-07', token: 'UID-4802',
    note: 'A single failed login attempt.', dotColor: 'bg-amber-400',
  },
  {
    id: 'sec-3', timestamp: '08:12:57', date: 'May 14, 2026', logId: 'SEC-99276', employeeId: 'LM-0013', role: 'Ground Crew',
    action: 'Login attempted from an unrecognized device', status: 'Warning', ip: '172.16.8.42', terminal: 'UNKNOWN', token: 'UID-6120',
    note: 'New/unknown device sign-in attempt.', dotColor: 'bg-sky-400',
  },
  {
    id: 'sec-4', timestamp: '07:55:19', date: 'May 14, 2026', logId: 'SEC-99275', employeeId: 'LM-0009', role: 'Warehouse Ops',
    action: 'User signed in successfully', status: 'Success', ip: '10.0.2.37', terminal: 'T-11', token: 'UID-5592',
    note: 'Unusual sign-in from a new device.', dotColor: 'bg-emerald-400',
  },
  {
    id: 'sec-5', timestamp: '07:31:44', date: 'May 14, 2026', logId: 'SEC-99271', employeeId: 'LM-0009', role: 'Warehouse Ops',
    action: 'Request for higher access was denied', status: 'Blocked', ip: '10.0.2.37', terminal: 'T-11', token: 'UID-5592',
    note: 'User asked for permissions beyond their role.', dotColor: 'bg-rose-400',
  },
  {
    id: 'sec-6', timestamp: '07:15:48', date: 'May 14, 2026', logId: 'SEC-99268', employeeId: 'SYS-ROOT', role: 'Admin',
    action: 'Extra access approved', status: 'Success', ip: '10.0.0.1', terminal: 'CONSOLE', token: 'SYS-KEY',
    note: 'An RBAC access request was reviewed and approved.', dotColor: 'bg-emerald-400',
  },
  {
    id: 'sec-7', timestamp: '06:58:02', date: 'May 14, 2026', logId: 'SEC-99263', employeeId: 'LM-0006', role: 'Executive',
    action: 'Password reset requested', status: 'Warning', ip: '192.168.4.88', terminal: 'T-04', token: 'UID-5510',
    note: 'User asked to reset their password.', dotColor: 'bg-amber-400',
  },
  {
    id: 'sec-8', timestamp: '06:22:35', date: 'May 14, 2026', logId: 'SEC-99257', employeeId: 'LM-0013', role: 'Ground Crew',
    action: 'Password reset completed', status: 'Success', ip: '172.16.8.5', terminal: 'MOBILE-APP', token: 'UID-6120',
    note: 'Temporary password replaced with a permanent one.', dotColor: 'bg-emerald-400',
  },
  {
    id: 'sec-9', timestamp: '05:47:10', date: 'May 14, 2026', logId: 'SEC-99249', employeeId: 'SYS-ROOT', role: 'Admin',
    action: 'Routine security check completed — no issues found', status: 'Success', ip: '10.0.0.1', terminal: 'CONSOLE', token: 'SYS-KEY',
    note: 'Scheduled system integrity/checksum check passed.', dotColor: 'bg-emerald-400',
  },
  {
    id: 'sec-10', timestamp: '05:03:26', date: 'May 14, 2026', logId: 'SEC-99241', employeeId: 'SYS-ROOT', role: 'Admin',
    action: 'Firewall status check completed — all normal', status: 'Success', ip: '10.0.0.1', terminal: 'CONSOLE', token: 'SYS-KEY',
    note: 'Scheduled firewall/edge-node health check passed.', dotColor: 'bg-sky-400',
  },
]

export type SecurityEventType = SecurityEvent['action']

export const SECURITY_EVENT_TYPES = SECURITY_EVENTS.map((event) => event.action)

export default SECURITY_EVENTS
