import { useState } from 'react'
import { ChevronDown, ChevronRight, Info } from 'lucide-react'
import { api, type MapLayer } from '@/lib/api'
import { useQuery } from '@/lib/useQuery'
import { useMap } from '@/store/map'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Legend, ReliabilityBadge } from '@/components/common'
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

const GROUPS: { id: string; label: string }[] = [
  { id: 'basemap', label: 'Basemap' },
  { id: 'imagery', label: 'Surface imagery' },
  { id: 'terrain', label: 'Terrain (CTX DTM)' },
  { id: 'geology', label: 'Geology' },
  { id: 'mineralogy', label: 'Mineralogy' },
  { id: 'thermal', label: 'Thermal' },
  { id: 'water', label: 'Water-ice' },
  { id: 'rovers', label: 'Rovers' },
  { id: 'targets', label: 'Science targets' },
]

export function LayerPanel({ compact = false }: { compact?: boolean }) {
  const { data: layers } = useQuery('layers', api.layers)
  const basemap = useMap((s) => s.basemap)
  const setBasemap = useMap((s) => s.setBasemap)
  const active = useMap((s) => s.active)
  const toggle = useMap((s) => s.toggle)
  const opacity = useMap((s) => s.opacity)
  const setOpacity = useMap((s) => s.setOpacity)
  const [open, setOpen] = useState<Record<string, boolean>>({ basemap: true, imagery: true, terrain: true, targets: true, rovers: true })
  if (!layers) return <div className="p-3 text-[11px] text-fg-dim">loading layer catalogue…</div>

  return (
    <div className="divide-y divide-line">
      {GROUPS.map((g) => {
        const items = layers.filter((l) => l.group === g.id)
        if (!items.length) return null
        const isOpen = open[g.id] ?? false
        return (
          <div key={g.id}>
            <button className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-panel-2" onClick={() => setOpen((o) => ({ ...o, [g.id]: !isOpen }))}>
              <span className="label">{g.label}</span>
              <span className="flex items-center gap-1.5 text-[10px] text-fg-dim">
                {g.id !== 'basemap' && <span>{items.filter((l) => active[l.id]).length}/{items.length}</span>}
                {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </span>
            </button>
            {isOpen && (
              <div className="pb-1.5">
                {items.map((l) => (
                  <LayerRow key={l.id} layer={l} compact={compact} isBasemapGroup={g.id === 'basemap'} checked={g.id === 'basemap' ? basemap === l.id : !!active[l.id]}
                    onToggle={(on) => (g.id === 'basemap' ? setBasemap(l.id) : toggle(l.id, on))} opacity={opacity[l.id] ?? l.default_opacity} onOpacity={(v) => setOpacity(l.id, v)} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function LayerRow({ layer, checked, onToggle, opacity, onOpacity, isBasemapGroup, compact }: { layer: MapLayer; checked: boolean; onToggle: (on: boolean) => void; opacity: number; onOpacity: (v: number) => void; isBasemapGroup: boolean; compact: boolean }) {
  const regional = !!layer.rectangle && (layer.rectangle.east - layer.rectangle.west) < 300
  return (
    <div className={cn('px-3 py-1.5', checked && 'bg-panel-2/60')}>
      <div className="flex items-center gap-2">
        <Switch checked={checked} onCheckedChange={onToggle} aria-label={`toggle ${layer.name}`} />
        <button className="flex-1 text-left text-[11.5px] text-fg truncate" onClick={() => onToggle(!checked)} title={layer.name}>{layer.name}</button>
        <ReliabilityBadge value={layer.reliability} />
        <Dialog>
          <DialogTrigger asChild>
            <button className="text-fg-dim hover:text-sci" aria-label={`about ${layer.name}`}><Info className="h-3.5 w-3.5" /></button>
          </DialogTrigger>
          <DialogContent className="p-4 space-y-3">
            <DialogTitle>{layer.name}</DialogTitle>
            <p className="text-[12px] text-fg-muted">{layer.description}</p>
            <dl className="grid grid-cols-[120px_1fr] gap-y-1 text-[11.5px]">
              <dt className="text-fg-dim">Source</dt><dd>{layer.source_note}</dd>
              <dt className="text-fg-dim">Dataset id</dt><dd className="mono">{layer.dataset_id}</dd>
              <dt className="text-fg-dim">Reliability</dt><dd><ReliabilityBadge value={layer.reliability} /></dd>
              <dt className="text-fg-dim">Acquisition</dt><dd>{layer.acquisition}</dd>
              <dt className="text-fg-dim">Resolution</dt><dd>{layer.resolution}</dd>
              {layer.units && <><dt className="text-fg-dim">Units</dt><dd>{layer.units}</dd></>}
              <dt className="text-fg-dim">Coverage</dt>
              <dd className="mono">{layer.rectangle ? `${layer.rectangle.west.toFixed(3)}–${layer.rectangle.east.toFixed(3)}°E, ${layer.rectangle.south.toFixed(3)}–${layer.rectangle.north.toFixed(3)}°N` : 'Global'}</dd>
              <dt className="text-fg-dim">Zoom range</dt><dd className="mono">{layer.min_zoom}–{layer.max_zoom}</dd>
              <dt className="text-fg-dim">Access</dt><dd className="mono break-all text-[10.5px]">{layer.url}</dd>
            </dl>
            {layer.legend && <Legend stops={layer.legend} type={layer.legend_type} units={layer.units} />}
          </DialogContent>
        </Dialog>
      </div>
      {checked && !isBasemapGroup && !compact && (
        <div className="mt-1.5 pl-9 space-y-1.5">
          {layer.type !== 'vector' && (
            <div className="flex items-center gap-2">
              <span className="label w-12">opacity</span>
              <Slider value={[Math.round(opacity * 100)]} min={5} max={100} step={5} onValueChange={([v]) => onOpacity(v / 100)} aria-label="layer opacity" />
              <span className="mono text-[10px] text-fg-dim w-8 text-right">{Math.round(opacity * 100)}%</span>
            </div>
          )}
          {layer.legend && <Legend stops={layer.legend} type={layer.legend_type} units={layer.units} />}
          <div className="text-[10px] text-fg-dim flex flex-wrap gap-x-2">
            <span>{layer.resolution}</span><span>·</span><span>{layer.acquisition}</span>
            {regional && <><span>·</span><span className="text-caution">regional coverage</span></>}
          </div>
        </div>
      )}
    </div>
  )
}
