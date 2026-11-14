import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  CheckCircle2,
  Compass,
  Download,
  Mountain,
  Navigation,
  Play,
  TrendingUp,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { MarsGlobe, type GlobeHandle } from '@/features/explorer/MarsGlobe'
import { api, type ProfileSample, type RegionStats } from '@/lib/api'
import { useMap } from '@/store/map'
import { useMission } from '@/store/mission'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Callout, PageHeader, ProvenanceList, ScoreRing, Spinner, Stat } from '@/components/common'
import { fmt } from '@/lib/utils'

const PRESET_REGIONS = [
  {
    id: 'delta',
    name: 'Jezero Western Delta Fan',
    west: 77.36,
    south: 18.40,
    east: 77.48,
    north: 18.48,
    desc: 'Prominent river delta deposits with steep clay scarps and layered stratigraphy.',
  },
  {
    id: 'landing_ellipse',
    name: 'Octavia E. Butler Landing Ellipse',
    west: 77.43,
    south: 18.43,
    east: 77.47,
    north: 18.46,
    desc: 'Smooth landing zone selected for Mars 2020 touchdown.',
  },
  {
    id: 'seitah',
    name: 'South Séítah Igneous / Dune Floor',
    west: 77.42,
    south: 18.41,
    east: 77.46,
    north: 18.45,
    desc: 'Rough terrain characterized by sand ripples and olivine-bearing bedrock outcrops.',
  },
  {
    id: 'full_dtm',
    name: 'Entire Jezero 20m CTX Mosaic',
    west: 77.16,
    south: 18.21,
    east: 77.70,
    north: 18.72,
    desc: 'Full 1596 x 1512 pixel coverage of western Jezero crater.',
  },
]

const TRANSECT_PRESETS = [
  {
    id: 'scarp',
    name: 'Delta Scarp Transect (Floor to Delta)',
    start: { lon: 77.445, lat: 18.435 },
    end: { lon: 77.385, lat: 18.435 },
    desc: 'Direct cross-section ascending the ~80m layered clay delta scarp.',
  },
  {
    id: 'kodiak',
    name: 'Octavia Butler to Kodiak Butte',
    start: { lon: 77.4509, lat: 18.4446 },
    end: { lon: 77.4200, lat: 18.4050 },
    desc: 'Southern transect across crater floor ripples toward the isolated Kodiak remnant.',
  },
  {
    id: 'neretva',
    name: 'Neretva Vallis Inflow Channel Breach',
    start: { lon: 77.3200, lat: 18.5200 },
    end: { lon: 77.3800, lat: 18.4800 },
    desc: 'Ancient river breach cutting through the western crater rim wall.',
  },
]

const CLASS_COLORS: Record<string, string> = {
  benign: '#34d399',
  caution: '#fbbf24',
  hazardous: '#f87171',
  impassable: '#ef4444',
}

interface ProfileResult {
  samples: ProfileSample[]
  length_m: number
  climb_m: number
  descent_m: number
  coverage_fraction: number
  provenance?: { dataset_id: string | null; reliability: string; method?: string | null; resolution_m?: number | null }[]
}

