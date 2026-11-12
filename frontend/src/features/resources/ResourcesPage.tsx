import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertCircle,
  Droplets,
  FlaskConical,
  Search,
} from 'lucide-react'
import { MarsGlobe, type GlobeHandle } from '@/features/explorer/MarsGlobe'
import { api, type Evidence } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { PageHeader, ReliabilityBadge, Spinner } from '@/components/common'

const EVIDENCE_CLASS_COLORS: Record<string, string> = {
  direct_observation: '#34d399',
  remote_sensing_indication: '#22d3ee',
  inference: '#fbbf24',
  unknown: '#9ca3af',
}

export default function ResourcesPage() {
  const globe = useRef<GlobeHandle>(null)
  const { data: evidenceData, loading } = useQuery('evidence', api.evidence)

  const [search, setSearch] = useState('')
  const [selectedClass, setSelectedClass] = useState<string>('all')
  const [activeEvidenceId, setActiveEvidenceId] = useState<string | null>(null)

  const features = evidenceData?.features ?? []
  const items: Evidence[] = features.map((f) => ({
    id: f.properties.id,
    name: f.properties.name,
    category: f.properties.category,
    evidence_class: f.properties.evidence_class,
    geometry_type: f.properties.geometry_type,
    radius_m: f.properties.radius_m,
    minerals: f.properties.minerals ?? [],
    instrument: f.properties.instrument,
    resolution_m: f.properties.resolution_m,
    interpretation: f.properties.interpretation,
    uncertainty: f.properties.uncertainty,
    sources: f.properties.sources ?? [],
  }))

  const activeEvidence = items.find((e) => e.id === activeEvidenceId)

  const filtered = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.minerals.some((m) => m.toLowerCase().includes(search.toLowerCase())) ||
      item.category.toLowerCase().includes(search.toLowerCase())
    const matchesClass = selectedClass === 'all' || item.evidence_class === selectedClass
    return matchesSearch && matchesClass
  })

  const handleSelectEvidence = (e: Evidence) => {
    setActiveEvidenceId(e.id)
    const feat = features.find((f) => f.properties.id === e.id)
    if (feat) {
      const [lon, lat] = feat.geometry.coordinates as number[]
      globe.current?.flyTo(lon, lat, 7000)
    }
  }

  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden bg-space">
      {/* Header bar */}
      <div className="border-b border-line bg-panel/90 px-4 py-2.5 backdrop-blur z-10 shrink-0">
        <PageHeader
          title="Water Resources & Aqueous Mineralogy Intelligence"
          subtitle="Direct in-situ observations and orbital spectra of ancient aqueous alteration. Honest appraisal of Martian volatiles."
        >
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" asChild>
              <Link to="/environment">Environmental Context →</Link>
            </Button>
          </div>
        </PageHeader>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[1fr_460px]">
        {/* Left: 3D Mars globe showing mineral evidence footprints */}
        <div className="relative min-h-[300px] lg:min-h-0 scanline">
          <MarsGlobe ref={globe} showRoute={true} initialView="jezero" />

          {/* Water-Ice Integrity Alert Floating Pill */}
          <div className="absolute top-3 left-3 right-3 lg:right-auto panel-2 p-2.5 shadow-xl max-w-lg border border-caution/40">
            <div className="flex items-start gap-2 text-[11px]">
              <AlertCircle className="h-4 w-4 text-caution shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-fg">Critical Water-Ice Finding: </span>
                <span className="text-fg-muted">
                  No orbital radar (SHARAD) or neutron detector indicates near-surface ice at Jezero (18°N).
                  Aqueous mineral detections indicate <strong className="text-fg">ancient water activity</strong>, not accessible ice reserves.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right side: Evidence Directory, ISRU Dehydration Realities, Inspection */}
        <aside className="border-l border-line bg-panel/80 overflow-y-auto p-4 space-y-3.5">
          {/* Scientific Disclaimer Card */}
          <div className="panel-2 p-3 rounded-lg border border-line text-[11px] space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-sci-2">
              <FlaskConical className="h-3.5 w-3.5" /> ISRU Pyrolysis Note (NASA BVAD & Literature)
            </div>
            <p className="text-fg-muted leading-relaxed">
              Extracting water from hydrated smectite clays or Mg-carbonates requires high-temperature baking (&gt;450°C), consuming substantial power ({'&gt;'}3 kWh per kg H2O). Mission plans should not count on spontaneous in-situ water production at Jezero.
            </p>
          </div>

          {/* Search & Filter pills */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-fg-dim" />
              <Input
                placeholder="Search minerals, clays, carbonates, or instruments..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 text-[11.5px]"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {['all', 'direct_observation', 'remote_sensing_indication', 'inference'].map((clsKey) => (
                <Button
                  key={clsKey}
                  size="xs"
                  variant={selectedClass === clsKey ? 'sci' : 'ghost'}
                  onClick={() => setSelectedClass(clsKey)}
                  className="capitalize text-[10.5px]"
                >
                  {clsKey === 'all'
                    ? 'All Classes'
                    : clsKey === 'direct_observation'
                    ? 'Direct (In-situ)'
                    : clsKey === 'remote_sensing_indication'
                    ? 'Remote Sensing'
                    : 'Inference'}
                </Button>
              ))}
            </div>
          </div>

          {/* Active Detail Inspection Card */}
          {activeEvidence && (
            <Card className="border-sci/40 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-start justify-between text-[13px]">
                  <div>
                    <span className="font-bold text-fg flex items-center gap-1.5">
                      <Droplets className="h-4 w-4 text-sci" /> {activeEvidence.name}
                    </span>
                    <div className="flex items-center gap-1.5 mt-1">
                      <ReliabilityBadge value={activeEvidence.evidence_class} />
                      <Badge variant="ghost" className="capitalize text-[10px]">
                        {activeEvidence.category.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-[11px]">
                <p className="text-fg-muted leading-relaxed">{activeEvidence.interpretation}</p>

                <div className="panel-2 p-2 rounded text-[10.5px] space-y-1">
                  <div className="font-semibold text-sci-2">Minerals Detected:</div>
                  <div className="flex flex-wrap gap-1">
                    {activeEvidence.minerals.map((m, i) => (
                      <span key={i} className="px-1.5 py-0.5 rounded bg-panel-3 text-fg mono text-[10px] border border-line">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5 text-[10.5px] text-fg-dim">
                  <div>Instrument: <strong className="text-fg">{activeEvidence.instrument}</strong></div>
                  <div>Resolution: <strong className="text-fg mono">{activeEvidence.resolution_m} m/px</strong></div>
                  <div>Footprint Radius: <strong className="text-fg mono">{activeEvidence.radius_m} m</strong></div>
                  <div>Uncertainty: <strong className="text-fg">{activeEvidence.uncertainty}</strong></div>
                </div>

                {activeEvidence.sources && activeEvidence.sources.length > 0 && (
                  <div className="pt-2 border-t border-line/60 text-[10px] text-fg-dim space-y-0.5">
                    <span className="font-semibold text-fg">Published Citations:</span>
                    {activeEvidence.sources.map((src, i) => (
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

          {/* Evidence directory list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11.5px]">
              <span className="font-semibold text-fg">Catalogued Mineral Alteration ({filtered.length})</span>
              <span className="text-fg-dim mono text-[10px]">USGS / CRISM / PIXL</span>
            </div>

            {loading && <div className="p-4 text-center text-fg-dim"><Spinner /> Loading mineral catalogue...</div>}

            <div className="space-y-1.5 max-h-96 overflow-y-auto">
              {filtered.map((e) => {
                const isActive = activeEvidenceId === e.id
                return (
                  <div
                    key={e.id}
                    onClick={() => handleSelectEvidence(e)}
                    className={`panel-2 p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isActive
                        ? 'border-sci bg-panel-3 shadow-[0_0_10px_rgba(34,211,238,0.15)]'
                        : 'hover:border-fg-dim'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-[12px] text-fg flex items-center gap-1.5">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: EVIDENCE_CLASS_COLORS[e.evidence_class] ?? '#9ca3af' }}
                        />
                        {e.name}
                      </span>
                      <ReliabilityBadge value={e.evidence_class} />
                    </div>

                    <p className="text-[10.5px] text-fg-muted line-clamp-2">{e.interpretation}</p>

                    <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-line/60 text-[10px] text-fg-dim">
                      <span>{e.instrument}</span>
                      <span className="mono text-fg">{e.minerals.slice(0, 2).join(', ')}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Workflow step navigator */}
          <div className="pt-3 border-t border-line flex items-center justify-between">
            <Button size="sm" variant="ghost" asChild>
              <Link to="/science">← Back to Science Discovery</Link>
            </Button>
            <Button size="sm" variant="sci" asChild>
              <Link to="/environment">Proceed to Environment & Radiation →</Link>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  )
}
