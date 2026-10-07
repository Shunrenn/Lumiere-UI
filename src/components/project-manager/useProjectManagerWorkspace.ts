import { useEffect, useState } from 'react'
import { fetchCanvasLayoutApi } from '@/lib/canvasApi'
import { fetchReservationsForEvent } from '@/lib/reservationsApi'
import { fetchManningForEvent } from '@/lib/manningApi'
import { fetchGanttScheduleForEvent } from '@/lib/productionApi'
import { API_BASE_URL, getAuthToken } from '@/lib/apiConfig'
import type { EventResponseDto } from '@/lib/eventsApi'
import type { PMProject } from '@/lib/project-manager-sample-data'

async function fetchRegistry(id: string): Promise<EventResponseDto> {
  const token = getAuthToken()
  const response = await fetch(`${API_BASE_URL}/api/events/${encodeURIComponent(id)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {}, signal: AbortSignal.timeout(10000) })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

// Each source fails independently. Never substitute preview data for a live response.
export function useProjectManagerWorkspace(project: PMProject | null) {
  const [state, setState] = useState<{ id: string; data: Partial<PMProject>; errors: string[]; loading: boolean }>({ id: '', data: {}, errors: [], loading: false })
  useEffect(() => {
    if (!project || project.sample) return
    const id = project.id
    let disposed = false, pending = false
    setState({ id, data: {}, errors: [], loading: true })
    const load = async () => {
      if (pending) return
      pending = true
      const results = await Promise.allSettled([fetchCanvasLayoutApi(id), fetchReservationsForEvent(id), fetchManningForEvent(id), fetchGanttScheduleForEvent(id), fetchRegistry(id)])
      pending = false
      if (disposed) return
      const [canvas, assets, manning, production, registry] = results
      const data: Partial<PMProject> = {}, errors: string[] = [], blockers: string[] = []
      if (canvas.status === 'fulfilled') {
        data.planning = canvas.value ? 'Started' : 'Not started'
        data.canvas = canvas.value?.canvasStatus || 'Not started'
        data.approval = canvas.value?.approvedAt ? 'Approved' : canvas.value ? 'Not approved' : undefined
        data.planningDate = canvas.value?.submittedAt
        if (!canvas.value && project.status === 'Active') blockers.push('Planning not started')
      }
      if (assets.status === 'fulfilled') {
        data.assets = assets.value.map(asset => ({ id: asset.id, name: asset.assetName || asset.assetSku || asset.assetId, status: asset.status }))
        const issues = assets.value.filter(asset => /conflict|blocked|issue|rejected/i.test(asset.status))
        if (issues.length) blockers.push(`${issues.length} asset reservation(s) need review`)
      }
      if (manning.status === 'fulfilled') {
        data.assignedStaff = new Set(manning.value.map(member => member.userId)).size
        data.teams = [...new Set(manning.value.map(member => member.roleName).filter((role): role is string => !!role))]
        const blocked = manning.value.filter(member => member.executionStatus === 'Blocked')
        if (blocked.length) blockers.push(`${blocked.length} staffing assignment(s) blocked`)
      }
      if (production.status === 'fulfilled') {
        const tasks = production.value?.tasks || []
        data.production = tasks.length ? `${tasks.filter(task => ['Approved', 'DispatchReady', 'Completed'].includes(task.status)).length} of ${tasks.length} tasks ready` : 'Not started'
        // This is production progress only; it is not an overall project percentage.
        const delayed = tasks.filter(task => new Date(task.endDate).getTime() < Date.now() && task.progressPercentage < 100 && task.status !== 'Cancelled')
        if (delayed.length) blockers.push(`${delayed.length} production task(s) delayed`)
      }
      if (registry.status === 'fulfilled') {
        data.created = registry.value.createdAt
        data.createdBy = registry.value.createdBy
        data.updated = registry.value.updatedAt
      }
      results.forEach((result, index) => { if (result.status === 'rejected') errors.push(`${['Planning', 'Assets', 'Manning', 'Production', 'Registry'][index]} unavailable`) })
      data.blockers = [...project.blockers, ...blockers]
      setState({ id, data, errors, loading: false })
    }
    void load()
    const interval = setInterval(load, 30000)
    window.addEventListener('focus', load)
    return () => { disposed = true; clearInterval(interval); window.removeEventListener('focus', load) }
  }, [project?.id, project?.sample, project?.status, project?.venue, project?.date])
  const current = state.id === project?.id
  return { project: project ? { ...project, ...(current ? state.data : {}) } : null, errors: current ? state.errors : [], loading: !!project && !project.sample && (!current || state.loading) }
}
