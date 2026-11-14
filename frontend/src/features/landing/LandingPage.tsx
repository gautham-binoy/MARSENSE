import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Download,
  Home,
  Play,
  Plus,
  Target,
  Trash2,
} from 'lucide-react'
import { MarsGlobe, type GlobeHandle } from '@/features/explorer/MarsGlobe'
import { api, type LandingCompare, type SiteScore } from '@/lib/api'
import { useMission } from '@/store/mission'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Bar, Callout, PageHeader, Spinner } from '@/components/common'
import { fmt } from '@/lib/utils'

const DEFAULT_CANDIDATES = [
  { name: 'Octavia E. Butler (Mars 2020)', lon: 77.4509, lat: 18.4446 },
  { name: 'Western Delta Front Scarp', lon: 77.3820, lat: 18.4280 },
  { name: 'Belva Crater Margin', lon: 77.3550, lat: 18.5120 },
  { name: 'South Séítah Outcrop', lon: 77.4420, lat: 18.4260 },
]

export default function LandingPage() {
  const globe = useRef<GlobeHandle>(null)
  const m = useMission()

  const [candidates, setCandidates] = useState<{ lon: number; lat: number; name: string }[]>(() => {
    return m.candidates.length > 0 ? m.candidates : DEFAULT_CANDIDATES
  })
  const [newSiteName, setNewSiteName] = useState('')
  const [newLon, setNewLon] = useState('')
  const [newLat, setNewLat] = useState('')
  const [radiusM] = useState(1000)
  const [weights, setWeights] = useState<Record<string, number>>({
    slope: 0.25,
    roughness: 0.20,
    elevation: 0.10,
    science_proximity: 0.15,
    geological_interest: 0.10,
    resource_evidence: 0.10,
    data_coverage: 0.10,
  })

  const [result, setResult] = useState<LandingCompare | null>(m.landing)
  const [selectedSite, setSelectedSite] = useState<SiteScore | null>(null)
  const [comparing, setComparing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runComparison = async (sitesToCompare = candidates, currentWeights = weights) => {
    if (sitesToCompare.length === 0) {
      setError('Please add at least one candidate site for evaluation.')
      return
    }
    setComparing(true)
    setError(null)
    try {
      const res = await api.landingCompare({
        sites: sitesToCompare,
        radius_m: radiusM,
        weights: currentWeights,
        profile: m.profile,
      })
      setResult(res)
      m.setLanding(res)
      m.setCandidates(sitesToCompare)
      if (res.sites.length > 0) {
        setSelectedSite(res.sites[0])
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Landing comparison failed')
    } finally {
      setComparing(false)
    }
  }

  useEffect(() => {
    if (!result) {
      void runComparison()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleAddCandidate = () => {
    const lo = parseFloat(newLon)
    const la = parseFloat(newLat)
    if (isNaN(lo) || isNaN(la)) return
    const name = newSiteName.trim() || `Candidate Site ${candidates.length + 1}`
    const updated = [...candidates, { lon: lo, lat: la, name }]
    setCandidates(updated)
    setNewSiteName('')
    setNewLon('')
    setNewLat('')
    void runComparison(updated)
  }

  const handleRemoveCandidate = (index: number) => {
    const updated = candidates.filter((_, i) => i !== index)
    setCandidates(updated)
    if (updated.length > 0) {
      void runComparison(updated)
    } else {
      setResult(null)
    }
  }

  const handleSetAsMissionBase = (site: SiteScore) => {
    m.setBase({ lon: site.lon, lat: site.lat })
    globe.current?.flyTo(site.lon, site.lat, 8000)
  }

  const exportLandingCsv = () => {
    if (!result || result.sites.length === 0) return
    const header = 'rank,site_name,longitude,latitude,overall_score,verdict,slope_score,roughness_score,elevation_score,science_score\n'
    const rows = result.sites
      .map(
        (s, i) =>
          `${i + 1},"${s.name}",${s.lon.toFixed(4)},${s.lat.toFixed(4)},${s.overall_score},${s.verdict},${s.factors.slope?.score ?? ''},${s.factors.roughness?.score ?? ''},${s.factors.elevation?.score ?? ''},${s.factors.science_proximity?.score ?? ''}`
      )
      .join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'MARSENSE_Landing_Sites_Comparison.csv'
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
          title="Landing Site & Habitat Base-Site Intelligence"
          subtitle="Multi-criteria decision support scoring slope, roughness, EDL atmosphere depth, science proximity, and geologic diversity."
        >
          <div className="flex items-center gap-2">
            {result && result.sites.length > 0 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={exportLandingCsv}
                title="Export landing comparison matrix to CSV"
              >
                <Download className="h-3.5 w-3.5 mr-1" />
                Export CSV
              </Button>
            )}
            <Button
              variant="sci"
              size="sm"
              onClick={() => runComparison()}
              disabled={comparing || candidates.length === 0}
            >
              {comparing ? <Spinner /> : <Play className="h-3.5 w-3.5" />}
              Compare Candidate Sites
            </Button>
          </div>
        </PageHeader>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_460px]">
        {/* Left: 3D Mars globe with candidate markers and 1 km evaluation zones */}
        <div className="relative min-h-[300px] lg:min-h-0 bg-space">
          <MarsGlobe ref={globe} showCandidates={true} initialView="jezero" />

          {/* Quick candidate fly buttons dock */}
          <div className="absolute top-4 left-4 glass-dock p-2 flex flex-wrap gap-1.5 shadow-2xl max-w-lg z-10 border border-white/10">
            {candidates.map((c) => (
              <Button
                key={c.name}
                size="xs"
                variant={selectedSite?.name === c.name ? 'sci' : 'ghost'}
                onClick={() => {
                  const s = result?.sites.find((st) => st.name === c.name)
                  if (s) setSelectedSite(s)
                  globe.current?.flyTo(c.lon, c.lat, 8000)
                }}
                className="rounded-md font-medium text-[11px]"
              >
                <Target className="h-3 w-3 mr-1" />
                {c.name}
              </Button>
            ))}
          </div>

          {/* Active base indicator */}
          {m.base && (
            <div className="absolute bottom-4 left-4 glass-dock px-3.5 py-2 flex items-center gap-2.5 text-[11.5px] shadow-xl z-10 border border-white/10">
              <Home className="h-4 w-4 text-amber-400" />
              <span className="text-slate-300">Current Mission Base:</span>
              <strong className="mono text-white font-semibold">{fmt.coord(m.base.lon, m.base.lat)}</strong>
            </div>
          )}
        </div>

        {/* Right side: Ranked comparison list, Factor breakdown, Weight Sliders */}
        <aside className="border-l border-line/80 bg-panel/85 backdrop-blur-xl overflow-y-auto p-4 space-y-4">
          {error && <Callout kind="danger">{error}</Callout>}

          <Tabs defaultValue="ranked" className="w-full">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="ranked">Ranked Sites ({result?.sites.length ?? 0})</TabsTrigger>
              <TabsTrigger value="weights">Factor Weights</TabsTrigger>
              <TabsTrigger value="add">Add Site</TabsTrigger>
            </TabsList>

            {/* TAB 1: Ranked Sites & Details */}
            <TabsContent value="ranked" className="space-y-3 pt-2">
              {result && result.sites.length > 0 ? (
                <div className="space-y-3">
                  {/* Ranked site cards */}
                  <div className="space-y-2">
                    {result.sites.map((site, idx) => {
                      const isBase = m.base?.lon === site.lon && m.base?.lat === site.lat
                      const isSelected = selectedSite?.name === site.name
                      return (
                        <div
                          key={site.name}
                          onClick={() => {
                            setSelectedSite(site)
                            globe.current?.flyTo(site.lon, site.lat, 8000)
                          }}
                          className={`panel-2 p-3 rounded-lg border transition-all cursor-pointer ${
                            isSelected
                              ? 'border-sci bg-panel-3 shadow-[0_0_12px_rgba(34,211,238,0.15)]'
                              : 'hover:border-fg-dim'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="mono text-[11px] font-bold text-fg-dim">#{idx + 1}</span>
                              <span className="font-semibold text-[12.5px] text-fg">{site.name}</span>
                              {isBase && <Badge variant="safe">Active Base</Badge>}
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`mono text-[14px] font-bold ${
                                  site.overall_score >= 70
                                    ? 'text-safe'
                                    : site.overall_score >= 50
                                    ? 'text-caution'
                                    : 'text-danger'
                                }`}
                              >
                                {site.overall_score}
                              </span>
                              <span className="text-[10px] text-fg-dim">/100</span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-fg-muted">
                            <span className="mono text-[10px]">{fmt.coord(site.lon, site.lat)}</span>
                            <Badge
                              variant={
                                site.verdict === 'favourable'
                                  ? 'safe'
                                  : site.verdict === 'marginal'
                                  ? 'caution'
                                  : 'danger'
                              }
                            >
                              {site.verdict.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Selected Site Detail Inspection */}
                  {selectedSite && (
                    <Card className="border-sci/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex items-center justify-between text-[13px]">
                          <span>{selectedSite.name} Evaluation</span>
                          <Button
                            size="xs"
                            variant="sci"
                            onClick={() => handleSetAsMissionBase(selectedSite)}
                          >
                            <Home className="h-3 w-3" /> Set as Mission Base
                          </Button>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {/* Factor sub-scores breakdown */}
                        <div className="space-y-2">
                          <span className="text-[11px] font-semibold text-fg">Evaluation Criteria Breakdown:</span>
                          {Object.entries(selectedSite.factors).map(([fKey, fVal]) => (
                            <div key={fKey} className="space-y-0.5 text-[10.5px]">
                              <div className="flex justify-between">
                                <span className="text-fg-muted capitalize">{fKey.replace(/_/g, ' ')}:</span>
                                <span className="mono font-semibold text-fg">
                                  {fVal.score}/100 <span className="text-fg-dim font-normal">({fVal.value ?? '—'} {fVal.unit})</span>
                                </span>
                              </div>
                              <Bar value={fVal.score} max={100} />
                            </div>
                          ))}
                        </div>

                        {/* Penalties and Favourable points */}
                        {selectedSite.favourable.length > 0 && (
                          <div className="space-y-1 text-[11px] text-safe pt-1 border-t border-line/60">
                            {selectedSite.favourable.map((fav, i) => (
                              <div key={i} className="flex items-start gap-1">
                                <span>✓</span>
                                <span>{fav}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {selectedSite.penalties.length > 0 && (
                          <div className="space-y-1 text-[11px] text-caution">
                            {selectedSite.penalties.map((pen, i) => (
                              <div key={i} className="flex items-start gap-1">
                                <span>⚠</span>
                                <span>{pen}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="text-[10px] text-fg-dim italic pt-1 border-t border-line/60">
                          {selectedSite.disclaimer}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="panel-2 p-6 text-center text-fg-dim text-[12px]">
                  No candidates evaluated yet.
                </div>
              )}
            </TabsContent>

            {/* TAB 2: Multi-Criteria Factor Weights Sliders */}
            <TabsContent value="weights" className="space-y-3 pt-2">
              <div className="space-y-3 panel-2 p-3 text-[11px]">
                <div className="flex justify-between items-center pb-1.5 border-b border-line">
                  <span className="font-semibold text-fg">Criteria Weights</span>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      const def = {
                        slope: 0.25,
                        roughness: 0.20,
                        elevation: 0.10,
                        science_proximity: 0.15,
                        geological_interest: 0.10,
                        resource_evidence: 0.10,
                        data_coverage: 0.10,
                      }
                      setWeights(def)
                      void runComparison(candidates, def)
                    }}
                  >
                    Reset Defaults
                  </Button>
                </div>

                {Object.entries(weights).map(([k, v]) => (
                  <div key={k} className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-fg-muted capitalize">{k.replace(/_/g, ' ')}</span>
                      <span className="mono text-fg">{(v * 100).toFixed(0)}%</span>
                    </div>
                    <Slider
                      value={[v * 100]}
                      min={0}
                      max={60}
                      step={5}
                      onValueChange={([val]) => {
                        const updated = { ...weights, [k]: val / 100 }
                        setWeights(updated)
                        void runComparison(candidates, updated)
                      }}
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* TAB 3: Add Candidate Site Form */}
            <TabsContent value="add" className="space-y-3 pt-2">
              <div className="panel-2 p-3 space-y-3 text-[11px]">
                <span className="font-semibold text-fg block">Add New Candidate Coordinate</span>
                <div>
                  <label className="text-fg-muted mb-0.5 block">Site Label / Name</label>
                  <Input
                    placeholder="e.g. Delta Inflow Delta Fan"
                    value={newSiteName}
                    onChange={(e) => setNewSiteName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-fg-muted mb-0.5 block">Longitude (°E)</label>
                    <Input
                      placeholder="e.g. 77.412"
                      value={newLon}
                      onChange={(e) => setNewLon(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-fg-muted mb-0.5 block">Latitude (°N)</label>
                    <Input
                      placeholder="e.g. 18.435"
                      value={newLat}
                      onChange={(e) => setNewLat(e.target.value)}
                    />
                  </div>
                </div>
                <Button size="sm" variant="sci" className="w-full" onClick={handleAddCandidate}>
                  <Plus className="h-3 w-3" /> Add and Re-Rank
                </Button>
              </div>

              {/* Candidates list with delete */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {candidates.map((c, i) => (
                  <div key={c.name} className="panel-2 p-2 flex items-center justify-between text-[11px]">
                    <div>
                      <div className="font-medium text-fg">{c.name}</div>
                      <div className="mono text-[10px] text-fg-dim">{fmt.coord(c.lon, c.lat)}</div>
                    </div>
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => handleRemoveCandidate(i)}
                      disabled={candidates.length <= 1}
                    >
                      <Trash2 className="h-3 w-3 text-fg-dim hover:text-danger" />
                    </Button>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          {/* Workflow step navigator */}
          <div className="pt-3 border-t border-line flex items-center justify-between">
            <Button size="sm" variant="ghost" asChild>
              <Link to="/terrain">← Back to Terrain</Link>
            </Button>
            <Button size="sm" variant="sci" asChild>
              <Link to="/science">Proceed to Science Discovery →</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
