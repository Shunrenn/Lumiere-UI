import { lazy, Suspense } from 'react'
import { useAuth } from '@/lib/auth'
import { ProjectManagerAccount } from '@/components/project-manager/ProjectManagerAccount'

const ProjectManagerLegacyPage = lazy(() => import('./ProjectManagerLegacyPage').then(module => ({ default: module.ProjectManagerLegacyPage })))

export function ProjectManagerDashboardPage() {
  const { currentUser } = useAuth()
  return currentUser?.role === 'Project Manager'
    ? <ProjectManagerAccount />
    : <Suspense fallback={<p>Loading projects…</p>}><ProjectManagerLegacyPage /></Suspense>
}

export default ProjectManagerDashboardPage
