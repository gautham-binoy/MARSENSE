import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Activity, BookOpen, Compass, Droplets, FlaskConical, Globe2, HeartPulse, Map, Mountain, Radio, Route as RouteIcon, ShieldCheck, Target } from 'lucide-react'
import { api } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { useMission } from '@/store/mission'
import { useMap } from '@/store/map'
import { cn, fmt } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Hint } from '@/components/ui/tooltip'

export const NAV = [
  { to: '/', label: 'Mission Control', icon: Globe2, end: true, step: null },
  { to: '/explorer', label: 'Mars Explorer', icon: Map, step: 1 },
  { to: '/terrain', label: 'Terrain Intelligence', icon: Mountain, step: 2 },
  { to: '/landing', label: 'Landing Sites', icon: Target, step: 3 },
  { to: '/science', label: 'Science Discovery', icon: FlaskConical, step: 4 },
  { to: '/resources', label: 'Water & Resources', icon: Droplets, step: 5 },
  { to: '/environment', label: 'Environment', icon: Radio, step: 6 },
  { to: '/routes', label: 'Route Planner', icon: RouteIcon, step: 7 },
  { to: '/survival', label: 'Survival Simulator', icon: HeartPulse, step: 8 },
  { to: '/assessment', label: 'Mission Assessment', icon: ShieldCheck, step: 9 },
  { to: '/methodology', label: 'Methodology & Data', icon: BookOpen, step: null },
]

export function Shell() {
  const { data: health, error } = useQuery('health', api.health, { staleMs: 30_000 })
  const name = useMission((s) => s.name)
  const base = useMission((s) => s.base)
  const route = useMission((s) => s.route)
  const targets = useMission((s) => s.targets)
  const assessment = useMission((s) => s.assessment)
  const cursor = useMap((s) => s.cursor)
  const loc = useLocation()
  const online = !!health && !error

  return (
    <div className="h-full flex flex-col">
      <header className="h-10 shrink-0 flex items-center justify-between px-3 border-b border-line bg-panel/80 backdrop-blur relative z-20">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-5 w-5 items-center justify-center">
              <span className="absolute inset-0 rounded-full border border-mars/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-mars shadow-glow-mars" />
            </span>
            <span className="font-semibold tracking-[0.18em] text-[13px]">MARSENSE</span>
            <span className="hidden md:inline text-[10.5px] text-fg-dim tracking-wider uppercase">Martian Survival Navigator</span>
          </div>
          <span className="hidden lg:inline-flex items-center gap-1.5 text-[11px] text-fg-muted border-l border-line pl-3">
            <Compass className="h-3 w-3 text-sci" /> Region: <span className="text-fg">Jezero Crater</span>
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          {cursor && <span className="hidden md:inline mono text-fg-muted">{fmt.coord(cursor.lon, cursor.lat)}</span>}
          <Hint label={online ? `Backend online · terrain: ${health?.terrain_loaded.join(', ') || 'none'}` : 'Backend unreachable — start the API on :8000'}>
            <span className="inline-flex items-center gap-1.5 text-fg-muted">
              <span className={cn('h-1.5 w-1.5 rounded-full', online ? 'bg-safe pulse' : 'bg-danger')} />
              {online ? 'API' : 'OFFLINE'}
            </span>
          </Hint>
          <Badge variant="ghost" className="hidden sm:inline-flex">research prototype</Badge>
        </div>
      </header>

      <div className="flex-1 min-h-0 flex">
        <aside className="w-[200px] shrink-0 hidden md:flex flex-col border-r border-line bg-panel/60">
          <nav className="flex-1 py-2 overflow-auto">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.end}
                className={({ isActive }) =>
                  cn('group flex items-center gap-2.5 mx-2 my-0.5 px-2.5 h-8 rounded-md text-[12px] transition-colors border border-transparent',
                    isActive ? 'bg-panel-3 text-sci-2 border-sci/25 shadow-[inset_2px_0_0_0_#22d3ee]' : 'text-fg-muted hover:text-fg hover:bg-panel-2')
                }
              >
                <n.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{n.label}</span>
                {n.step && <span className="ml-auto mono text-[9.5px] text-fg-dim group-hover:text-fg-muted">{String(n.step).padStart(2, '0')}</span>}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-line p-3 space-y-1.5">
            <div className="label flex items-center gap-1"><Activity className="h-3 w-3" /> Mission plan</div>
            <div className="text-[11.5px] text-fg truncate" title={name}>{name}</div>
            <ul className="text-[10.5px] text-fg-muted space-y-0.5">
              <li className="flex justify-between"><span>Base</span><span className={base ? 'text-safe' : 'text-fg-dim'}>{base ? 'set' : '—'}</span></li>
              <li className="flex justify-between"><span>Targets</span><span className={targets.length ? 'text-safe' : 'text-fg-dim'}>{targets.length}</span></li>
              <li className="flex justify-between"><span>Route</span><span className={route ? (route.verified ? 'text-safe' : 'text-caution') : 'text-fg-dim'}>{route ? fmt.km(route.length_m) : '—'}</span></li>
              <li className="flex justify-between"><span>Assessment</span><span className={assessment ? (assessment.overall_score >= 75 ? 'text-safe' : assessment.overall_score >= 55 ? 'text-caution' : 'text-danger') : 'text-fg-dim'}>{assessment ? `${assessment.overall_score}` : '—'}</span></li>
            </ul>
          </div>
        </aside>

        <main className="flex-1 min-w-0 min-h-0 relative" key={loc.pathname}>
          <Outlet />
        </main>
      </div>

      <nav className="md:hidden h-12 shrink-0 border-t border-line bg-panel flex overflow-x-auto">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cn('flex flex-col items-center justify-center min-w-[64px] px-2 text-[9px]', isActive ? 'text-sci-2' : 'text-fg-muted')}>
            <n.icon className="h-4 w-4" />
            <span className="truncate max-w-[60px]">{n.label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