export default function TerrainPage() {
  const globe = useRef<GlobeHandle>(null)
  const m = useMission()
  const mapState = useMap()

  const [activeMode, setActiveMode] = useState<'bbox' | 'profile'>('bbox')
  const [selectedPreset, setSelectedPreset] = useState('delta')
  const [bbox, setBbox] = useState({
    west: 77.36,
    south: 18.40,
    east: 77.48,
    north: 18.48,
  })
  const [stats, setStats] = useState<RegionStats | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Transect Profile State
  const [selectedTransect, setSelectedTransect] = useState('scarp')
  const [transectStart, setTransectStart] = useState({ lon: 77.445, lat: 18.435 })
  const [transectEnd, setTransectEnd] = useState({ lon: 77.385, lat: 18.435 })
  const [stepM, setStepM] = useState(25)
  const [profileResult, setProfileResult] = useState<ProfileResult | null>(null)
  const [profiling, setProfiling] = useState(false)

  const analyzeRegion = async (targetBbox = bbox) => {
    setAnalyzing(true)
    setError(null)
    try {
      const res = await api.terrainAnalyze({
        west: targetBbox.west,
        south: targetBbox.south,
        east: targetBbox.east,
        north: targetBbox.north,
        profile: m.profile,
      })
      setStats(res)
      mapState.setBbox(targetBbox)
      globe.current?.flyTo(
        (targetBbox.west + targetBbox.east) / 2,
        (targetBbox.south + targetBbox.north) / 2,
        18000
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terrain analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }

  const runProfile = async (start = transectStart, end = transectEnd, step = stepM) => {
    setProfiling(true)
    setError(null)
    try {
      const res = await api.terrainProfile([start, end], step)
      setProfileResult(res)
      globe.current?.flyTo(
        (start.lon + end.lon) / 2,
        (start.lat + end.lat) / 2,
        14000
      )
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Profile calculation failed')
    } finally {
      setProfiling(false)
    }
  }

  useEffect(() => {
    if (activeMode === 'bbox') {
      void analyzeRegion(bbox)
    } else if (activeMode === 'profile' && !profileResult) {
      void runProfile()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.profile, activeMode])

  const handleSelectPreset = (pId: string) => {
    setSelectedPreset(pId)
    const p = PRESET_REGIONS.find((r) => r.id === pId)
    if (!p) return
    const newBbox = { west: p.west, south: p.south, east: p.east, north: p.north }
    setBbox(newBbox)
    void analyzeRegion(newBbox)
  }

  const handleSelectTransectPreset = (tId: string) => {
    setSelectedTransect(tId)
    const t = TRANSECT_PRESETS.find((p) => p.id === tId)
    if (!t) return
    setTransectStart(t.start)
    setTransectEnd(t.end)
    void runProfile(t.start, t.end, stepM)
  }

  const exportTransectCsv = () => {
    if (!profileResult || profileResult.samples.length === 0) return
    const header = 'distance_m,longitude,latitude,elevation_m,slope_deg,source\n'
    const rows = profileResult.samples
      .map(
        (s) =>
          `${s.d.toFixed(1)},${s.lon.toFixed(6)},${s.lat.toFixed(6)},${s.z !== null ? s.z.toFixed(2) : ''},${s.slope !== null ? s.slope.toFixed(2) : ''},${s.src ?? ''}`
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `MARSENSE_Transect_Profile_${selectedTransect}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const classData = stats?.class_fractions
    ? Object.entries(stats.class_fractions).map(([cls, fraction]) => ({
        class: cls.toUpperCase(),
        percentage: Number((fraction * 100).toFixed(1)),
        color: CLASS_COLORS[cls] ?? '#9ca3af',
      }))
    : []

  const profileChartData = (profileResult?.samples ?? []).map((s) => ({
    distKm: Number((s.d / 1000).toFixed(2)),
    distM: Math.round(s.d),
    elevation: s.z !== null ? Math.round(s.z) : null,
    slope: s.slope !== null ? Number(s.slope.toFixed(1)) : null,
    source: s.src,
  }))

  const maxProfileSlope = profileResult?.samples.reduce((max, s) => Math.max(max, s.slope ?? 0), 0) ?? 0

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-space">
      {/* Top Header */}
      <div className="border-b border-line bg-panel/90 px-4 py-2.5 backdrop-blur z-10 shrink-0">
        <PageHeader
          title="Martian Terrain Intelligence & Micro-Topography"
          subtitle="Horn (1981) 3x3 finite-difference slope and Riley et al. (1999) RMS Terrain Ruggedness Index over 20 m CTX DTM."
        >
          <div className="flex items-center gap-2">
            <div className="flex bg-panel-2 rounded-lg p-0.5 border border-line">
              <Button
                variant={activeMode === 'bbox' ? 'sci' : 'ghost'}
                size="xs"
                onClick={() => setActiveMode('bbox')}
                className="text-[11px]"
              >
                <BarChart3 className="h-3 w-3 mr-1" /> Region Statistics
              </Button>
              <Button
                variant={activeMode === 'profile' ? 'sci' : 'ghost'}
                size="xs"
                onClick={() => setActiveMode('profile')}
                className="text-[11px]"
              >
                <TrendingUp className="h-3 w-3 mr-1" /> Elevation Transect
              </Button>
            </div>
            <div className="h-4 w-px bg-line mx-1" />
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
          </div>
        </PageHeader>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_440px]">
        {/* Left: 3D Mars globe showing high-res CTX DTM & slope overlays */}
        <div className="relative min-h-[300px] lg:min-h-0 scanline">
          <MarsGlobe ref={globe} showRoute={true} initialView="jezero" />

          {/* Preset Buttons Floating Pill */}
          <div className="absolute top-3 left-3 panel-2 p-1.5 flex flex-wrap gap-1 shadow-xl max-w-lg">
            {activeMode === 'bbox'
              ? PRESET_REGIONS.map((preset) => (
                  <Button
                    key={preset.id}
                    size="xs"
                    variant={selectedPreset === preset.id ? 'sci' : 'ghost'}
                    onClick={() => handleSelectPreset(preset.id)}
                  >
                    {preset.name}
                  </Button>
                ))
              : TRANSECT_PRESETS.map((preset) => (
                  <Button
                    key={preset.id}
                    size="xs"
                    variant={selectedTransect === preset.id ? 'sci' : 'ghost'}
                    onClick={() => handleSelectTransectPreset(preset.id)}
                  >
                    {preset.name}
                  </Button>
                ))}
          </div>

          {/* Bottom active layer indication */}
          <div className="absolute bottom-3 left-3 panel-2 px-3 py-1.5 flex items-center gap-3 text-[11px] shadow-lg">
            <div className="flex items-center gap-1.5 text-sci-2 font-medium">
              <Mountain className="h-3.5 w-3.5" />
              <span>USGS Mars 2020 CTX DTM (20 m/px)</span>
            </div>
            {activeMode === 'bbox' && stats && (
              <div className="text-fg-dim mono border-l border-line pl-3">
                {stats.area_km2} km² evaluated ({stats.n_pixels?.toLocaleString()} cells)
              </div>
            )}
            {activeMode === 'profile' && profileResult && (
              <div className="text-fg-dim mono border-l border-line pl-3">
                {fmt.km(profileResult.length_m)} transect · {profileResult.samples.length} elevation posts
              </div>
            )}
          </div>
        </div>

        {/* Right side: Mode Switchable Tools */}
        <aside className="border-l border-line bg-panel/80 overflow-y-auto p-4 space-y-4">
          {error && <Callout kind="danger">{error}</Callout>}

          {activeMode === 'bbox' ? (
            /* ========================================================================= */
            /* MODE 1: REGION BOUNDING BOX & STATISTICAL HISTOGRAM                       */
            /* ========================================================================= */
            <>
              {/* Region Bounding Box Coordinates */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-[12.5px]">
                    <span className="flex items-center gap-1.5">
                      <Compass className="h-3.5 w-3.5 text-sci" /> Bounding Box Coordinates (°E / °N)
                    </span>
                    <Button
                      variant="sci"
                      size="xs"
                      onClick={() => analyzeRegion()}
                      disabled={analyzing}
                    >
                      {analyzing ? <Spinner /> : <Play className="h-3 w-3 mr-1" />}
                      Recalculate
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <label className="text-fg-muted mb-0.5 block">West Longitude</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={bbox.west}
                        onChange={(e) => setBbox({ ...bbox, west: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="text-fg-muted mb-0.5 block">East Longitude</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={bbox.east}
                        onChange={(e) => setBbox({ ...bbox, east: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="text-fg-muted mb-0.5 block">South Latitude</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={bbox.south}
                        onChange={(e) => setBbox({ ...bbox, south: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="text-fg-muted mb-0.5 block">North Latitude</label>
                      <Input
                        type="number"
                        step="0.01"
                        value={bbox.north}
                        onChange={(e) => setBbox({ ...bbox, north: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {stats ? (
                <div className="space-y-4">
                  {/* Overall Traversability Score Card */}
                  <div className="panel-2 p-3.5 rounded-xl border border-line flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] text-fg-dim uppercase tracking-wider">Traversability Index</div>
                      <div className="text-[18px] font-bold text-fg flex items-baseline gap-1.5 mt-0.5">
                        <span className="mono text-safe">
                          {((stats.traversability_index ?? 0) * 100).toFixed(0)}%
                        </span>
                        <span className="text-[11px] text-fg-muted font-normal">passable share</span>
                      </div>
                      <div className="text-[10.5px] text-fg-dim mt-0.5">
                        Profile: <strong className="text-fg capitalize">{m.profile}</strong>
                      </div>
                    </div>
                    <ScoreRing score={(stats.traversability_index ?? 0) * 100} size={64} label="Passable" />
                  </div>

                  {/* Slope & Roughness Breakdown Chart */}
                  <Card>
                    <CardHeader className="pb-1">
                      <CardTitle className="text-[12.5px] flex items-center gap-1.5">
                        <BarChart3 className="h-3.5 w-3.5 text-ember" /> Terrain Classification Distribution
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="h-36 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={classData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                            <XAxis dataKey="class" tick={{ fill: '#9ca3af', fontSize: 9 }} />
                            <YAxis tick={{ fill: '#9ca3af', fontSize: 9 }} unit="%" />
                            <RechartsTooltip
                              contentStyle={{ backgroundColor: '#161a22', borderColor: '#374151', fontSize: '11px', borderRadius: '4px' }}
                              formatter={(v: unknown) => [`${v}%`, 'Coverage']}
                            />
                            <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                              {classData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <Stat label="Mean Elevation" value={`${Math.round(stats.elevation?.mean ?? 0)} m`} />
                        <Stat label="Total Relief" value={`${Math.round(stats.elevation?.relief ?? 0)} m`} />
                        <Stat label="Slope p90 / Max" value={`${stats.slope_deg?.p90}° / ${stats.slope_deg?.max}°`} />
                        <Stat
                          label="Roughness (TRI p90)"
                          value={stats.roughness_m ? `${stats.roughness_m.p90} m` : 'Unresolved'}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Scientific Explanations & Citations */}
                  {stats.explanations && stats.explanations.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[12px] font-semibold text-fg flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-sci" /> Scientific Interpretation
                      </span>
                      <div className="space-y-1.5 text-[11px] text-fg-muted panel-2 p-3 leading-relaxed">
                        {stats.explanations.map((exp, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <span className="text-sci mt-0.5">•</span>
                            <span>{exp}</span>
                          </div>
                        ))}
                        <ProvenanceList items={stats.provenance} className="mt-2 pt-2 border-t border-line/60" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="panel-2 p-6 text-center text-fg-dim text-[12px]">
                  {analyzing ? 'Processing DTM derivatives...' : 'Select a preset or enter coordinates.'}
                </div>
              )}
            </>
          ) : (
            /* ========================================================================= */
            /* MODE 2: INTERACTIVE ELEVATION TRANSECT / PROFILE TOOL                    */
            /* ========================================================================= */
            <>
              {/* Transect Endpoint Configuration */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-[12.5px]">
                    <span className="flex items-center gap-1.5">
                      <Navigation className="h-3.5 w-3.5 text-sci" /> Elevation Transect Endpoints
                    </span>
                    <Button
                      variant="sci"
                      size="xs"
                      onClick={() => runProfile()}
                      disabled={profiling}
                    >
                      {profiling ? <Spinner /> : <Play className="h-3 w-3 mr-1" />}
                      Calculate Profile
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="space-y-1">
                      <div className="text-fg-dim font-medium">Start Coordinates (°E, °N)</div>
                      <div className="grid grid-cols-2 gap-1">
                        <Input
                          type="number"
                          step="0.001"
                          value={transectStart.lon}
                          onChange={(e) => setTransectStart({ ...transectStart, lon: parseFloat(e.target.value) || 0 })}
                        />
                        <Input
                          type="number"
                          step="0.001"
                          value={transectStart.lat}
                          onChange={(e) => setTransectStart({ ...transectStart, lat: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-fg-dim font-medium">End Coordinates (°E, °N)</div>
                      <div className="grid grid-cols-2 gap-1">
                        <Input
                          type="number"
                          step="0.001"
                          value={transectEnd.lon}
                          onChange={(e) => setTransectEnd({ ...transectEnd, lon: parseFloat(e.target.value) || 0 })}
                        />
                        <Input
                          type="number"
                          step="0.001"
                          value={transectEnd.lat}
                          onChange={(e) => setTransectEnd({ ...transectEnd, lat: parseFloat(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-line/60 text-[11px]">
                    <span className="text-fg-muted">Sampling Step:</span>
                    <div className="flex gap-1">
                      {[10, 20, 50].map((step) => (
                        <Button
                          key={step}
                          size="xs"
                          variant={stepM === step ? 'sci' : 'ghost'}
                          onClick={() => {
                            setStepM(step)
                            void runProfile(transectStart, transectEnd, step)
                          }}
                        >
                          {step} m
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {profileResult ? (
                <div className="space-y-4">
                  {/* Transect Statistics Summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Stat label="Total Length" value={fmt.km(profileResult.length_m)} tone="sci" />
                    <Stat label="Elevation Climb" value={`${Math.round(profileResult.climb_m)} m`} tone="safe" />
                    <Stat label="Elevation Descent" value={`${Math.round(profileResult.descent_m)} m`} />
                    <Stat label="Max Slope" value={`${maxProfileSlope.toFixed(1)}°`} tone={maxProfileSlope > 15 ? 'danger' : 'safe'} />
                  </div>

                  {/* Elevation Profile Area Chart */}
                  <Card>
                    <CardHeader className="pb-1">
                      <div className="flex items-center justify-between w-full">
                        <CardTitle className="text-[12.5px] flex items-center gap-1.5">
                          <Mountain className="h-3.5 w-3.5 text-sci" /> Elevation Transect Cross-Section
                        </CardTitle>
                        <Button
                          size="xs"
                          variant="ghost"
                          onClick={exportTransectCsv}
                          className="text-[10.5px] text-sci"
                        >
                          <Download className="h-3 w-3 mr-1" /> Export CSV
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={profileChartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                            <defs>
                              <linearGradient id="elevGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.5} />
                                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                            <XAxis dataKey="distKm" tick={{ fill: '#9ca3af', fontSize: 9 }} unit=" km" />
                            <YAxis tick={{ fill: '#9ca3af', fontSize: 9 }} unit=" m" domain={['dataMin - 10', 'dataMax + 10']} />
                            <RechartsTooltip
                              contentStyle={{ backgroundColor: '#161a22', borderColor: '#374151', fontSize: '11px', borderRadius: '4px' }}
                              formatter={(v: unknown) => [`${v} m`, 'Elevation (areoid)']}
                              labelFormatter={(d) => `${d} km along transect`}
                            />
                            <Area type="monotone" dataKey="elevation" stroke="#22d3ee" strokeWidth={2} fill="url(#elevGrad)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Slope Line Chart */}
                      <div className="h-28 w-full pt-1 border-t border-line/60">
                        <div className="text-[10px] text-fg-dim mb-1 flex items-center justify-between">
                          <span>Local Slope Gradient Along Transect</span>
                          <span className="text-caution">15° Hazard Threshold</span>
                        </div>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={profileChartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                            <XAxis dataKey="distKm" tick={{ fill: '#9ca3af', fontSize: 9 }} unit=" km" />
                            <YAxis tick={{ fill: '#9ca3af', fontSize: 9 }} unit="°" domain={[0, 'dataMax + 5']} />
                            <ReferenceLine y={15} stroke="#ef4444" strokeDasharray="3 3" />
                            <RechartsTooltip
                              contentStyle={{ backgroundColor: '#161a22', borderColor: '#374151', fontSize: '11px', borderRadius: '4px' }}
                              formatter={(v: unknown) => [`${v}°`, 'Horn Slope']}
                            />
                            <Line type="monotone" dataKey="slope" stroke="#fbbf24" strokeWidth={1.5} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      <div className="flex items-center justify-between text-[10.5px] text-fg-dim pt-1">
                        <span>DTM Verification: <strong className="text-safe">{(profileResult.coverage_fraction * 100).toFixed(0)}% high-resolution 20m</strong></span>
                        <span>Sample Interval: <strong className="text-fg">{stepM} m</strong></span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Provenance */}
                  {profileResult.provenance && (
                    <div className="panel-2 p-2.5 rounded text-[10.5px] text-fg-dim">
                      <ProvenanceList items={profileResult.provenance} />
                    </div>
                  )}
                </div>
              ) : (
                <div className="panel-2 p-6 text-center text-fg-dim text-[12px]">
                  {profiling ? 'Sampling DTM along transect...' : 'Click "Calculate Profile" to sample elevation.'}
                </div>
              )}
            </>
          )}

          {/* Workflow step navigator */}
          <div className="pt-3 border-t border-line flex items-center justify-between">
            <Button size="sm" variant="ghost" asChild>
              <Link to="/explorer">← Back to Explorer</Link>
            </Button>
            <Button size="sm" variant="sci" asChild>
              <Link to="/landing">Proceed to Landing Sites →</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
