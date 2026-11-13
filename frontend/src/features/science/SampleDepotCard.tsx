import { useState } from 'react'
import {
  Archive,
  CheckCircle2,
  Plus,
} from 'lucide-react'
import { useMission } from '@/store/mission'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Callout, Stat } from '@/components/common'

export interface SampleTube {
  id: string
  tubeNumber: number
  targetName: string
  solDropped: number
  rockType: string
  geologicUnit: string
  biosignaturePriority: 'Critical' | 'High' | 'Medium' | 'Control'
  sampleMassGrams: number
  description: string
}

const SAMPLE_TUBES: SampleTube[] = [
  {
    id: 'tube_258',
    tubeNumber: 258,
    targetName: 'Atsá',
    solDropped: 668,
    rockType: 'Fine-Grained Lacustrine Mudstone',
    geologicUnit: 'Delta Front (Shenandoah)',
    biosignaturePriority: 'Critical',
    sampleMassGrams: 54,
    description: 'Mudstone rich in clays with highest potential for preserving ancient microbial biosignatures and organic molecules.',
  },
  {
    id: 'tube_268',
    tubeNumber: 268,
    targetName: 'Amalik',
    solDropped: 675,
    rockType: 'Siltstone with Sulfate Veins',
    geologicUnit: 'Delta Front',
    biosignaturePriority: 'Critical',
    sampleMassGrams: 51,
    description: 'Fine sedimentary layers containing hydrated sulfates, recording ancient lake evaporation episodes.',
  },
  {
    id: 'tube_310',
    tubeNumber: 310,
    targetName: 'Hazeltop',
    solDropped: 685,
    rockType: 'Laminated Bottomset Mudstone',
    geologicUnit: 'Delta Bottomset',
    biosignaturePriority: 'Critical',
    sampleMassGrams: 53,
    description: 'Deepest quiescent depositional layer in Jezero paleolake.',
  },
  {
    id: 'tube_241',
    tubeNumber: 241,
    targetName: 'Malay',
    solDropped: 653,
    rockType: 'Olivine-Rich Cumulate Bedrock',
    geologicUnit: 'South Séítah',
    biosignaturePriority: 'High',
    sampleMassGrams: 58,
    description: 'Igneous cumulate providing precise radiometric age-dating for early Martian history.',
  },
  {
    id: 'tube_262',
    tubeNumber: 262,
    targetName: 'Kukewkgp',
    solDropped: 672,
    rockType: 'Cross-Bedded Sandstone',
    geologicUnit: 'Delta Front',
    biosignaturePriority: 'High',
    sampleMassGrams: 59,
    description: 'Coarser delta foreset sediments recording ancient river flow velocities.',
  },
  {
    id: 'tube_292',
    tubeNumber: 292,
    targetName: 'Bearwallow',
    solDropped: 682,
    rockType: 'Fluvial Conglomerate',
    geologicUnit: 'Delta Top (Kodiak)',
    biosignaturePriority: 'High',
    sampleMassGrams: 60,
    description: 'High-energy flood deposits carrying distant highland rocks from outside the crater rim.',
  },
  {
    id: 'tube_254',
    tubeNumber: 254,
    targetName: "Ha'ahóni",
    solDropped: 659,
    rockType: 'Basaltic Lava Flow',
    geologicUnit: 'Máaz Formation',
    biosignaturePriority: 'Medium',
    sampleMassGrams: 62,
    description: 'Volcanic caprock overlying the delta remnants, constraining volcanic eras.',
  },
  {
    id: 'tube_285',
    tubeNumber: 285,
    targetName: 'Crosswind Lake',
    solDropped: 680,
    rockType: 'Aeolian Regolith & Coarse Sand',
    geologicUnit: 'Three Forks Ripple Field',
    biosignaturePriority: 'Medium',
    sampleMassGrams: 65,
    description: 'Contemporary surface regolith providing geotechnical and radiation shielding metrics.',
  },
  {
    id: 'tube_277',
    tubeNumber: 277,
    targetName: 'Roubion',
    solDropped: 677,
    rockType: 'Atmospheric Gas Sample',
    geologicUnit: 'Crater Floor',
    biosignaturePriority: 'Control',
    sampleMassGrams: 12,
    description: 'First sealed Martian atmosphere sample for isotopic composition verification.',
  },
  {
    id: 'tube_301',
    tubeNumber: 301,
    targetName: 'Mageik',
    solDropped: 684,
    rockType: 'Witness Assembly Blank',
    geologicUnit: 'Crater Floor',
    biosignaturePriority: 'Control',
    sampleMassGrams: 10,
    description: 'Clean room witness tube tracking terrestrial contaminants during core caching.',
  },
]

// Authentic coordinates of Three Forks sample depot
const THREE_FORKS_COORDS = { lon: 77.4113, lat: 18.4541 }

