import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Clock,
  Database,
  FolderOpen,
  LocateFixed,
  RotateCcw,
  Satellite,
  ShieldAlert,
  Sparkles,
} from 'lucide-react'
import { MarsGlobe, type GlobeHandle } from '@/features/explorer/MarsGlobe'
import { api } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { useMission } from '@/store/mission'
import { useMap } from '@/store/map'
import { calculateMarsTime } from '@/lib/marsTime'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ReliabilityBadge, ScoreRing, Stat } from '@/components/common'
import { NAV } from '@/app/Shell'
import { fmt } from '@/lib/utils'
import { MissionVaultModal } from '@/features/mission-vault/MissionVaultModal'

export default function MissionControlPage() {
  const globe = useRef<GlobeHandle>(null)
  const [vaultOpen, setVaultOpen] = useState(false)
  const [marsTime, setMarsTime] = useState(() => calculateMarsTime())

  useEffect(() => {
    const timer = setInterval(() => setMarsTime(calculateMarsTime()), 1000)
    return () => clearInterval(timer)
  }, [])

  const { data: datasets } = useQuery('datasets', api.datasets)
  const { data: rovers } = useQuery('rovers', api.rovers)
  const { data: regions } = useQuery('regions', api.regions)
  const { data: targets } = useQuery('targets', api.targets)
  const { data: meda } = useQuery('meda', api.meda)
  const { data: rad } = useQuery('rad', api.rad)
  const m = useMission()
  const setSelected = useMap((s) => s.setSelected)
  const region = regions?.[0]
  const cached = datasets?.datasets.filter((d) => d.status.status === 'cached').length ?? 0
  const streamed = datasets?.datasets.filter((d) => d.status.status === 'streamed').length ?? 0
  const missing = datasets?.datasets.filter((d) => d.status.status === 'not_downloaded') ?? []

  const warnings: string[] = []
  if (!m.base) warnings.push('No base location selected.')
  if (!m.route) warnings.push('No route planned — route hazards unknown.')
  else if (!m.route.verified) warnings.push('Planned route crosses terrain without 20 m DTM coverage.')
  if (m.assessment?.critical_warnings) warnings.push(...m.assessment.critical_warnings)
  if (!meda?.records.length) warnings.push('MEDA environmental history not ingested yet.')
  const recent = targets?.features.filter((f) => f.properties.priority >= 3).slice(0, 5) ?? []

  return (
    <div className="absolute inset-0 grid grid-cols-1 xl:grid-cols-[1fr_400px] grid-rows-[auto_1fr] xl:grid-rows-1">
      {/* Planetary 3D Canvas */}
      <div className="relative min-h-[340px] xl:min-h-0 bg-space">
        <MarsGlobe ref={globe} initialView="globe" onClick={(p) => setSelected(p)} showRoutePoints={false} />

        {/* Top-Left Floating Regional HUD */}
        <div className="absolute top-4 left-4 glass-dock p-4 max-w-sm border border-white/10 shadow-2xl backdrop-blur-2xl">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sci-2">Primary Exploration Target</span>
            <Badge variant="sci" className="text-[9.5px]">Active</Badge>
          </div>
          <div className="text-[17px] font-bold text-white tracking-tight">{region?.name ?? 'Jezero Crater'}</div>
          <div className="mono text-[11px] text-slate-400 mt-0.5">
            {region ? `${region.center_lat.toFixed(2)}°N  ${region.center_lon.toFixed(2)}°E` : ''}
          </div>
          <p className="text-[12px] text-slate-300 mt-2 line-clamp-3 leading-relaxed">{region?.description}</p>
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-line/60">
            <Button size="sm" variant="sci" onClick={() => globe.current?.flyToJezero()} data-testid="mc-fly-jezero">
              <LocateFixed className="h-3.5 w-3.5" /> Fly to Jezero
            </Button>
            <Button size="sm" variant="secondary" onClick={() => globe.current?.reset()} title="Reset global view">
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <Link to="/explorer">
                Explorer <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Bottom-Left Rovers Live Telemetry Pills */}
        <div className="absolute bottom-4 left-4 flex flex-wrap gap-2 max-w-xl">
          {rovers?.rovers.map((r) => (
            <button
              key={r.rover}
              className="glass-dock px-3 py-2 text-left hover:border-sci/50 hover:bg-slate-800/80 transition-all duration-150 cursor-pointer group shadow-lg"
              onClick={() => globe.current?.flyTo(r.lon, r.lat, 30000)}
            >
              <div className="flex items-center gap-2 text-[12px] font-semibold text-white">
                <Satellite className="h-3.5 w-3.5 text-amber-400 group-hover:animate-pulse" />
                <span>{r.rover}</span>
                <ReliabilityBadge value="measured" />
              </div>
              <div className="mono text-[10.5px] text-slate-400 mt-0.5">
                Sol {r.sol} · {fmt.coord(r.lon, r.lat)} · {r.odometry_km} km
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Flight Control Right Sidebar */}
      <aside className="border-l border-line/80 bg-panel/85 backdrop-blur-xl overflow-y-auto p-4 space-y-4">
        {/* Mission Status Hero Card */}
        <Card className="border-line-2/70 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="text-white text-[12.5px]">Mission status</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={() => setVaultOpen(true)}
                  className="text-amber-400 border-amber-400/30 hover:bg-amber-400/10 text-[11px] font-medium"
                  title="Open saved missions vault"
                >
                  <FolderOpen className="h-3 w-3" /> Vault
                </Button>
                <Badge
                  variant={
                    m.assessment
                      ? m.assessment.verdict === 'feasible'
                        ? 'safe'
                        : m.assessment.verdict === 'feasible_with_changes'
                          ? 'caution'
                          : 'danger'
                      : 'default'
                  }
                  className="text-[10px]"
                >
                  {m.assessment ? m.assessment.verdict.replace(/_/g, ' ') : 'not assessed'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-4 items-center">
              <ScoreRing score={m.assessment?.overall_score ?? 0} size={72} label="feasib." tone={m.assessment ? undefined : '#334155'} />
              <div className="grid grid-cols-2 gap-2 flex-1">
                <Stat label="Crew" value={m.supplies.crew} />
                <Stat label="Duration" value={m.supplies.duration_days} unit="d" />
                <Stat label="Targets" value={m.targets.length} />
                <Stat
                  label="Route"
                  value={m.route ? fmt.km(m.route.length_m) : '—'}
                  tone={m.route ? (m.route.verified ? 'safe' : 'caution') : 'default'}
                />
              </div>
            </div>
            <div className="text-[11.5px] text-slate-400 flex items-center justify-between pt-2 border-t border-line/60">
              <span className="truncate max-w-[200px]">
                Active: <strong className="text-white font-medium">{m.name}</strong>
              </span>
              <Link to="/assessment" className="text-sci-2 hover:underline text-[11px] font-medium flex items-center gap-1">
                full assessment <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Real-time Mars Chronometry Card */}
        <Card className="border-line-2/70 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-[12.5px] text-white">
              <Clock className="h-4 w-4 text-sci" /> Mars Chronometry & Sun Position
            </CardTitle>
            <Badge variant="sci" className="font-mono text-[10px]">
              Sol {marsTime.m20Sol}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-2.5 text-[11.5px]">
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Jezero LMST" value={marsTime.lmstStr} tone="sci" />
              <Stat label="Jezero LTST" value={marsTime.ltstStr} tone="safe" />
              <Stat label="Mars Sol Date" value={marsTime.msd} />
              <Stat label="Solar Longitude" value={`${marsTime.lsDeg}°`} />
            </div>
            <div className="panel-2 p-2.5 rounded-lg text-[11px] text-slate-300 flex items-center justify-between border border-line/60">
              <span className="truncate">
                Season: <strong className="text-white">{marsTime.season}</strong>
              </span>
              {marsTime.isDustSeason && (
                <Badge variant="caution">Dust Storm Season</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Active Warnings Card */}
        <Card className="border-line-2/70 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-white">
              <ShieldAlert className="h-4 w-4 text-amber-400" /> Active warnings
            </CardTitle>
            <Badge variant={warnings.length ? 'caution' : 'safe'} className="mono text-[10px]">
              {warnings.length}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {warnings.length === 0 && (
              <div className="text-[12px] text-safe font-medium flex items-center gap-1.5">
                <span>✓</span> No active warnings.
              </div>
            )}
            {warnings.map((w, i) => (
              <div key={i} className="text-[12px] text-amber-300/90 flex gap-2 leading-snug">
                <span className="text-amber-400 font-bold">•</span>
                <span>{w}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Data Availability Card */}
        <Card className="border-line-2/70 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-white">
              <Database className="h-4 w-4 text-sci" /> Data availability
            </CardTitle>
            <Link to="/methodology" className="text-[11px] text-sci-2 hover:underline font-medium">
              details
            </Link>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Cached" value={cached} tone="safe" />
              <Stat label="Streamed" value={streamed} tone="sci" />
              <Stat label="Missing" value={missing.length} tone={missing.length ? 'caution' : 'default'} />
            </div>
            <div className="text-[11px] text-slate-400 space-y-1 bg-slate-900/50 p-2.5 rounded-lg border border-line/40">
              <div>
                MEDA history:{' '}
                {meda?.records.length ? (
                  <span className="text-safe font-medium">
                    {meda.records.length} sols (sol {meda.range.sols?.[0]}–{meda.range.sols?.[1]})
                  </span>
                ) : (
                  <span className="text-caution">not ingested</span>
                )}
              </div>
              <div>
                RAD reference:{' '}
                {rad?.records.length ? (
                  <span className="text-safe font-medium">
                    {rad.records.length} sols, {rad.typical_dose_per_sol_E_uGy} µGy/sol
                  </span>
                ) : (
                  <span className="text-caution">not ingested</span>
                )}
              </div>
              {missing.length > 0 && (
                <div className="text-slate-400 text-[10.5px] pt-1 border-t border-line/40">
                  Run <span className="kbd">uv run python -m app.data.ingest</span> to fetch:{' '}
                  {missing.map((d) => d.id).join(', ')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* High-Priority Discoveries Card */}
        <Card className="border-line-2/70 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-white">
              <Sparkles className="h-4 w-4 text-amber-400" /> High-priority discoveries
            </CardTitle>
            <Link to="/science" className="text-[11px] text-sci-2 hover:underline font-medium">
              all targets
            </Link>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.map((f) => (
              <button
                key={f.properties.id}
                className="w-full text-left panel-2 p-2.5 hover:border-sci/50 hover:bg-slate-800/70 transition-all rounded-lg cursor-pointer group"
                onClick={() =>
                  globe.current?.flyTo(
                    (f.geometry.coordinates as number[])[0],
                    (f.geometry.coordinates as number[])[1],
                    6000,
                  )
                }
              >
                <div className="text-[12px] font-semibold text-white group-hover:text-sci-2 flex items-center justify-between">
                  <span>{f.properties.name}</span>
                  <Badge variant="caution" className="text-[9.5px]">
                    {f.properties.type.replace(/_/g, ' ')}
                  </Badge>
                </div>
                <div className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                  {f.properties.summary}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Mission Workflow Roadmap */}
        <Card className="border-line-2/70 shadow-lg">
          <CardHeader>
            <CardTitle className="text-white">Workflow</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-1">
            {NAV.filter((n) => n.step).map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="flex items-center gap-2.5 text-[12px] text-slate-400 hover:text-white hover:bg-slate-800/60 p-1.5 rounded-lg transition-colors group"
              >
                <span className="mono text-[10px] text-slate-500 group-hover:text-sci-2 w-5 font-semibold">
                  {String(n.step).padStart(2, '0')}
                </span>
                <n.icon className="h-3.5 w-3.5 text-slate-500 group-hover:text-sci-2 transition-colors" />
                <span className="font-medium">{n.label}</span>
              </Link>
            ))}
          </CardContent>
        </Card>
      </aside>

      <MissionVaultModal open={vaultOpen} onOpenChange={setVaultOpen} />
    </div>
  )
}
