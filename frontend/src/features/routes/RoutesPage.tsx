import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  Gauge,
  Mountain,
  Navigation,
  Play,
  Plus,
  RotateCcw,
  Route as RouteIcon,
  ShieldAlert,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts'
import { MarsGlobe, type GlobeHandle } from '@/features/explorer/MarsGlobe'
import { api, type Route, type RouteAlternatives } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { useMission, type RoutePoint } from '@/store/mission'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Callout, PageHeader, ProvenanceList, Spinner, Stat } from '@/components/common'
import { fmt } from '@/lib/utils'
import { exportRouteAsGeoJson, exportRouteAsGpx } from '@/lib/routeExport'

export default function RoutesPage() {
  const globe = useRef<GlobeHandle>(null)
  const m = useMission()
  const { data: targets } = useQuery('targets', api.targets)
  const { data: strategies } = useQuery('strategies', api.strategies)

  const [planning, setPlanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'profile' | 'hazards' | 'alternatives' | 'waypoints'>('profile')
  const [speedKmh, setSpeedKmh] = useState(m.profile === 'astronaut' ? 2.5 : 0.12)
  const [maxSlope] = useState<number | null>(null)
  const [highlightAlt, setHighlightAlt] = useState<string | null>(null)

  // Ensure default route points if empty: base + first selected target or default target
  useEffect(() => {
    if (m.routePoints.length === 0) {
      const pts: RoutePoint[] = []
      if (m.base) {
        pts.push({ ...m.base, label: 'Mission Base' })
      } else {
        pts.push({ lon: 77.45089, lat: 18.44463, label: 'Octavia E. Butler Landing Site' })
      }
      // Add first selected target or default target (Kodiak Butte or Delta Front)
      if (m.targets.length > 0 && targets?.features) {
        const t = targets.features.find((f) => f.properties.id === m.targets[0])
        if (t) {
          const [lon, lat] = t.geometry.coordinates as number[]
          pts.push({ lon, lat, label: t.properties.name })
        }
      } else {
        pts.push({ lon: 77.425, lat: 18.435, label: 'Delta Scarp' })
      }
      m.setRoutePoints(pts)
    }
  }, [m, targets])

  // Update speed when profile changes
  useEffect(() => {
    setSpeedKmh(m.profile === 'astronaut' ? 2.5 : 0.12)
  }, [m.profile])

  const planRoute = async (compareAlternatives = false) => {
    if (m.routePoints.length < 2) {
      setError('At least two waypoints (start and destination) are required to plan a route.')
      return
    }
    setPlanning(true)
    setError(null)
    try {
      const res = await api.planRoute({
        points: m.routePoints.map((p) => ({ lon: p.lon, lat: p.lat })),
        strategy: m.routeStrategy,
        profile: m.profile,
        speed_kmh: speedKmh,
        max_slope_deg: maxSlope,
        alternatives: compareAlternatives,
      })

      if (compareAlternatives) {
        const alts = res as RouteAlternatives
        m.setRoute(alts.routes[alts.recommended] ?? Object.values(alts.routes)[0], alts.routes)
        setActiveTab('alternatives')
      } else {
        m.setRoute(res as Route, null)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Route planning failed')
    } finally {
      setPlanning(false)
    }
  }

  const addWaypointFromTarget = (targetId: string) => {
    const t = targets?.features.find((f) => f.properties.id === targetId)
    if (!t) return
    const [lon, lat] = t.geometry.coordinates as number[]
    m.addRoutePoint({ lon, lat, label: t.properties.name })
  }

  const moveWaypoint = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= m.routePoints.length) return
    const pts = [...m.routePoints]
    const temp = pts[index]
    pts[index] = pts[targetIndex]
    pts[targetIndex] = temp
    m.setRoutePoints(pts)
  }

  const handleAddReturnToBase = () => {
    const basePt = m.base ?? (m.routePoints.length > 0 ? m.routePoints[0] : null)
    if (!basePt) return
    m.addRoutePoint({ lon: basePt.lon, lat: basePt.lat, label: 'Return to Base' })
  }

  const handleReverseRoute = () => {
    if (m.routePoints.length < 2) return
    m.setRoutePoints([...m.routePoints].reverse())
  }

  const chartData = (m.route?.profile ?? [])
    .filter((_, idx, arr) => arr.length < 300 || idx % Math.ceil(arr.length / 300) === 0)
    .map((p) => ({
      distKm: Number((p.d / 1000).toFixed(2)),
      elevation: p.z !== null ? Math.round(p.z) : null,
      slope: p.slope !== null ? Number(p.slope.toFixed(1)) : null,
      source: p.src,
    }))

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-space">
      <div className="border-b border-line bg-panel/90 px-4 py-2.5 backdrop-blur z-10 shrink-0">
        <PageHeader
          title="Terrain-Aware Mission Route Planner"
          subtitle="A* pathfinding over 20 m/px CTX DTM with Horn slope and Riley TRI roughness cost multipliers."
        >
          <div className="flex items-center gap-2">
            <Button
              variant={m.profile === 'rover' ? 'sci' : 'secondary'}
              size="sm"
              onClick={() => m.setProfile('rover')}
            >
              Rover Profile
            </Button>
            <Button
              variant={m.profile === 'astronaut' ? 'sci' : 'secondary'}
              size="sm"
              onClick={() => m.setProfile('astronaut')}
            >
              Astronaut EVA
            </Button>
            <Button
              variant="sci"
              size="sm"
              onClick={() => planRoute(false)}
              disabled={planning || m.routePoints.length < 2}
            >
              {planning ? <Spinner /> : <Play className="h-3.5 w-3.5" />}
              Plan Route
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => planRoute(true)}
              disabled={planning || m.routePoints.length < 2}
            >
              <Sparkles className="h-3.5 w-3.5 text-ember" />
              Compare 3 Strategies
            </Button>
          </div>
        </PageHeader>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_440px]">
        {/* Left: 3D Mars globe with planned route overlays */}
        <div className="relative min-h-[300px] lg:min-h-0 scanline">
          <MarsGlobe
            ref={globe}
            showRoute={true}
            showRoutePoints={true}
            extraRoutes={m.alternatives}
            highlightRoute={highlightAlt}
            initialView="jezero"
          />

          {/* Quick globe fly controls */}
          <div className="absolute top-3 left-3 panel-2 px-3 py-2 flex items-center gap-2 text-[11px] shadow-lg">
            <Button size="xs" variant="secondary" onClick={() => globe.current?.flyToJezero()}>
              Jezero View
            </Button>
            {m.routePoints.length > 0 && (
              <Button
                size="xs"
                variant="ghost"
                onClick={() => globe.current?.flyTo(m.routePoints[0].lon, m.routePoints[0].lat, 12000)}
              >
                Start Waypoint
              </Button>
            )}
            {m.route && (
              <Badge variant={m.route.verified ? 'safe' : 'caution'}>
                {m.route.verified ? '✓ 20m DTM Verified' : '⚠ Unverified Terrain'}
              </Badge>
            )}
          </div>

          {/* Route bottom summary pill */}
          {m.route && (
            <div className="absolute bottom-3 left-3 right-3 lg:right-auto panel-2 px-3 py-2 flex flex-wrap items-center gap-4 text-[11.5px] shadow-xl">
              <div className="flex items-center gap-1.5 font-semibold text-sci-2">
                <RouteIcon className="h-4 w-4" />
                <span>{fmt.km(m.route.length_m)}</span>
              </div>
              <div className="text-fg-muted flex items-center gap-1">
                <Mountain className="h-3.5 w-3.5 text-ember" />
                <span>+{Math.round(m.route.climb_m)} m / -{Math.round(m.route.descent_m)} m</span>
              </div>
              <div className="text-fg-muted flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-fg-dim" />
                <span>{m.route.estimated_duration_h ? `${m.route.estimated_duration_h.toFixed(1)} h` : '—'}</span>
              </div>
              <div className="text-fg-muted flex items-center gap-1">
                <ShieldAlert className="h-3.5 w-3.5 text-danger" />
                <span>Hazardous: {Math.round(m.route.hazard_m)} m</span>
              </div>
            </div>
          )}
        </div>

        {/* Right side panel: Parameters, Waypoints, Charts, Hazard segments */}
        <aside className="border-l border-line bg-panel/80 overflow-y-auto p-3.5 space-y-3.5 flex flex-col">
          {error && <Callout kind="danger">{error}</Callout>}

          {/* Strategy selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-1.5">
                  <Navigation className="h-3.5 w-3.5 text-sci" /> Routing Strategy
                </span>
                <span className="text-[11px] text-fg-dim capitalize">{m.profile}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <div className="grid grid-cols-3 gap-1.5">
                {(['shortest', 'balanced', 'lowest_risk'] as const).map((strat) => (
                  <button
                    key={strat}
                    onClick={() => {
                      m.setRouteStrategy(strat)
                      if (m.alternatives && m.alternatives[strat]) {
                        m.setRoute(m.alternatives[strat], m.alternatives)
                      }
                    }}
                    className={`px-2 py-1.5 rounded text-[11px] font-medium border text-center transition-all ${
                      m.routeStrategy === strat
                        ? 'border-sci bg-sci/15 text-sci-2 shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                        : 'border-line/70 bg-panel-2 text-fg-muted hover:text-fg hover:border-line'
                    }`}
                  >
                    {strat === 'shortest' ? 'Shortest' : strat === 'balanced' ? 'Balanced' : 'Lowest Risk'}
                  </button>
                ))}
              </div>

              {strategies && strategies[m.routeStrategy] && (
                <p className="text-[11px] text-fg-muted leading-relaxed">
                  {strategies[m.routeStrategy].description}
                </p>
              )}

              {/* Speed & Max slope slider */}
              <div className="pt-2 border-t border-line space-y-2">
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-fg-muted flex items-center gap-1">
                    <Gauge className="h-3 w-3" /> Travel Speed
                  </span>
                  <span className="mono text-fg">{speedKmh.toFixed(2)} km/h</span>
                </div>
                <Slider
                  value={[speedKmh]}
                  min={m.profile === 'astronaut' ? 0.5 : 0.05}
                  max={m.profile === 'astronaut' ? 6.0 : 0.5}
                  step={0.05}
                  onValueChange={([v]) => setSpeedKmh(v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Interactive Tabs: Profile, Hazards, Alternatives, Waypoints */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="flex-1 flex flex-col">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="profile">Profile</TabsTrigger>
              <TabsTrigger value="hazards">
                Hazards {m.route?.hazard_segments.length ? `(${m.route.hazard_segments.length})` : ''}
              </TabsTrigger>
              <TabsTrigger value="alternatives">Alts</TabsTrigger>
              <TabsTrigger value="waypoints">Waypoints ({m.routePoints.length})</TabsTrigger>
            </TabsList>

            {/* TAB 1: Elevation Profile Chart */}
            <TabsContent value="profile" className="space-y-3 pt-2">
              {m.route && chartData.length > 0 ? (
                <div className="space-y-2">
                  <div className="h-48 w-full panel-2 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                        <defs>
                          <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                        <XAxis dataKey="distKm" tick={{ fill: '#9ca3af', fontSize: 9 }} unit="km" />
                        <YAxis tick={{ fill: '#9ca3af', fontSize: 9 }} domain={['dataMin - 10', 'dataMax + 10']} unit="m" />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#161a22', borderColor: '#374151', fontSize: '11px', borderRadius: '4px' }}
                          formatter={(val: unknown) => [`${val} m`, 'Elevation']}
                          labelFormatter={(label) => `Distance: ${label} km`}
                        />
                        <Area type="monotone" dataKey="elevation" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#elevGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <Stat label="Total Length" value={fmt.km(m.route.length_m)} />
                    <Stat label="Est. Duration" value={m.route.estimated_duration_h ? `${m.route.estimated_duration_h.toFixed(1)} h` : '—'} />
                    <Stat label="Cumulative Climb" value={`${Math.round(m.route.climb_m)} m`} />
                    <Stat label="Max / Mean Slope" value={`${m.route.max_slope_deg}° / ${m.route.mean_slope_deg}°`} />
                  </div>

                  <div className="text-[11px] text-fg-muted panel-2 p-2.5 space-y-1">
                    <div className="font-semibold text-fg">Navigation Assessment:</div>
                    <p>{m.route.explanation}</p>
                    <ProvenanceList items={m.route.provenance} className="mt-2 pt-2 border-t border-line/60" />
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => exportRouteAsGeoJson(m.route!, m.routePoints, m.name)}
                      className="flex-1 text-[11px]"
                    >
                      <Download className="h-3.5 w-3.5 text-sci" /> Export GeoJSON
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => exportRouteAsGpx(m.route!, m.routePoints, m.name)}
                      className="flex-1 text-[11px]"
                    >
                      <Download className="h-3.5 w-3.5 text-ember" /> Export GPX
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="panel-2 p-6 text-center text-fg-dim text-[12px] space-y-2">
                  <RouteIcon className="h-8 w-8 mx-auto opacity-30" />
                  <p>Click "Plan Route" above to compute the 20m DTM elevation profile and hazard footprint.</p>
                </div>
              )}
            </TabsContent>

            {/* TAB 2: Hazard Segments */}
            <TabsContent value="hazards" className="space-y-2.5 pt-2">
              {m.route ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[11.5px] px-1">
                    <span className="text-fg-muted">Caution Terrain:</span>
                    <span className="mono text-caution">{Math.round(m.route.caution_m)} m</span>
                  </div>
                  <div className="flex justify-between items-center text-[11.5px] px-1">
                    <span className="text-fg-muted">Hazardous Slopes:</span>
                    <span className="mono text-danger font-semibold">{Math.round(m.route.hazard_m)} m</span>
                  </div>

                  {m.route.hazard_segments.length === 0 ? (
                    <Callout kind="info">
                      <div className="flex items-center gap-1.5 text-safe">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>No severe hazard segments detected along this path!</span>
                      </div>
                    </Callout>
                  ) : (
                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                      {m.route.hazard_segments.map((h, i) => (
                        <div key={i} className="panel-2 p-2 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="mono text-fg font-medium">
                              {Math.round(h.start_m)} m → {Math.round(h.end_m)} m
                            </span>
                            <div className="text-[10px] text-fg-dim">Max slope: {h.max_slope}°</div>
                          </div>
                          <Badge variant={h.class === 'caution' ? 'caution' : 'danger'}>
                            {h.class}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="panel-2 p-6 text-center text-fg-dim text-[12px]">Plan a route first.</div>
              )}
            </TabsContent>

            {/* TAB 3: Strategy Alternatives Comparison */}
            <TabsContent value="alternatives" className="space-y-2.5 pt-2">
              {m.alternatives ? (
                <div className="space-y-2.5">
                  {Object.entries(m.alternatives).map(([key, alt]) => {
                    const isSelected = m.route?.strategy === key
                    return (
                      <div
                        key={key}
                        onMouseEnter={() => setHighlightAlt(key)}
                        onMouseLeave={() => setHighlightAlt(null)}
                        className={`panel-2 p-3 rounded-lg border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-sci bg-panel-3 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                            : 'hover:border-fg-dim'
                        }`}
                        onClick={() => m.setRoute(alt, m.alternatives)}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-semibold text-[12px] text-fg capitalize flex items-center gap-1.5">
                            {key === 'shortest' ? 'Shortest Distance' : key === 'balanced' ? 'Balanced' : 'Lowest Risk'}
                            {isSelected && <Badge variant="safe">Active</Badge>}
                          </span>
                          <span className="mono text-[11.5px] text-sci-2">{fmt.km(alt.length_m)}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[10.5px] text-fg-muted mb-1.5">
                          <div>Climb: <span className="mono text-fg">{Math.round(alt.climb_m)} m</span></div>
                          <div>Hazards: <span className="mono text-danger">{Math.round(alt.hazard_m)} m</span></div>
                          <div>Time: <span className="mono text-fg">{alt.estimated_duration_h ? `${alt.estimated_duration_h.toFixed(1)} h` : '—'}</span></div>
                        </div>
                        <p className="text-[10.5px] text-fg-dim line-clamp-2">{alt.explanation}</p>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="panel-2 p-6 text-center text-fg-dim text-[12px] space-y-2">
                  <p>Click "Compare 3 Strategies" above to compute and benchmark Shortest, Balanced, and Lowest Risk routes.</p>
                </div>
              )}
            </TabsContent>

            {/* TAB 4: Waypoints manager */}
            <TabsContent value="waypoints" className="space-y-2.5 pt-2">
              <div className="flex items-center gap-1.5 pb-1">
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={handleAddReturnToBase}
                  className="flex-1 text-[10.5px]"
                  title="Appends the mission base to close the exploration loop"
                >
                  <Plus className="h-3 w-3 text-safe" /> Return to Base (Loop)
                </Button>
                <Button
                  size="xs"
                  variant="secondary"
                  onClick={handleReverseRoute}
                  className="text-[10.5px]"
                  title="Reverse waypoint sequence"
                >
                  <RotateCcw className="h-3 w-3" /> Invert Route
                </Button>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {m.routePoints.map((p, idx) => (
                  <div key={idx} className="panel-2 p-2 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="mono text-[10px] text-fg-dim w-4">{idx + 1}.</span>
                      <div className="truncate">
                        <div className="font-medium text-fg truncate">{p.label ?? `Waypoint ${idx + 1}`}</div>
                        <div className="mono text-[9.5px] text-fg-dim">{fmt.coord(p.lon, p.lat)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => moveWaypoint(idx, 'up')}
                        disabled={idx === 0}
                        title="Move waypoint up"
                      >
                        <ArrowUp className="h-3 w-3 text-fg-dim" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => moveWaypoint(idx, 'down')}
                        disabled={idx === m.routePoints.length - 1}
                        title="Move waypoint down"
                      >
                        <ArrowDown className="h-3 w-3 text-fg-dim" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => globe.current?.flyTo(p.lon, p.lat, 8000)}
                        title="Focus on map"
                      >
                        <Compass className="h-3 w-3 text-sci" />
                      </Button>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => m.removeRoutePoint(idx)}
                        disabled={m.routePoints.length <= 2}
                        title="Remove waypoint"
                      >
                        <Trash2 className="h-3 w-3 text-fg-dim hover:text-danger" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add target quick select */}
              <div className="pt-2 border-t border-line space-y-1.5">
                <span className="text-[11px] text-fg-muted font-medium">Add Science Target to Route:</span>
                <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                  {targets?.features.map((f) => (
                    <Button
                      key={f.properties.id}
                      size="xs"
                      variant="secondary"
                      onClick={() => addWaypointFromTarget(f.properties.id)}
                    >
                      <Plus className="h-2.5 w-2.5" />
                      {f.properties.name}
                    </Button>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Workflow step navigator */}
          <div className="pt-3 border-t border-line flex items-center justify-between">
            <Button size="sm" variant="ghost" asChild>
              <Link to="/explorer">← Back to Explorer</Link>
            </Button>
            <Button size="sm" variant="sci" asChild>
              <Link to="/survival">Continue to Survival Simulator →</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
