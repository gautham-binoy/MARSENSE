import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpen,
  Compass,
  Database,
  Download,
  ExternalLink,
  Mountain,
  ShieldCheck,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PageHeader, ReliabilityBadge, Spinner } from '@/components/common'

export default function MethodologyPage() {
  const { data: datasetsData, loading } = useQuery('datasets', api.datasets)
  const [activeTab, setActiveTab] = useState<'datasets' | 'formulas' | 'reliability' | 'citations'>('datasets')

  const datasets = datasetsData?.datasets ?? []

  return (
    <div className="absolute inset-0 flex flex-col overflow-y-auto bg-space p-4 space-y-4">
      {/* Header */}
      <div className="border-b border-line pb-3">
        <PageHeader
          title="Scientific Methodology, Mathematics & Data Provenance"
          subtitle="Transparent mathematical formulas, reliability classification vocabulary, NASA dataset registry, and academic citations."
        >
          <div className="flex items-center gap-2">
            <Button size="sm" variant="sci" asChild>
              <a href="/MARSENSE_OPERATIONS_MANUAL.pdf" download="MARSENSE_OPERATIONS_MANUAL.pdf">
                <Download className="h-3.5 w-3.5 mr-1" /> Operations Manual (PDF)
              </a>
            </Button>
            <Badge variant="ghost">NASA Space Apps 2026</Badge>
            <Button size="sm" variant="secondary" asChild>
              <Link to="/">← Back to Mission Control</Link>
            </Button>
          </div>
        </PageHeader>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="datasets">
            <Database className="h-3.5 w-3.5 mr-1" /> Datasets ({datasets.length})
          </TabsTrigger>
          <TabsTrigger value="formulas">
            <Mountain className="h-3.5 w-3.5 mr-1" /> Scientific Formulas
          </TabsTrigger>
          <TabsTrigger value="reliability">
            <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Reliability
          </TabsTrigger>
          <TabsTrigger value="citations">
            <BookOpen className="h-3.5 w-3.5 mr-1" /> Citations
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Live Dataset Registry */}
        <TabsContent value="datasets" className="space-y-3 pt-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] font-semibold text-fg">
              Integrated NASA, USGS & PDS Planetary Datasets
            </span>
            <span className="text-[11px] text-fg-dim mono">
              All sources verified and cached locally
            </span>
          </div>

          {loading && <div className="p-6 text-center text-fg-dim"><Spinner /> Querying dataset registry...</div>}

          <div className="space-y-2.5">
            {datasets.map((ds) => (
              <div key={ds.id} className="panel-2 p-3.5 rounded-lg border border-line space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[13px] text-fg">{ds.name}</span>
                    <ReliabilityBadge value={ds.reliability} />
                    <Badge variant={ds.status.status === 'cached' ? 'safe' : 'sci'} className="mono text-[9.5px]">
                      {ds.status.status.toUpperCase()}
                    </Badge>
                  </div>
                  <span className="mono text-[10.5px] text-fg-dim">
                    Resolution: <strong className="text-fg">{ds.resolution}</strong>
                  </span>
                </div>

                <p className="text-[11.5px] text-fg-muted leading-relaxed">{ds.description}</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-[10.5px] text-fg-dim pt-1 border-t border-line/60">
                  <div>Mission / Instrument: <strong className="text-fg">{ds.mission} ({ds.instrument})</strong></div>
                  <div>Processing: <strong className="text-fg">{ds.processing_level}</strong></div>
                  <div>Coverage: <strong className="text-fg capitalize">{ds.coverage.kind}</strong></div>
                </div>

                <div className="flex items-center justify-between text-[10.5px] text-fg-dim pt-1">
                  <span>Attribution: {ds.attribution}</span>
                  {ds.source_url && (
                    <a
                      href={ds.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sci hover:underline flex items-center gap-0.5"
                    >
                      Official Source <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* TAB 2: Mathematical Foundations */}
        <TabsContent value="formulas" className="space-y-4 pt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px] flex items-center gap-2">
                <Mountain className="h-4 w-4 text-sci" /> 1. Terrain Gradient (Horn 1981 Finite-Difference)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[11.5px] text-fg-muted leading-relaxed">
              <p>
                Slopes are calculated from 20 m/px elevation rasters using Horn's 3x3 weighted finite-difference gradient. At pixel (i, j), partial derivatives are evaluated as:
              </p>
              <div className="panel-3 p-2.5 rounded font-mono text-[11px] text-fg space-y-1">
                <div>dz/dx = [(z_{`{i-1, j+1}`} + 2 z_{`{i, j+1}`} + z_{`{i+1, j+1}`}) - (z_{`{i-1, j-1}`} + 2 z_{`{i, j-1}`} + z_{`{i+1, j-1}`})] / (8 · dx)</div>
                <div>dz/dy = [(z_{`{i-1, j-1}`} + 2 z_{`{i-1, j}`} + z_{`{i-1, j+1}`}) - (z_{`{i+1, j-1}`} + 2 z_{`{i+1, j}`} + z_{`{i+1, j+1}`})] / (8 · dy)</div>
                <div>Slope (degrees) = arctan(√(dz/dx² + dz/dy²)) × (180 / π)</div>
              </div>
              <p>
                Pixel width <code>dx</code> and height <code>dy</code> in metres are computed on the IAU Mars 2000 sphere (radius 3,396,190 m) adjusted for latitude.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px] flex items-center gap-2">
                <Mountain className="h-4 w-4 text-ember" /> 2. Terrain Ruggedness Index (Riley et al. 1999)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[11.5px] text-fg-muted leading-relaxed">
              <p>
                Roughness represents the RMS elevation variation between the central cell and its 8 adjacent neighbors:
              </p>
              <div className="panel-3 p-2.5 rounded font-mono text-[11px] text-fg">
                TRI = √[ (1/8) · ∑_{`{k=1}`}^{`{8}`} (z_k - z_center)² ]
              </div>
              <p>
                Computed at the native 20 m posting of the USGS CTX DTM. Obstacle density is estimated from local maxima exceeding 4 m TRI.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px] flex items-center gap-2">
                <Compass className="h-4 w-4 text-sci" /> 3. A* Pathfinding Cost Multpliers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[11.5px] text-fg-muted leading-relaxed">
              <p>
                Edge cost across the 8-connected grid is defined as ground distance multiplied by a piecewise penalty factor:
              </p>
              <div className="panel-3 p-2.5 rounded font-mono text-[11px] text-fg">
                Cost(a, b) = dist(a, b) × [ 1.0 + w_slope · f(slope) + w_rough · g(roughness) ]
              </div>
              <p>
                Where <code>f(slope)</code> and <code>g(roughness)</code> are zero below caution thresholds and scale up to infinity at impassable boundaries.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px] flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-safe" /> 4. Mission Feasibility Capping Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-[11.5px] text-fg-muted leading-relaxed">
              <p>
                To avoid false confidence, the engine enforces strict non-negotiable safety caps:
              </p>
              <ul className="space-y-1 text-fg list-disc pl-4">
                <li>If any core safety category (Terrain, Route, Resources, Return) scores below 30, overall feasibility is hard-capped at <strong>45/100 (NOT RECOMMENDED)</strong>.</li>
                <li>If data completeness is below 50%, overall feasibility is hard-capped at <strong>60/100 (INSUFFICIENT DATA)</strong>.</li>
                <li>Missing information never improves the score; it degrades confidence.</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Reliability Vocabulary */}
        <TabsContent value="reliability" className="space-y-3 pt-3">
          <p className="text-[12px] text-fg-muted">
            Every analytical value displayed in MARSENSE carries a verified reliability tag:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              {
                tag: 'measured',
                label: 'Measured Data',
                desc: 'Raw instrument measurements from NASA PDS archives (unit conversion only). Example: MEDA Barocap atmospheric pressure and air temperature, MSL RAD dosimeter readings.',
              },
              {
                tag: 'processed_observation',
                label: 'Processed Observation',
                desc: 'Controlled NASA/USGS product derived from measurements by mission science teams. Example: USGS CTX stereo DTM, Mars Trek orthomosaics, Tanaka et al. geologic map.',
              },
              {
                tag: 'derived',
                label: 'Derived Calculation',
                desc: 'Computed deterministically by MARSENSE from processed observations using documented peer-reviewed algorithms. Example: Horn slope, Riley TRI, A* path cost.',
              },
              {
                tag: 'inference',
                label: 'Scientific Inference',
                desc: 'Interpretation from peer-reviewed literature or spatial proximity. Example: aqueous mineral detections indicating ancient habitability, science target priority.',
              },
              {
                tag: 'simulation',
                label: 'Simulation Output',
                desc: 'Output of mass-balance models driven by user-supplied parameters and assumptions. Example: astronaut consumable depletion timelines.',
              },
              {
                tag: 'placeholder',
                label: 'Placeholder / Mock',
                desc: 'Illustrative dummy values. MARSENSE avoids placeholders in scientific scoring.',
              },
            ].map((item) => (
              <div key={item.tag} className="panel-2 p-3 rounded-lg border border-line space-y-1.5">
                <div className="flex items-center gap-2">
                  <ReliabilityBadge value={item.tag} />
                  <span className="font-semibold text-fg text-[12px]">{item.label}</span>
                </div>
                <p className="text-[11px] text-fg-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* TAB 4: Academic Citations */}
        <TabsContent value="citations" className="space-y-3 pt-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px] flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-sci" /> Academic References & Literature Base
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5 text-[11.5px] text-fg-muted">
                <li>
                  <strong className="text-fg">Horn, B.K.P. (1981):</strong> Hill shading and the reflectance map. <em>Proceedings of the IEEE</em>, 69(1), pp. 14–47.
                </li>
                <li>
                  <strong className="text-fg">Riley, S.J., DeGloria, S.D., Elliot, R. (1999):</strong> A terrain ruggedness index that quantifies topographic heterogeneity. <em>Intermountain Journal of Sciences</em>, 5, pp. 23–27.
                </li>
                <li>
                  <strong className="text-fg">Fergason, R.L. et al. (2020):</strong> Mars 2020 Terrain Relative Navigation flight product generation: Context Camera digital terrain model and orthoimage mosaic of Jezero crater. <em>51st Lunar and Planetary Science Conference</em>, #2020.
                </li>
                <li>
                  <strong className="text-fg">NASA (2022):</strong> Baseline Values and Assumptions Document (BVAD). <em>NASA/TP-2015-218570 Rev. 2</em>, National Aeronautics and Space Administration.
                </li>
                <li>
                  <strong className="text-fg">Hassler, D.M. et al. (2014):</strong> Mars' surface radiation environment measured with the Mars Science Laboratory's Curiosity rover. <em>Science</em>, 343(6169).
                </li>
                <li>
                  <strong className="text-fg">Goudge, T.A. et al. (2015):</strong> Assessing the mineralogy of the Jezero crater paleolake system: Implications for the landing site of the Mars 2020 mission. <em>Journal of Geophysical Research: Planets</em>, 120(4), pp. 775–798.
                </li>
                <li>
                  <strong className="text-fg">Farley, K.A. et al. (2022):</strong> Avarita and Séítah: Igneous rocks forming the floor of Jezero crater, Mars. <em>Science</em>, 377(6614).
                </li>
                <li>
                  <strong className="text-fg">Tanaka, K.L. et al. (2014):</strong> Geologic map of Mars. <em>USGS Scientific Investigations Map 3292</em>, scale 1:20,000,000.
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
