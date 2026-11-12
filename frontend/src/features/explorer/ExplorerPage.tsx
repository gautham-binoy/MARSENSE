import { useCallback, useEffect, useRef, useState } from 'react'
import { Bookmark, Crosshair, Home, Layers, LocateFixed, MousePointer2, RotateCcw, Route as RouteIcon, Target } from 'lucide-react'
import { MarsGlobe, type GlobeHandle } from '@/features/explorer/MarsGlobe'
import { LayerPanel } from '@/features/explorer/LayerPanel'
import { BookmarkList, InspectorPanel } from '@/features/explorer/InspectorPanel'
import { api } from '@/lib/api'
import { useMap, type ClickMode } from '@/store/map'
import { useMission } from '@/store/mission'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Hint } from '@/components/ui/tooltip'
import { cn, fmt } from '@/lib/utils'

const MODES: { id: ClickMode; label: string; icon: typeof Crosshair; hint: string }[] = [
  { id: 'inspect', label: 'Inspect', icon: Crosshair, hint: 'Click to inspect terrain and nearby science' },
  { id: 'base', label: 'Base', icon: Home, hint: 'Click to place the mission base' },
  { id: 'candidate', label: 'Candidate', icon: Target, hint: 'Click to add a landing/base candidate for comparison' },
  { id: 'route', label: 'Route', icon: RouteIcon, hint: 'Click to append route waypoints' },
]

export default function ExplorerPage() {
  const globe = useRef<GlobeHandle>(null)
  const clickMode = useMap((s) => s.clickMode)
  const setClickMode = useMap((s) => s.setClickMode)
  const setSelected = useMap((s) => s.setSelected)
  const setInspection = useMap((s) => s.setInspection)
  const cameraHeight = useMap((s) => s.cameraHeight)
  const cursor = useMap((s) => s.cursor)
  const setBase = useMission((s) => s.setBase)
  const addCandidate = useMission((s) => s.addCandidate)
  const addRoutePoint = useMission((s) => s.addRoutePoint)
  const profile = useMission((s) => s.profile)
  const [tab, setTab] = useState('inspect')
  const [panelOpen, setPanelOpen] = useState(true)

  const inspect = useCallback(async (p: { lon: number; lat: number }) => {
    setSelected(p)
    setInspection(null, true)
    try {
      const r = await api.inspect(p.lon, p.lat, profile)
      setInspection(r)
    } catch {
      setInspection(null)
    }
  }, [profile, setInspection, setSelected])

  const onClick = useCallback((p: { lon: number; lat: number }) => {
    if (clickMode === 'base') setBase(p)
    else if (clickMode === 'candidate') addCandidate(p)
    else if (clickMode === 'route') addRoutePoint(p)
    void inspect(p)
    setTab('inspect')
  }, [clickMode, setBase, addCandidate, addRoutePoint, inspect])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return
      if (e.key === 'j') globe.current?.flyToJezero()
      if (e.key === 'r') globe.current?.reset()
      if (e.key === 'l') setPanelOpen((o) => !o)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="absolute inset-0 flex">
      <div className="relative flex-1 min-w-0 scanline">
        <MarsGlobe ref={globe} onClick={onClick} initialView="jezero" />

        {/* top-left: click modes */}
        <div className="absolute top-3 left-3 flex items-center gap-1 panel-2 p-1 shadow-xl">
          {MODES.map((m) => (
            <Hint key={m.id} label={m.hint}>
              <Button size="sm" variant={clickMode === m.id ? 'sci' : 'ghost'} onClick={() => setClickMode(m.id)} data-testid={`mode-${m.id}`}>
                <m.icon /> <span className="hidden sm:inline">{m.label}</span>
              </Button>
            </Hint>
          ))}
        </div>

        {/* top-right: camera */}
        <div className="absolute top-3 right-3 flex flex-col gap-1">
          <Hint label="Fly to Jezero Crater (J)"><Button size="icon-sm" variant="secondary" onClick={() => globe.current?.flyToJezero()} data-testid="fly-jezero"><LocateFixed /></Button></Hint>
          <Hint label="Reset to global view (R)"><Button size="icon-sm" variant="secondary" onClick={() => globe.current?.reset()} data-testid="reset-view"><RotateCcw /></Button></Hint>
          <Hint label="Toggle side panel (L)"><Button size="icon-sm" variant="secondary" onClick={() => setPanelOpen((o) => !o)}><Layers /></Button></Hint>
        </div>

        {/* bottom status bar */}
        <div className="absolute bottom-0 left-0 right-0 h-7 flex items-center justify-between px-3 text-[10.5px] mono text-fg-muted bg-gradient-to-t from-space/90 to-transparent pointer-events-none">
          <span className="flex items-center gap-2"><MousePointer2 className="h-3 w-3" />{cursor ? fmt.coord(cursor.lon, cursor.lat) : '—'}</span>
          <span>camera alt {cameraHeight > 1e6 ? `${(cameraHeight / 1e6).toFixed(2)} Mm` : cameraHeight > 1000 ? `${(cameraHeight / 1000).toFixed(1)} km` : `${Math.round(cameraHeight)} m`}</span>
          <span className="hidden md:inline">Mars 2000 sphere · planetocentric · E positive</span>
        </div>
      </div>

      <aside className={cn('w-[340px] shrink-0 border-l border-line bg-panel flex flex-col min-h-0 transition-all', !panelOpen && 'hidden')}>
        <Tabs value={tab} onValueChange={setTab} className="flex flex-col min-h-0 h-full">
          <div className="px-2 pt-2 border-b border-line">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="inspect"><Crosshair className="h-3 w-3 mr-1" />Inspect</TabsTrigger>
              <TabsTrigger value="layers"><Layers className="h-3 w-3 mr-1" />Layers</TabsTrigger>
              <TabsTrigger value="bookmarks"><Bookmark className="h-3 w-3 mr-1" />Marks</TabsTrigger>
            </TabsList>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <TabsContent value="inspect" className="mt-0"><InspectorPanel onFly={(lon, lat) => globe.current?.flyTo(lon, lat, 8000)} /></TabsContent>
            <TabsContent value="layers" className="mt-0"><LayerPanel /></TabsContent>
            <TabsContent value="bookmarks" className="mt-0"><BookmarkList onFly={(lon, lat) => globe.current?.flyTo(lon, lat, 8000)} /></TabsContent>
          </div>
        </Tabs>
      </aside>
    </div>
  )
}
