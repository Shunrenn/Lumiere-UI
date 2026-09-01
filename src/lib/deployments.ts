import { useSyncExternalStore } from 'react'

export type DeploymentStatus = 'In Progress' | 'Awaiting Setup' | 'Completed'

export interface DeploymentRecord {
  id: string
  date: string
  time: string
  deploymentId: string
  event: string
  venue: string
  task: string
  status: DeploymentStatus
  progress: number
  crewLeads: string[]
  staffMembers: string[]
  vehicle: string
}

const listeners = new Set<() => void>()
const deploymentStoreKey = '__warehouse_deployment_records__'
type DeploymentGlobal = typeof globalThis & { [deploymentStoreKey]?: DeploymentRecord[] }
const globalStore = globalThis as DeploymentGlobal
let records: DeploymentRecord[] = globalStore[deploymentStoreKey] ?? []
let hydrated = false

function publish() {
  globalStore[deploymentStoreKey] = records
  listeners.forEach((listener) => listener())
}

export function useDeployments() {
  if (!hydrated && typeof window !== 'undefined') {
    hydrated = true
    fetch('/api/deployments').then((response) => response.ok ? response.json() : []).then((remote: DeploymentRecord[]) => {
      if (remote.length > 0) {
        records = remote
        publish()
      }
    }).catch(() => undefined)
  }

  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => records,
    () => records,
  )
}

export function addDeployment(record: DeploymentRecord) {
  records = [record, ...records.filter((existing) => existing.deploymentId !== record.deploymentId)]
  publish()
  if (typeof window !== 'undefined') {
    fetch('/api/deployments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record) }).catch(() => undefined)
  }
}

export function updateDeployment(id: string, changes: Partial<DeploymentRecord>) {
  records = records.map((record) => record.id === id ? { ...record, ...changes } : record)
  publish()
}

export function getDeploymentsForEvent(eventTitle?: string) {
  const normalized = eventTitle?.trim().toLowerCase()
  if (!normalized) return []
  return records.filter((record) => record.event.trim().toLowerCase() === normalized)
}

export function seedDeployments(initial: DeploymentRecord[]) {
  if (records.length === 0) {
    records = initial
    publish()
  }
}
