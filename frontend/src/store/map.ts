import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Inspection } from '@/lib/api'

export type ClickMode = 'inspect' | 'base' | 'route' | 'candidate' | 'bbox'

interface MapState {
  basemap: string
  active: Record<string, boolean>
  opacity: Record<string, number>
  clickMode: ClickMode
  selected: { lon: number; lat: number } | null
  inspection: Inspection | null
  inspecting: boolean
  cursor: { lon: number; lat: number } | null
  cameraHeight: number
  bbox: { west: number; south: number; east: number; north: number } | null
  bboxDraft: { lon: number; lat: number } | null
  setBasemap: (id: string) => void
  toggle: (id: string, on?: boolean) => void
  setOpacity: (id: string, v: number) => void
  setClickMode: (m: ClickMode) => void
  setSelected: (p: { lon: number; lat: number } | null) => void
  setInspection: (i: Inspection | null, loading?: boolean) => void
  setCursor: (c: { lon: number; lat: number } | null) => void
  setCameraHeight: (h: number) => void
  setBbox: (b: MapState['bbox']) => void
  setBboxDraft: (p: { lon: number; lat: number } | null) => void
}

export const useMap = create<MapState>()(
  persist(
    (set) => ({
      basemap: 'viking_mdim21_color',
      active: { jezero_hirise_mosaic: true, science_targets: true, m20_traverse: true },
      opacity: {},
      clickMode: 'inspect',
      selected: null,
      inspection: null,
      inspecting: false,
      cursor: null,
      cameraHeight: 1e7,
      bbox: null,
      bboxDraft: null,
      setBasemap: (basemap) => set({ basemap }),
      toggle: (id, on) => set((s) => ({ active: { ...s.active, [id]: on ?? !s.active[id] } })),
      setOpacity: (id, v) => set((s) => ({ opacity: { ...s.opacity, [id]: v } })),
      setClickMode: (clickMode) => set({ clickMode, bboxDraft: null }),
      setSelected: (selected) => set({ selected }),
      setInspection: (inspection, loading = false) => set({ inspection, inspecting: loading }),
      setCursor: (cursor) => set({ cursor }),
      setCameraHeight: (cameraHeight) => set({ cameraHeight }),
      setBbox: (bbox) => set({ bbox }),
      setBboxDraft: (bboxDraft) => set({ bboxDraft }),
    }),
    { name: 'marsense-map-v1', partialize: (s) => ({ basemap: s.basemap, active: s.active, opacity: s.opacity }) },
  ),
)
