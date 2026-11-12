import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  CheckCircle2,
  Compass,
  Mountain,
  Play,
} from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts'
import { MarsGlobe, type GlobeHandle } from '@/features/explorer/MarsGlobe'
import { api, type RegionStats } from '@/lib/api'
import { useMap } from '@/store/map'
import { useMission } from '@/store/mission'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Callout, PageHeader, ProvenanceList, ScoreRing, Spinner, Stat } from '@/components/common'

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

const CLASS_COLORS: Record<string, string> = {
  benign: '#34d399',
  caution: '#fbbf24',
  hazardous: '#f87171',
  impassable: '#ef4444',
}

export default function TerrainPage() {
  const globe = useRef<GlobeHandle>(null)
  const m = useMission()
  const mapState = useMap()

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

  useEffect(() => {
    void analyzeRegion(bbox)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m.profile])

  const handleSelectPreset = (pId: string) => {
    setSelectedPreset(pId)
    const p = PRESET_REGIONS.find((r) => r.id === pId)
    if (!p) return
    const newBbox = { west: p.west, south: p.south, east: p.east, north: p.north }
    setBbox(newBbox)
    void analyzeRegion(newBbox)
  }

  const classData = stats?.class_fractions
    ? Object.entries(stats.class_fractions).map(([cls, fraction]) => ({
        class: cls.toUpperCase(),
        percentage: Number((fraction * 100).toFixed(1)),
        color: CLASS_COLORS[cls] ?? '#9ca3af',
      }))
    : []

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-space">
      {/* Top Header */}
      <div className="border-b border-line bg-panel/90 px-4 py-2.5 backdrop-blur z-10 shrink-0">
        <PageHeader
          title="Martian Terrain Intelligence & Micro-Topography"
          subtitle="Horn (1981) 3x3 finite-difference slope and Riley et al. (1999) RMS Terrain Ruggedness Index over 20 m CTX DTM."
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
              onClick={() => analyzeRegion()}
              disabled={analyzing}
            >
              {analyzing ? <Spinner /> : <Play className="h-3.5 w-3.5" />}
              Analyze Area
            </Button>
          </div>
        </PageHeader>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_420px]">
        {/* Left: 3D Mars globe showing high-res CTX DTM & slope overlays */}
        <div className="relative min-h-[300px] lg:min-h-0 scanline">
          <MarsGlobe ref={globe} showRoute={true} initialView="jezero" />

          {/* Preset Buttons Floating Pill */}
          <div className="absolute top-3 left-3 panel-2 p-1.5 flex flex-wrap gap-1 shadow-xl max-w-lg">
            {PRESET_REGIONS.map((preset) => (
              <Button
                key={preset.id}
                size="xs"
                variant={selectedPreset === preset.id ? 'sci' : 'ghost'}
                onClick={() => handleSelectPreset(preset.id)}
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
            {stats && (
              <div className="text-fg-dim mono border-l border-line pl-3">
                {stats.area_km2} km² evaluated ({stats.n_pixels?.toLocaleString()} cells)
              </div>
            )}
          </div>
        </div>

        {/* Right side: Quantitative Statistics, Histograms, and Geomorphic Explanations */}
        <aside className="border-l border-line bg-panel/80 overflow-y-auto p-4 space-y-4">
          {error && <Callout kind="danger">{error}</Callout>}

          {/* Region Bounding Box Coordinates */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center justify-between text-[12.5px]">
                <span className="flex items-center gap-1.5">
                  <Compass className="h-3.5 w-3.5 text-sci" /> Bounding Box Coordinates (°E / °N)
                </span>
                <span className="mono text-[10.5px] text-fg-dim">Equirectangular</span>
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
