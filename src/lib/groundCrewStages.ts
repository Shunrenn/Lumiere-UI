import type { DispatchBatch } from '@/lib/event-detail'

export const GROUND_CREW_STAGES = ['Dispatch Release', 'Venue Arrival', 'Egress Release', 'Warehouse Return'] as const
export type GroundCrewStage = (typeof GROUND_CREW_STAGES)[number]
export type StageState = { stage: GroundCrewStage; status: 'done' | 'current' | 'locked' | 'unavailable'; detail?: string }

let batchesByEvent = new Map<string, DispatchBatch[]>()
export function registerGroundCrewStageData(eventId: string, batches: DispatchBatch[]) { batchesByEvent.set(eventId, batches) }

function stageForBatch(batch: DispatchBatch): { index: number; stage: GroundCrewStage; done: boolean } | null {
  const status = batch.stage
  if (batch.direction === 'return') {
    if (status === 'Returned') return { index: 4, stage: 'Warehouse Return', done: true }
    if (status === 'Planned' || status === 'Loaded') return { index: 2, stage: 'Egress Release', done: false }
    if (status === 'In Transit' || status === 'Delivered') return { index: 3, stage: 'Warehouse Return', done: false }
  } else {
    if (status === 'Planned' || status === 'Loaded') return { index: 0, stage: 'Dispatch Release', done: false }
    if (status === 'In Transit') return { index: 1, stage: 'Venue Arrival', done: false }
    if (status === 'Delivered') return { index: 2, stage: 'Egress Release', done: false }
    if (status === 'Returned') return { index: 4, stage: 'Warehouse Return', done: true }
  }
  console.warn('[groundCrewStages] Unknown batch status:', status)
  return null
}

export function getStageStates(eventId: string): StageState[] {
  const batches = batchesByEvent.get(eventId) ?? []
  if (!batches.length) return GROUND_CREW_STAGES.map((stage) => ({ stage, status: 'unavailable', detail: 'Not available yet' }))
  const mapped = batches.map(stageForBatch)
  if (mapped.some((value) => value === null)) return GROUND_CREW_STAGES.map((stage) => ({ stage, status: 'unavailable' }))
  const currentIndex = Math.min(...mapped.map((value) => value!.index).filter((index) => index < 4))
  return GROUND_CREW_STAGES.map((stage, index) => ({
    stage,
    status: mapped.every((value) => value!.index >= index + 1) ? 'done' : index === currentIndex ? 'current' : index > currentIndex ? 'locked' : 'unavailable',
    detail: index > currentIndex ? `Waiting for ${GROUND_CREW_STAGES[index - 1]}` : undefined,
  }))
}

export async function confirmStage(_eventId: string, _stage: GroundCrewStage): Promise<{ success: false; error: string }> {
  return { success: false, error: 'Not available yet' }
}

export function stageProgressFor(batches: DispatchBatch[]) {
  registerGroundCrewStageData('__preview__', batches)
  const states = getStageStates('__preview__')
  return { states, complete: batches.length > 0 && batches.every((batch) => batch.stage === 'Returned') }
}
