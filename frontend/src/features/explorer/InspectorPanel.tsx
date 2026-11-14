import { useState } from 'react'
import { Bookmark, Crosshair, Flag, MapPin, Plus, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { invalidate, useQuery } from '@/lib/useQuery'
import { useMap } from '@/store/map'
import { useMission } from '@/store/mission'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Callout, ProvenanceList, ReliabilityBadge, Spinner, Stat, classTone } from '@/components/common'
import { fmt } from '@/lib/utils'

export function InspectorPanel({ onFly }: { onFly?: (lon: number, lat: number) => void }) {
  const selected = useMap((s) => s.selected)
  const inspection = useMap((s) => s.inspection)
  const inspecting = useMap((s) => s.inspecting)
  const setBase = useMission((s) => s.setBase)
  const addCandidate = useMission((s) => s.addCandidate)
  const addRoutePoint = useMission((s) => s.addRoutePoint)
  const toggleTarget = useMission((s) => s.toggleTarget)
  const missionTargets = useMission((s) => s.targets)
  const [bmName, setBmName] = useState('')
  const [saving, setSaving] = useState(false)

  if (!selected) {
    return (
      <div className="p-4 text-[12.5px] text-slate-400 space-y-3">
        <div className="flex items-center gap-2 text-white font-semibold text-[13.5px]">
          <Crosshair className="h-4 w-4 text-sci" /> Location Inspector
        </div>
        <p className="leading-relaxed">
          Click anywhere on Mars to read elevation, slope, roughness and nearby science from the loaded datasets. Inside the Jezero CTX DTM footprint you get 20 m terrain; elsewhere the coarse MOLA grid.
        </p>
      </div>
    )
  }

  const t = inspection?.terrain

  const save = async () => {
    setSaving(true)
    try {
      await api.addBookmark({
        name: bmName || `Point ${fmt.coord(selected.lon, selected.lat)}`,
        lon: selected.lon,
        lat: selected.lat,
        snapshot: inspection ?? undefined,
      })
      invalidate('bookmarks')
      setBmName('')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 space-y-4 fade-in">
      {/* Selected Location Pill */}
      <div className="flex items-start justify-between gap-2 p-3 bg-slate-900/60 rounded-xl border border-line/60">
        <div>
          <div className="label flex items-center gap-1.5 text-slate-400">
            <MapPin className="h-3.5 w-3.5 text-sci" /> Selected location
          </div>
          <div className="mono text-[13px] font-semibold text-white mt-1">
            {fmt.coord(selected.lon, selected.lat)}
          </div>
        </div>
        {inspecting ? <Spinner /> : t && <ReliabilityBadge value={t.reliability} />}
      </div>

      {t && !t.covered && <Callout kind="warn">{t.note ?? 'No terrain data at this location.'}</Callout>}

      {t?.covered && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Stat label="Elevation" value={fmt.int(t.elevation_m)} unit="m" hint="Metres above the MOLA areoid" />
            <Stat label="Slope" value={fmt.deg(t.slope_deg)} tone={classTone(t.terrain_class)} hint="Horn 3x3 gradient at the DEM posting" />
            <Stat
              label="Roughness"
              value={t.roughness_resolved ? fmt.num(t.roughness_m, 2) : 'n/a'}
              unit={t.roughness_resolved ? 'm' : ''}
              hint={t.roughness_resolved ? 'RMS terrain ruggedness index over 8 neighbours' : 'Unresolved on coarse DEM'}
            />
            <Stat label="Local slope p90" value={fmt.deg(t.local_slope_p90_deg)} hint="90th percentile slope within ~250 m" />
          </div>

          <div className="flex items-center gap-2 text-[11.5px] bg-slate-900/40 p-2.5 rounded-lg border border-line/40">
            <span className="text-slate-400">Class</span>
            <Badge variant={classTone(t.terrain_class) === 'default' ? 'default' : classTone(t.terrain_class)}>
              {t.terrain_class ?? 'unknown'}
            </Badge>
            <span className="text-slate-400 ml-auto mono text-[11px]">
              {t.dataset_id} · {t.resolution_m && t.resolution_m >= 100 ? `${Math.round(t.resolution_m)} m` : `${t.resolution_m} m`}
            </span>
          </div>

          {t.note && <Callout kind="warn">{t.note}</Callout>}
          <div className="text-[11px] text-slate-400">
            Confidence {fmt.pct(inspection?.confidence)} — based on DEM resolution and coverage.
          </div>
        </div>
      )}

      {/* Nearby Science Targets */}
      {inspection?.nearby_targets?.length ? (
        <div className="space-y-1.5 pt-2 border-t border-line/60">
          <div className="label text-slate-400">Nearby science targets</div>
          <ul className="space-y-1">
            {inspection.nearby_targets.map((n) => (
              <li key={n.id} className="flex items-center gap-2 text-[12px] p-1.5 rounded-lg hover:bg-slate-800/40 transition-colors">
                <button className="text-sci-2 hover:underline truncate cursor-pointer text-left font-medium" onClick={() => onFly?.(n.lon, n.lat)}>
                  {n.name}
                </button>
                <span className="mono text-slate-400 text-[11px] ml-auto">{fmt.km(n.distance_m)}</span>
                <Button
                  size="xs"
                  variant={missionTargets.includes(n.id) ? 'sci' : 'ghost'}
                  onClick={() => toggleTarget(n.id)}
                  title="Toggle as mission target"
                  className="h-6 w-6 p-0"
                >
                  <Flag className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Nearby Minerals */}
      {inspection?.nearby_evidence?.length ? (
        <div className="space-y-1.5 pt-2 border-t border-line/60">
          <div className="label text-slate-400">Nearby mineral / water evidence</div>
          <ul className="space-y-1 text-[11.5px]">
            {inspection.nearby_evidence.map((e) => (
              <li key={e.id} className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/30">
                <span className="truncate text-slate-200">{e.name}</span>
                <Badge
                  variant={
                    e.evidence_class === 'direct_observation'
                      ? 'safe'
                      : e.evidence_class === 'remote_sensing_indication'
                        ? 'sci'
                        : 'caution'
                  }
                  className="ml-auto text-[9.5px]"
                >
                  {e.evidence_class.split('_')[0]}
                </Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Fast Action Buttons */}
      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line/60">
        <Button size="sm" variant="default" onClick={() => setBase(selected)} title="Use as mission base">
          Set base
        </Button>
        <Button size="sm" variant="secondary" onClick={() => addCandidate({ lon: selected.lon, lat: selected.lat })} title="Add as landing candidate">
          <Plus className="h-3.5 w-3.5" /> Candidate
        </Button>
        <Button size="sm" variant="secondary" onClick={() => addRoutePoint({ lon: selected.lon, lat: selected.lat })} title="Append to route">
          <Plus className="h-3.5 w-3.5" /> Route pt
        </Button>
      </div>

      {/* Bookmark Save Form */}
      <div className="flex gap-2">
        <Input placeholder="Bookmark name" value={bmName} onChange={(e) => setBmName(e.target.value)} />
        <Button size="sm" variant="sci" onClick={save} disabled={saving}>
          <Bookmark className="h-3.5 w-3.5" /> Save
        </Button>
      </div>

      <ProvenanceList items={inspection?.provenance} />
    </div>
  )
}

export function BookmarkList({ onFly }: { onFly: (lon: number, lat: number) => void }) {
  const { data } = useQuery('bookmarks', api.bookmarks)
  const setSelected = useMap((s) => s.setSelected)

  if (!data?.length) return <div className="p-4 text-[12px] text-slate-400">No bookmarks saved yet.</div>

  return (
    <ul className="divide-y divide-line/60 p-2">
      {data.map((b) => (
        <li key={b.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-slate-800/40 text-[12px] transition-colors">
          <Bookmark className="h-3.5 w-3.5 text-sci shrink-0" />
          <button
            className="truncate text-left text-slate-200 hover:text-sci-2 cursor-pointer font-medium"
            onClick={() => {
              onFly(b.lon, b.lat)
              setSelected({ lon: b.lon, lat: b.lat })
            }}
          >
            {b.name}
          </button>
          <span className="mono text-[10.5px] text-slate-400 ml-auto">
            {b.lat.toFixed(3)}, {b.lon.toFixed(3)}
          </span>
          <button
            className="text-slate-500 hover:text-danger cursor-pointer p-1"
            onClick={async () => {
              await api.deleteBookmark(b.id)
              invalidate('bookmarks')
            }}
            aria-label="delete bookmark"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </li>
      ))}
    </ul>
  )
}
