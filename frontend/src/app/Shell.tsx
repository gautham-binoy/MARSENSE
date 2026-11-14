import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  Activity,
  BookOpen,
  Clock,
  Compass,
  Droplets,
  FileText,
  FlaskConical,
  Globe2,
  HeartPulse,
  type LucideIcon,
  Map,
  Mountain,
  Radio,
  Route as RouteIcon,
  ShieldCheck,
  Target,
  Video,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { useMission } from '@/store/mission'
import { useMap } from '@/store/map'
import { calculateMarsTime } from '@/lib/marsTime'
import { cn, fmt } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Hint } from '@/components/ui/tooltip'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  step: number | null
}

export const NAV: NavItem[] = [
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

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Mission Overview',
    items: [
      { to: '/', label: 'Mission Control', icon: Globe2, end: true, step: null },
    ],
  },
  {
    title: 'Reconnaissance',
    items: [
      { to: '/explorer', label: 'Mars Explorer', icon: Map, step: 1 },
      { to: '/terrain', label: 'Terrain Intelligence', icon: Mountain, step: 2 },
      { to: '/landing', label: 'Landing Sites', icon: Target, step: 3 },
    ],
  },
  {
    title: 'Science & Resources',
    items: [
      { to: '/science', label: 'Science Discovery', icon: FlaskConical, step: 4 },
      { to: '/resources', label: 'Water & Resources', icon: Droplets, step: 5 },
      { to: '/environment', label: 'Environment', icon: Radio, step: 6 },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/routes', label: 'Route Planner', icon: RouteIcon, step: 7 },
      { to: '/survival', label: 'Survival Simulator', icon: HeartPulse, step: 8 },
      { to: '/assessment', label: 'Mission Assessment', icon: ShieldCheck, step: 9 },
    ],
  },
  {
    title: 'Documentation',
    items: [
      { to: '/methodology', label: 'Methodology & Data', icon: BookOpen, step: null },
    ],
  },
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
  const [marsTime, setMarsTime] = useState(() => calculateMarsTime())

  useEffect(() => {
    const timer = setInterval(() => setMarsTime(calculateMarsTime()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="h-full flex flex-col bg-space selection:bg-sci/20 selection:text-sci-2">
      {/* Top Application Bar */}
      <header className="h-12 shrink-0 flex items-center justify-between px-3.5 sm:px-4 border-b border-line/80 bg-panel/90 backdrop-blur-xl relative z-30 shadow-sm">
        {/* Left: Brand & Focus Area */}
        <div className="flex items-center gap-3.5">
          <NavLink to="/" className="flex items-center gap-2.5 group">
            <span className="relative flex h-6 w-6 items-center justify-center">
              <span className="absolute inset-0 rounded-full border border-mars/40 group-hover:border-mars/80 transition-colors animate-spin-slow" />
              <span className="h-3 w-3 rounded-full bg-gradient-to-tr from-mars-2 via-mars to-amber-500 shadow-[0_0_12px_rgba(234,88,12,0.6)]" />
            </span>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-[0.2em] text-[13.5px] text-white leading-none">MARSENSE</span>
              <span className="text-[9.5px] text-slate-400 tracking-wider uppercase font-medium mt-0.5">Martian Survival Navigator</span>
            </div>
          </NavLink>

          <div className="hidden lg:flex items-center gap-2 border-l border-line/60 pl-3.5 text-[12px] text-slate-400">
            <Compass className="h-3.5 w-3.5 text-sci" />
            <span>Region:</span>
            <span className="text-white font-medium bg-slate-800/80 px-2 py-0.5 rounded-md border border-line-2/60">Jezero Crater</span>
          </div>

          {/* Precision Mars Chronometry Pill */}
          <div className="hidden xl:flex items-center gap-2.5 text-[11px] bg-slate-900/80 border border-line/80 rounded-full px-3 py-1 shadow-inner">
            <span className="flex items-center gap-1.5 text-sci-2 font-semibold font-mono">
              <Clock className="h-3.5 w-3.5 text-sci animate-pulse" />
              Sol {marsTime.m20Sol}
            </span>
            <span className="text-slate-600">·</span>
            <span className="mono text-slate-300">LTST {marsTime.ltstStr}</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">Ls {marsTime.lsDeg}° ({marsTime.season})</span>
            {marsTime.isDustSeason && (
              <Badge variant="caution" className="text-[9px] px-1.5 py-0">Dust Season</Badge>
            )}
          </div>
        </div>

        {/* Right: Telemetry & Actions */}
        <div className="flex items-center gap-3 text-[11.5px]">
          {cursor && (
            <span className="hidden md:inline mono text-slate-400 bg-slate-900/60 px-2.5 py-1 rounded-md border border-line/60">
              {fmt.coord(cursor.lon, cursor.lat)}
            </span>
          )}

          <a
            href="/MARSENSE_DEMO_VIDEO.mp4"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-line-2/70 px-2.5 py-1 rounded-md transition-colors text-[11.5px] font-medium"
            title="Watch Full-Length Official Demo Video (1080p Neural Voiceover)"
          >
            <Video className="h-3.5 w-3.5 text-sci" />
            <span>Demo Video</span>
          </a>

          <a
            href="/MARSENSE_OPERATIONS_MANUAL.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700/80 border border-line-2/70 px-2.5 py-1 rounded-md transition-colors text-[11.5px] font-medium"
            title="Download Official Operations Manual (PDF)"
          >
            <FileText className="h-3.5 w-3.5 text-amber-400" />
            <span>Manual</span>
          </a>

          <Hint label={online ? `Telemetry link active · Terrain DTMs: ${health?.terrain_loaded.join(', ') || 'none'}` : 'Backend unreachable — verify Uvicorn on :8000'}>
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900/60 border border-line/60 text-slate-300 cursor-help">
              <span className={cn('h-2 w-2 rounded-full', online ? 'bg-safe pulse' : 'bg-danger')} />
              <span className="font-semibold">{online ? 'API' : 'OFFLINE'}</span>
            </span>
          </Hint>

          <Badge variant="ghost" className="hidden sm:inline-flex text-[10px] text-slate-400 border-line/40">
            research prototype
          </Badge>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex-1 min-h-0 flex">
        {/* Modern Sidebar Navigation */}
        <aside className="w-[230px] shrink-0 hidden md:flex flex-col border-r border-line/70 bg-panel/75 backdrop-blur-xl">
          <nav className="flex-1 py-3 px-2.5 overflow-y-auto space-y-4">
            {NAV_GROUPS.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <div className="px-2.5 py-1 text-[10px] uppercase font-bold tracking-widest text-slate-500 font-sans">
                  {group.title}
                </div>
                {group.items.map((n) => (
                  <NavLink
                    key={n.to}
                    to={n.to}
                    end={n.end}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center gap-2.5 px-2.5 h-8.5 rounded-lg text-[12.5px] font-medium transition-all duration-150 border border-transparent select-none',
                        isActive
                          ? 'bg-slate-800/90 text-white border-line-2 shadow-sm shadow-black/20'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <n.icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-colors',
                            isActive ? 'text-sci' : 'text-slate-500 group-hover:text-slate-300',
                          )}
                        />
                        <span className="truncate">{n.label}</span>
                        {n.step && (
                          <span
                            className={cn(
                              'ml-auto mono text-[10px] px-1.5 py-0.5 rounded transition-colors',
                              isActive
                                ? 'bg-sci/15 text-sci-2 font-semibold'
                                : 'text-slate-500 group-hover:text-slate-400 bg-slate-800/40',
                            )}
                          >
                            {String(n.step).padStart(2, '0')}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          {/* Active Mission HUD Card in Sidebar Footer */}
          <div className="p-3 border-t border-line/70 bg-slate-900/60 m-2 rounded-xl border border-line-2/40 space-y-2">
            <div className="flex items-center justify-between">
              <div className="label flex items-center gap-1.5 text-slate-400 text-[10.5px]">
                <Activity className="h-3 w-3 text-sci" /> Mission Status
              </div>
              <Badge
                variant={
                  assessment
                    ? assessment.overall_score >= 75
                      ? 'safe'
                      : assessment.overall_score >= 55
                        ? 'caution'
                        : 'danger'
                    : 'default'
                }
                className="text-[9.5px] px-1.5 py-0"
              >
                {assessment ? `${Math.round(assessment.overall_score)}/100` : 'draft'}
              </Badge>
            </div>
            <div className="text-[12px] font-semibold text-white truncate" title={name}>
              {name}
            </div>
            <div className="grid grid-cols-3 gap-1 pt-1 border-t border-line/40 text-[10.5px]">
              <div className="flex flex-col">
                <span className="text-slate-500">Base</span>
                <span className={cn('font-medium', base ? 'text-safe' : 'text-slate-600')}>
                  {base ? 'Locked' : '—'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500">Targets</span>
                <span className={cn('font-medium', targets.length ? 'text-sci-2' : 'text-slate-600')}>
                  {targets.length ? targets.length : '0'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-slate-500">Traverse</span>
                <span className={cn('font-medium truncate', route ? (route.verified ? 'text-safe' : 'text-caution') : 'text-slate-600')}>
                  {route ? fmt.km(route.length_m) : '—'}
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* Dynamic Route View */}
        <main className="flex-1 min-w-0 min-h-0 relative bg-space" key={loc.pathname}>
          <Outlet />
        </main>
      </div>

      {/* Mobile Workflow Dock */}
      <nav className="md:hidden h-14 shrink-0 border-t border-line bg-panel/95 backdrop-blur-xl flex items-center justify-between px-2 overflow-x-auto gap-1 z-30">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center min-w-[62px] py-1 px-1.5 rounded-lg text-[10px] font-medium transition-colors',
                isActive ? 'text-sci-2 bg-slate-800/80' : 'text-slate-400 hover:text-slate-200',
              )
            }
          >
            <n.icon className="h-4 w-4 mb-0.5" />
            <span className="truncate max-w-[56px] text-center leading-tight">
              {n.label.split(' ')[0]}
            </span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
