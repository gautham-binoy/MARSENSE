import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Database, LocateFixed, RotateCcw, Satellite, ShieldAlert, Sparkles } from 'lucide-react'
import { MarsGlobe, type GlobeHandle } from '@/features/explorer/MarsGlobe'
import { api } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { useMission } from '@/store/mission'
import { useMap } from '@/store/map'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ReliabilityBadge, ScoreRing, Stat } from '@/components/common'
import { NAV } from '@/app/Shell'
import { fmt } from '@/lib/utils'

export default function MissionControlPage() {
  const globe = useRef<GlobeHandle>(null)
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
    <div className="absolute inset-0 grid grid-cols-1 xl:grid-cols-[1fr_380px] grid-rows-[auto_1fr] xl:grid-rows-1">
      <div className="relative min-h-[320px] xl:min-h-0 scanline">
        <MarsGlobe ref={globe} initialView="globe" onClick={(p) => setSelected(p)} showRoutePoints={false} />
        <div className="absolute top-3 left-3 panel-2 px-3 py-2 shadow-xl max-w-xs">
          <div className="label">Active region</div>
          <div className="text-[14px] font-semibold">{region?.name ?? 'Jezero Crater'}</div>
          <div className="mono text-[10.5px] text-fg-dim">{region ? `${region.center_lat.toFixed(2)}°N ${region.center_lon.toFixed(2)}°E` : ''}</div>
          <p className="text-[11px] text-fg-muted mt-1 line-clamp-3">{region?.description}</p>
          <div className="flex gap-1.5 mt-2">
            <Button size="sm" variant="sci" onClick={() => globe.current?.flyToJezero()} data-testid="mc-fly-jezero"><LocateFixed /> Fly to Jezero</Button>
            <Button size="sm" variant="secondary" onClick={() => globe.current?.reset()}><RotateCcw /></Button>
            <Button size="sm" variant="secondary" asChild><Link to="/explorer">Explorer <ArrowRight /></Link></Button>
          </div>
        </div>
        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5">
          {rovers?.rovers.map((r) => (
            <button key={r.rover} className="panel-2 px-2.5 py-1.5 text-left hover:border-sci/40" onClick={() => globe.current?.flyTo(r.lon, r.lat, 30000)}>
              <div className="flex items-center gap-1.5 text-[11px]"><Satellite className="h-3 w-3 text-ember" />{r.rover}<ReliabilityBadge value="measured" /></div>
              <div className="mono text-[10px] text-fg-dim">sol {r.sol} · {fmt.coord(r.lon, r.lat)} · {r.odometry_km} km</div>
            </button>
          ))}
        </div>
      </div>

      <aside className="border-l border-line bg-panel/70 overflow-auto p-3 space-y-3">
        <Card>
          <CardHeader><CardTitle>Mission status</CardTitle><Badge variant={m.assessment ? (m.assessment.verdict === 'feasible' ? 'safe' : m.assessment.verdict === 'feasible_with_changes' ? 'caution' : 'danger') : 'default'}>{m.assessment ? m.assessment.verdict.replace(/_/g, ' ') : 'not assessed'}</Badge></CardHeader>
          <CardContent className="flex gap-3 items-center">
            <ScoreRing score={m.assessment?.overall_score ?? 0} size={64} label="feasib." tone={m.assessment ? undefined : '#333b4a'} />
            <div className="grid grid-cols-2 gap-1.5 flex-1">
              <Stat label="Crew" value={m.supplies.crew} />
              <Stat label="Duration" value={m.supplies.duration_days} unit="d" />
              <Stat label="Targets" value={m.targets.length} />
              <Stat label="Route" value={m.route ? fmt.km(m.route.length_m) : '—'} tone={m.route ? (m.route.verified ? 'safe' : 'caution') : 'default'} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Active warnings</CardTitle><span className="mono text-[10px] text-fg-dim">{warnings.length}</span></CardHeader>
          <CardContent className="space-y-1">
            {warnings.length === 0 && <div className="text-[11.5px] text-safe">No active warnings.</div>}
            {warnings.map((w, i) => <div key={i} className="text-[11.5px] text-caution flex gap-1.5"><span>•</span>{w}</div>)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1"><Database className="h-3 w-3" /> Data availability</CardTitle><Link to="/methodology" className="text-[10.5px] text-sci hover:underline">details</Link></CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-3 gap-1.5">
              <Stat label="Cached" value={cached} tone="safe" />
              <Stat label="Streamed" value={streamed} tone="sci" />
              <Stat label="Missing" value={missing.length} tone={missing.length ? 'caution' : 'default'} />
            </div>
            <div className="text-[10.5px] text-fg-muted space-y-0.5">
              <div>MEDA history: {meda?.records.length ? <span className="text-safe">{meda.records.length} sols (sol {meda.range.sols?.[0]}–{meda.range.sols?.[1]})</span> : <span className="text-caution">not ingested</span>}</div>
              <div>RAD reference: {rad?.records.length ? <span className="text-safe">{rad.records.length} sols, {rad.typical_dose_per_sol_E_uGy} µGy/sol</span> : <span className="text-caution">not ingested</span>}</div>
              {missing.length > 0 && <div className="text-fg-dim">Run <span className="kbd">uv run python -m app.data.ingest</span> in backend/ to fetch: {missing.map((d) => d.id).join(', ')}</div>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> High-priority discoveries</CardTitle><Link to="/science" className="text-[10.5px] text-sci hover:underline">all targets</Link></CardHeader>
          <CardContent className="space-y-1.5">
            {recent.map((f) => (
              <button key={f.properties.id} className="w-full text-left panel-2 px-2 py-1.5 hover:border-sci/40" onClick={() => globe.current?.flyTo((f.geometry.coordinates as number[])[0], (f.geometry.coordinates as number[])[1], 6000)}>
                <div className="text-[11.5px] text-fg flex items-center justify-between">{f.properties.name}<Badge variant="caution">{f.properties.type.replace(/_/g, ' ')}</Badge></div>
                <div className="text-[10.5px] text-fg-muted line-clamp-2 mt-0.5">{f.properties.summary}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Workflow</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-1">
            {NAV.filter((n) => n.step).map((n) => (
              <Link key={n.to} to={n.to} className="flex items-center gap-2 text-[11.5px] text-fg-muted hover:text-sci-2 py-0.5">
                <span className="mono text-[9.5px] text-fg-dim w-5">{String(n.step).padStart(2, '0')}</span><n.icon className="h-3 w-3" />{n.label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