export function SampleDepotCard() {
  const m = useMission()
  const [taggedTubes, setTaggedTubes] = useState<Set<string>>(
    () => new Set(['tube_258', 'tube_268', 'tube_310', 'tube_241'])
  )
  const [routeAdded, setRouteAdded] = useState(false)

  const toggleTag = (id: string) => {
    setTaggedTubes((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectedTubes = SAMPLE_TUBES.filter((t) => taggedTubes.has(t.id))
  const totalTaggedMassGrams = selectedTubes.reduce((sum, t) => sum + t.sampleMassGrams, 0)
  const criticalCount = selectedTubes.filter((t) => t.biosignaturePriority === 'Critical').length

  const handleAddDepotToRoute = () => {
    m.addRoutePoint({
      lon: THREE_FORKS_COORDS.lon,
      lat: THREE_FORKS_COORDS.lat,
      label: 'Three Forks MSR Sample Depot',
    })
    setRouteAdded(true)
    setTimeout(() => setRouteAdded(false), 3000)
  }

  return (
    <Card className="border-line shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-[14px] text-fg">
            <Archive className="h-4 w-4 text-purple-400" />
            Three Forks Sample Return Depot (NASA / ESA MSR)
          </CardTitle>
          <Badge variant="sci">10 Cached Tubes at Three Forks</Badge>
        </div>
        <p className="text-[11px] text-fg-dim">
          Perseverance deposited 10 titanium sample tubes on the Jezero crater floor (sols 653–685). Human expeditions can collect these verified cores for Earth return.
        </p>
      </CardHeader>

      <CardContent className="space-y-4 text-[12px]">
        {/* Telemetry Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat
            label="Tagged Tubes"
            value={`${selectedTubes.length} / 10`}
            hint={`${criticalCount} critical astrobiology`}
            tone="sci"
          />
          <Stat
            label="Payload Core Mass"
            value={`${totalTaggedMassGrams} g`}
            hint="Net scientific rock/regolith"
            tone="safe"
          />
          <Stat
            label="Depot Location"
            value="Three Forks"
            hint="18.454°N, 77.411°E"
          />
          <Stat
            label="Mission Flight Rule"
            value="MSR Backup"
            hint="Joint NASA / ESA cache"
          />
        </div>

        {routeAdded && (
          <Callout kind="info">
            <div className="flex items-center gap-1.5 text-safe">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>Three Forks Sample Depot added as a waypoint on the mission route!</span>
            </div>
          </Callout>
        )}

        {/* Action Button: Add Depot to Route */}
        <div className="panel-2 p-3 rounded-lg border border-line flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[11.5px]">
          <div>
            <span className="font-semibold text-fg">Three Forks Depot Waypoint:</span>
            <p className="text-[10.5px] text-fg-dim">
              77.4113°E, 18.4541°N · Located on smooth crater floor near delta entrance.
            </p>
          </div>
          <Button
            size="sm"
            variant="sci"
            onClick={handleAddDepotToRoute}
            className="shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Depot to Mission Route
          </Button>
        </div>

        {/* Sample Tube Catalogue */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11.5px]">
            <span className="font-semibold text-fg">Cached Core Directory:</span>
            <span className="text-fg-dim mono text-[10.5px]">Click checkbox to tag for retrieval</span>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {SAMPLE_TUBES.map((tube) => {
              const isTagged = taggedTubes.has(tube.id)
              return (
                <div
                  key={tube.id}
                  onClick={() => toggleTag(tube.id)}
                  className={`panel-2 p-3 rounded-lg border transition-all cursor-pointer ${
                    isTagged
                      ? 'border-purple-400/60 bg-purple-500/10 shadow-[0_0_10px_rgba(168,85,247,0.15)]'
                      : 'hover:border-fg-dim'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isTagged}
                        onChange={() => {}} // handled by div onClick
                        className="h-3.5 w-3.5 rounded border-line text-purple-500 focus:ring-0 cursor-pointer"
                      />
                      <span className="font-semibold text-fg text-[12px]">
                        Tube #{tube.tubeNumber} — {tube.targetName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge
                        variant={
                          tube.biosignaturePriority === 'Critical'
                            ? 'safe'
                            : tube.biosignaturePriority === 'High'
                            ? 'caution'
                            : 'ghost'
                        }
                      >
                        {tube.biosignaturePriority}
                      </Badge>
                      <span className="mono text-[10.5px] text-fg-dim">{tube.sampleMassGrams} g</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-fg-muted pl-5">{tube.description}</p>

                  <div className="flex items-center justify-between text-[10px] text-fg-dim mt-2 pt-1.5 border-t border-line/60 pl-5">
                    <span>Type: <strong className="text-fg">{tube.rockType}</strong></span>
                    <span>Unit: <strong className="text-fg">{tube.geologicUnit}</strong></span>
                    <span className="mono">Sol {tube.solDropped}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
