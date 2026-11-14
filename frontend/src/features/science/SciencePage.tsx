import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import {
  Archive,
  Check,
  Download,
  Plus,
  Route as RouteIcon,
  Search,
  Sparkles,
  Star,
  Target,
} from 'lucide-react'
import { MarsGlobe, type GlobeHandle } from '@/features/explorer/MarsGlobe'
import { api, type ScienceTarget } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { useMission } from '@/store/mission'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader, Spinner } from '@/components/common'
import { SampleDepotCard } from '@/features/science/SampleDepotCard'

const TYPE_COLORS: Record<string, string> = {
  landing_site: '#fb923c',
  igneous_unit: '#f472b6',
  sample_cache: '#a78bfa',
  sedimentary_deposit: '#fde68a',
  delta_remnant: '#fde68a',
  carbonate_unit: '#34d399',
  ancient_river_channel: '#60a5fa',
  geological_boundary: '#f87171',
  impact_crater: '#9ca3af',
}

export default function SciencePage() {
  const globe = useRef<GlobeHandle>(null)
  const m = useMission()
  const { data: targetsData, loading } = useQuery('targets', api.targets)

  const [scienceTab, setScienceTab] = useState<'targets' | 'msr'>('targets')
  const [search, setSearch] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null)
  const { data: activeDetail } = useQuery(
    `target:${activeTargetId}`,
    () => (activeTargetId ? api.target(activeTargetId) : Promise.resolve(null)),
    { enabled: !!activeTargetId }
  )

  const rawTargets = targetsData?.features ?? []
  const targets: ScienceTarget[] = rawTargets.map((f) => {
    const p = f.properties
    const [lon, lat] = f.geometry.coordinates as number[]
    let dist: number | undefined
    if (m.base) {
      // Approximate distance on sphere
      const dlat = (lat - m.base.lat) * 59270
      const dlon = (lon - m.base.lon) * 56250
      dist = Math.round(Math.hypot(dlat, dlon))
    }
    return {
      id: p.id,
      name: p.name,
      type: p.type,
      priority: p.priority,
      lon,
      lat,
      elevation_m: p.elevation_m,
      location_basis: p.location_basis,
      summary: p.summary,
      science_value: p.science_value,
      mission: p.mission,
      instruments: p.instruments ?? [],
      sources: p.sources ?? [],
      distance_m: dist,
    }
  })

  const types = ['all', ...Array.from(new Set(targets.map((t) => t.type)))]

  const filtered = targets.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.summary.toLowerCase().includes(search.toLowerCase()) ||
      t.type.toLowerCase().includes(search.toLowerCase())
    const matchesType = selectedType === 'all' || t.type === selectedType
    return matchesSearch && matchesType
  })

  const handleSelectTarget = (t: ScienceTarget) => {
    setActiveTargetId(t.id)
    globe.current?.flyTo(t.lon, t.lat, 6000)
  }

  const handleToggleMissionObjective = (id: string) => {
    m.toggleTarget(id)
  }

  const handleAddTargetToRoute = (t: ScienceTarget) => {
    m.addRoutePoint({ lon: t.lon, lat: t.lat, label: t.name })
  }

  const handleSelectAllHighPriority = () => {
    const highPri = targets.filter((t) => t.priority >= 4).map((t) => t.id)
    highPri.forEach((id) => {
      if (!m.targets.includes(id)) {
        m.toggleTarget(id)
      }
    })
  }

  const exportTargetsGeoJson = () => {
    const fc = {
      type: 'FeatureCollection',
      name: 'MARSENSE_Jezero_Science_Targets',
      crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
      features: targets.map((t) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [t.lon, t.lat, t.elevation_m] },
        properties: {
          id: t.id,
          name: t.name,
          type: t.type,
          priority: t.priority,
          summary: t.summary,
          science_value: t.science_value,
          mission: t.mission,
          instruments: t.instruments,
        },
      })),
    }
    const blob = new Blob([JSON.stringify(fc, null, 2)], { type: 'application/geo+json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'MARSENSE_Jezero_Science_Targets.geojson'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportTargetsCsv = () => {
    const header = 'id,name,type,priority,longitude,latitude,elevation_m,summary,science_value\n'
    const rows = targets
      .map(
        (t) =>
          `"${t.id}","${t.name}","${t.type}",${t.priority},${t.lon.toFixed(6)},${t.lat.toFixed(6)},${t.elevation_m},"${t.summary.replace(/"/g, '""')}","${t.science_value.replace(/"/g, '""')}"`
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'MARSENSE_Jezero_Science_Targets.csv'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-space">
      {/* Header bar */}
      <div className="border-b border-line bg-panel/90 px-4 py-2.5 backdrop-blur z-10 shrink-0">
        <PageHeader
          title="Planetary Science Discovery & Target Catalogue"
          subtitle="Documented geological features, astrobiological sample return candidates, and paleo-fluvial formations in Jezero."
        >
          <div className="flex items-center gap-2">
            <Button
              size="xs"
              variant="secondary"
              onClick={handleSelectAllHighPriority}
              className="text-[11px]"
              title="Select all targets with 4 or 5 stars"
            >
              <Sparkles className="h-3 w-3 mr-1 text-sci" />
              Select 4★+
            </Button>
            <Button
              size="xs"
              variant="secondary"
              onClick={exportTargetsGeoJson}
              className="text-[11px]"
              title="Export targets as GeoJSON"
            >
              <Download className="h-3 w-3 mr-1" />
              GeoJSON
            </Button>
            <Button
              size="xs"
              variant="secondary"
              onClick={exportTargetsCsv}
              className="text-[11px]"
              title="Export targets as CSV"
            >
              <Download className="h-3 w-3 mr-1" />
              CSV
            </Button>
            <Badge variant="sci" className="mono">
              {m.targets.length} Selected Objectives
            </Badge>
            <Button size="sm" variant="secondary" asChild>
              <Link to="/resources">View Mineral Evidence →</Link>
            </Button>
          </div>
        </PageHeader>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_480px]">
        {/* Left: 3D Mars globe with target markers */}
        <div className="relative min-h-[300px] lg:min-h-0 bg-space">
          <MarsGlobe ref={globe} showRoute={true} initialView="jezero" />

          {/* Floating type filter pills */}
          <div className="absolute top-4 left-4 glass-dock p-2 flex flex-wrap gap-1.5 shadow-2xl max-w-xl z-10 border border-white/10">
            {types.map((typeKey) => (
              <Button
                key={typeKey}
                size="xs"
                variant={selectedType === typeKey ? 'sci' : 'ghost'}
                onClick={() => setSelectedType(typeKey)}
                className="capitalize text-[11px] rounded-md"
              >
                {typeKey.replace(/_/g, ' ')}
              </Button>
            ))}
          </div>

          {/* Bottom active selection tag */}
          {activeDetail && (
            <div className="absolute bottom-4 left-4 glass-dock px-4 py-2.5 flex items-center gap-3 text-[11.5px] shadow-xl max-w-md z-10 border border-white/10">
              <div>
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  {activeDetail.name}
                </div>
                <div className="text-[11px] text-slate-300 line-clamp-1">{activeDetail.summary}</div>
              </div>
              <Button
                size="xs"
                variant={m.targets.includes(activeDetail.id) ? 'secondary' : 'sci'}
                onClick={() => handleToggleMissionObjective(activeDetail.id)}
                className="rounded-md shrink-0"
              >
                {m.targets.includes(activeDetail.id) ? 'Deselect' : 'Select'}
              </Button>
            </div>
          )}
        </div>

        {/* Right side: Search, Target cards directory, Inspection details */}
        <aside className="border-l border-line/80 bg-panel/85 backdrop-blur-xl overflow-y-auto p-4 space-y-4">
          <Tabs value={scienceTab} onValueChange={(v) => setScienceTab(v as typeof scienceTab)}>
            <TabsList className="grid grid-cols-2 w-full mb-2">
              <TabsTrigger value="targets" className="text-[11.5px] flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-sci" />
                Planetary Targets
              </TabsTrigger>
              <TabsTrigger value="msr" className="text-[11.5px] flex items-center gap-1.5">
                <Archive className="h-3.5 w-3.5 text-purple-400" />
                MSR Sample Depot (10)
              </TabsTrigger>
            </TabsList>

            <TabsContent value="targets" className="space-y-3.5">
              {/* Search box */}
              <div className="relative">
                <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-fg-dim" />
                <Input
                  placeholder="Search targets by name, unit, or keywords..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 text-[11.5px]"
                />
              </div>

          {/* Active Target Details Card */}
          {activeDetail && (
            <Card className="border-sci/40 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-start justify-between text-[13px]">
                  <div>
                    <span className="font-bold text-fg flex items-center gap-1.5">
                      <Target className="h-4 w-4 text-sci" /> {activeDetail.name}
                    </span>
                    <Badge variant="caution" className="mt-1 capitalize text-[10px]">
                      {activeDetail.type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="xs"
                      variant={m.targets.includes(activeDetail.id) ? 'secondary' : 'sci'}
                      onClick={() => handleToggleMissionObjective(activeDetail.id)}
                    >
                      {m.targets.includes(activeDetail.id) ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      {m.targets.includes(activeDetail.id) ? 'Selected' : 'Add to Plan'}
                    </Button>
                    <Button
                      size="xs"
                      variant="secondary"
                      onClick={() => handleAddTargetToRoute(activeDetail)}
                    >
                      <RouteIcon className="h-3 w-3" /> Route
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-[11px]">
                <p className="text-fg-muted leading-relaxed">{activeDetail.summary}</p>

                <div className="panel-2 p-2 rounded text-[10.5px] space-y-1">
                  <div className="font-semibold text-sci-2">Science Justification:</div>
                  <p className="text-fg-muted">{activeDetail.science_value}</p>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10.5px] text-fg-dim">
                  <div>Elevation: <strong className="text-fg mono">{activeDetail.elevation_m} m</strong></div>
                  <div>Instruments: <strong className="text-fg">{activeDetail.instruments.join(', ')}</strong></div>
                  {activeDetail.terrain && (
                    <>
                      <div>Slope: <strong className="text-fg mono">{activeDetail.terrain.slope_deg}°</strong></div>
                      <div>Roughness: <strong className="text-fg mono">{activeDetail.terrain.roughness_m ?? '—'} m</strong></div>
                    </>
                  )}
                </div>

                {/* Sources list */}
                {activeDetail.sources && activeDetail.sources.length > 0 && (
                  <div className="pt-2 border-t border-line/60 text-[10px] text-fg-dim space-y-0.5">
                    <span className="font-semibold text-fg">Academic Literature Sources:</span>
                    {activeDetail.sources.map((src, i) => (
                      <div key={i} className="flex items-start gap-1">
                        <span>•</span>
                        <span>{src}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Directory list of targets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="font-semibold text-fg">Catalogue Directory ({filtered.length})</span>
              <span className="text-fg-dim mono text-[10px]">Jezero Crater</span>
            </div>

            {loading && <div className="p-4 text-center text-fg-dim"><Spinner /> Loading targets...</div>}

            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {filtered.map((t) => {
                const isSelected = m.targets.includes(t.id)
                const isActive = activeTargetId === t.id
                return (
                  <div
                    key={t.id}
                    onClick={() => handleSelectTarget(t)}
                    className={`panel-2 p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isActive
                        ? 'border-sci bg-panel-3 shadow-[0_0_10px_rgba(34,211,238,0.15)]'
                        : isSelected
                        ? 'border-safe/50 bg-safe/5'
                        : 'hover:border-fg-dim'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[12px] text-fg flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: TYPE_COLORS[t.type] ?? '#9ca3af' }}
                        />
                        {t.name}
                        {isSelected && <Badge variant="safe">Objective</Badge>}
                      </span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: t.priority }).map((_, i) => (
                          <Star key={i} className="h-2.5 w-2.5 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                    </div>

                    <p className="text-[10.5px] text-fg-muted line-clamp-2">{t.summary}</p>

                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-line/60 text-[10px] text-fg-dim">
                      <span className="capitalize">{t.type.replace(/_/g, ' ')}</span>
                      {t.distance_m !== undefined && (
                        <span className="mono text-sci">
                          {t.distance_m >= 1000 ? `${(t.distance_m / 1000).toFixed(1)} km from base` : `${t.distance_m} m`}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="msr" className="space-y-3.5">
          <SampleDepotCard />
        </TabsContent>
      </Tabs>

      {/* Workflow step navigator */}
      <div className="pt-3 border-t border-line flex items-center justify-between">
        <Button size="sm" variant="ghost" asChild>
          <Link to="/landing">← Back to Landing Sites</Link>
        </Button>
        <Button size="sm" variant="sci" asChild>
          <Link to="/resources">Proceed to Water & Resources →</Link>
        </Button>
      </div>
    </aside>
      </div>
    </div>
  )
}
