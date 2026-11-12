import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { Shell } from '@/app/Shell'
import { Spinner } from '@/components/common'

const MissionControl = lazy(() => import('@/features/mission-control/MissionControlPage'))
const Explorer = lazy(() => import('@/features/explorer/ExplorerPage'))
const Terrain = lazy(() => import('@/features/terrain/TerrainPage'))
const Landing = lazy(() => import('@/features/landing/LandingPage'))
const Science = lazy(() => import('@/features/science/SciencePage'))
const Resources = lazy(() => import('@/features/resources/ResourcesPage'))
const Environment = lazy(() => import('@/features/environment/EnvironmentPage'))
const Routes = lazy(() => import('@/features/routes/RoutesPage'))
const Survival = lazy(() => import('@/features/survival/SurvivalPage'))
const Assessment = lazy(() => import('@/features/assessment/AssessmentPage'))
const Methodology = lazy(() => import('@/features/methodology/MethodologyPage'))

const wrap = (el: React.ReactNode) => (
  <Suspense fallback={<div className="absolute inset-0 flex items-center justify-center text-fg-muted text-[12px] gap-2"><Spinner /> loading module…</div>}>{el}</Suspense>
)

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Shell />,
    children: [
      { index: true, element: wrap(<MissionControl />) },
      { path: 'explorer', element: wrap(<Explorer />) },
      { path: 'terrain', element: wrap(<Terrain />) },
      { path: 'landing', element: wrap(<Landing />) },
      { path: 'science', element: wrap(<Science />) },
      { path: 'resources', element: wrap(<Resources />) },
      { path: 'environment', element: wrap(<Environment />) },
      { path: 'routes', element: wrap(<Routes />) },
      { path: 'survival', element: wrap(<Survival />) },
      { path: 'assessment', element: wrap(<Assessment />) },
      { path: 'methodology', element: wrap(<Methodology />) },
    ],
  },
])
