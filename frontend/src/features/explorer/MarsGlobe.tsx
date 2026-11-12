/* Reusable Cesium Mars globe. Renders Trek/back-end imagery layers from the layer catalogue and mission overlays. */
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import * as Cesium from 'cesium'
import { useQuery } from '@/lib/useQuery'
import { api, type MapLayer, type Route } from '@/lib/api'
import { MARS_ELLIPSOID, cameraCartographic, configureCesiumForMars, flyTo, pickLonLat, providerFor } from '@/lib/cesium/mars'
import { useMap } from '@/store/map'
import { useMission } from '@/store/mission'

export interface GlobeHandle {
  flyTo: (lon: number, lat: number, height?: number) => void
  reset: () => void
  flyToJezero: () => void
  viewer: () => Cesium.Viewer | null
}

interface Props {
  className?: string
  onClick?: (p: { lon: number; lat: number }) => void
  showRoute?: boolean
  showCandidates?: boolean
  showRoutePoints?: boolean
  interactive?: boolean
  initialView?: 'globe' | 'jezero'
  extraRoutes?: Record<string, Route> | null
  highlightRoute?: string | null
}

const TARGET_COLORS: Record<string, string> = {
  landing_site: '#fb923c', igneous_unit: '#f472b6', sample_cache: '#a78bfa', sedimentary_deposit: '#fde68a', delta_remnant: '#fde68a',
  carbonate_unit: '#34d399', ancient_river_channel: '#60a5fa', geological_boundary: '#f87171', impact_crater: '#9ca3af',
}
const EVIDENCE_COLORS: Record<string, string> = { direct_observation: '#34d399', remote_sensing_indication: '#22d3ee', inference: '#fbbf24', unknown: '#9ca3af' }

export const MarsGlobe = forwardRef<GlobeHandle, Props>(function MarsGlobe(
  { className, onClick, showRoute = true, showCandidates = true, showRoutePoints = true, interactive = true, initialView = 'jezero', extraRoutes, highlightRoute },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const viewerRef = useRef<Cesium.Viewer | null>(null)
  const layerObjs = useRef<Map<string, Cesium.ImageryLayer>>(new Map())
  const overlays = useRef<Cesium.CustomDataSource | null>(null)
  const clickRef = useRef(onClick)
  clickRef.current = onClick

  const { data: layers } = useQuery('layers', api.layers)
  const { data: targets } = useQuery('targets', api.targets)
  const { data: evidence } = useQuery('evidence', api.evidence)
  const { data: traverse } = useQuery('traverse', api.traverse, { retry: false })
  const { data: bookmarks } = useQuery('bookmarks', api.bookmarks)

  const basemap = useMap((s) => s.basemap)
  const active = useMap((s) => s.active)
  const opacity = useMap((s) => s.opacity)
  const selected = useMap((s) => s.selected)
  const bbox = useMap((s) => s.bbox)
  const bboxDraft = useMap((s) => s.bboxDraft)
  const setCursor = useMap((s) => s.setCursor)
  const setCameraHeight = useMap((s) => s.setCameraHeight)
  const base = useMission((s) => s.base)
  const candidates = useMission((s) => s.candidates)
  const routePoints = useMission((s) => s.routePoints)
  const route = useMission((s) => s.route)
  const missionTargets = useMission((s) => s.targets)

  useImperativeHandle(ref, () => ({
    flyTo: (lon, lat, height = 25000) => viewerRef.current && flyTo(viewerRef.current, lon, lat, height),
    reset: () => viewerRef.current && viewerRef.current.camera.flyTo({ destination: Cesium.Cartesian3.fromDegrees(77, 10, 1.1e7, MARS_ELLIPSOID), duration: 1.5 }),
    flyToJezero: () => viewerRef.current && flyTo(viewerRef.current, 77.42, 18.40, 70000, 2.2),
    viewer: () => viewerRef.current,
  }))

  // --- create viewer
  useEffect(() => {
    if (!containerRef.current) return
    configureCesiumForMars()
    const viewer = new Cesium.Viewer(containerRef.current, {
      baseLayer: false,
      baseLayerPicker: false, geocoder: false, homeButton: false, sceneModePicker: false, navigationHelpButton: false, animation: false, timeline: false,
      fullscreenButton: false, infoBox: false, selectionIndicator: false, shouldAnimate: false, skyAtmosphere: false, requestRenderMode: true, maximumRenderTimeChange: Infinity,
      contextOptions: { webgl: { alpha: false, preserveDrawingBuffer: true } },
      terrainProvider: new Cesium.EllipsoidTerrainProvider({ ellipsoid: MARS_ELLIPSOID }),
    })
    viewer.scene.globe.baseColor = Cesium.Color.fromCssColorString('#3b1f16')
    viewer.scene.globe.enableLighting = false
    viewer.scene.globe.showGroundAtmosphere = false
    viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#07080c')
    if (viewer.scene.skyBox) viewer.scene.skyBox.show = false
    if (viewer.scene.sun) viewer.scene.sun.show = false
    if (viewer.scene.moon) viewer.scene.moon.show = false
    viewer.scene.fog.enabled = false
    viewer.scene.globe.depthTestAgainstTerrain = false
    viewer.scene.screenSpaceCameraController.minimumZoomDistance = 400
    viewer.scene.screenSpaceCameraController.enableTilt = interactive
    const ds = new Cesium.CustomDataSource('overlays')
    viewer.dataSources.add(ds)
    overlays.current = ds
    viewerRef.current = viewer

    if (initialView === 'globe') viewer.camera.setView({ destination: Cesium.Cartesian3.fromDegrees(77, 10, 1.1e7, MARS_ELLIPSOID) })
    else viewer.camera.setView({ destination: Cesium.Cartesian3.fromDegrees(77.42, 18.2, 70000, MARS_ELLIPSOID), orientation: { heading: 0, pitch: Cesium.Math.toRadians(-55), roll: 0 } })

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas)
    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.PositionedEvent) => {
      const p = pickLonLat(viewer, e.position)
      if (p && clickRef.current) clickRef.current(p)
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK)
    let last = 0
    handler.setInputAction((e: Cesium.ScreenSpaceEventHandler.MotionEvent) => {
      const now = performance.now()
      if (now - last < 50) return
      last = now
      setCursor(pickLonLat(viewer, e.endPosition))
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE)
    const camListener = () => setCameraHeight(cameraCartographic(viewer).height)
    viewer.camera.changed.addEventListener(camListener)
    viewer.camera.percentageChanged = 0.05
    camListener()

    return () => {
      handler.destroy()
      viewer.destroy()
      viewerRef.current = null
      layerObjs.current.clear()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // --- imagery layers: keep in sync with catalogue + store
  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer || !layers) return
    const wanted: MapLayer[] = []
    const bm = layers.find((l) => l.id === basemap) ?? layers.find((l) => l.is_basemap)
    if (bm) wanted.push(bm)
    for (const l of layers) if (!l.is_basemap && l.type !== 'vector' && active[l.id]) wanted.push(l)
    const wantedIds = new Set(wanted.map((l) => l.id))
    for (const [id, obj] of layerObjs.current) {
      if (!wantedIds.has(id)) {
        viewer.imageryLayers.remove(obj, true)
        layerObjs.current.delete(id)
      }
    }
    // order: basemap first then groups in catalogue order
    wanted.forEach((l, idx) => {
      let obj = layerObjs.current.get(l.id)
      if (!obj) {
        const prov = providerFor(l)
        if (!prov) return
        obj = new Cesium.ImageryLayer(prov, { alpha: opacity[l.id] ?? l.default_opacity })
        viewer.imageryLayers.add(obj)
        layerObjs.current.set(l.id, obj)
      }
      obj.alpha = l.is_basemap ? 1 : (opacity[l.id] ?? l.default_opacity)
      const cur = viewer.imageryLayers.indexOf(obj)
      if (cur !== idx && cur >= 0) {
        viewer.imageryLayers.remove(obj, false)
        viewer.imageryLayers.add(obj, Math.min(idx, viewer.imageryLayers.length))
      }
    })
    viewer.scene.requestRender()
  }, [layers, basemap, active, opacity])

  // --- vector overlays
  useEffect(() => {
    const viewer = viewerRef.current
    const ds = overlays.current
    if (!viewer || !ds) return
    ds.entities.removeAll()
    const ell = MARS_ELLIPSOID
    const pos = (lon: number, lat: number, h = 0) => Cesium.Cartesian3.fromDegrees(lon, lat, h, ell)
    const labelStyle = (text: string, color: string, size = 11) => ({
      text, font: `${size}px Inter, sans-serif`, fillColor: Cesium.Color.fromCssColorString(color), outlineColor: Cesium.Color.BLACK.withAlpha(0.9), outlineWidth: 3,
      style: Cesium.LabelStyle.FILL_AND_OUTLINE, pixelOffset: new Cesium.Cartesian2(0, -14), verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      scaleByDistance: new Cesium.NearFarScalar(2e4, 1.0, 4e5, 0.0), disableDepthTestDistance: Number.POSITIVE_INFINITY,
    })

    if (active.science_targets && targets) {
      for (const f of targets.features) {
        const p = f.properties
        const [lon, lat] = f.geometry.coordinates as number[]
        const color = TARGET_COLORS[p.type] ?? '#e5e7eb'
        const sel = missionTargets.includes(p.id)
        ds.entities.add({
          id: `target:${p.id}`, position: pos(lon, lat),
          point: { pixelSize: sel ? 10 : 6 + p.priority, color: Cesium.Color.fromCssColorString(color), outlineColor: sel ? Cesium.Color.WHITE : Cesium.Color.BLACK.withAlpha(0.8), outlineWidth: sel ? 2 : 1, disableDepthTestDistance: Number.POSITIVE_INFINITY },
          label: labelStyle(p.name, color, 10.5),
        })
      }
    }
    if (active.mineral_evidence && evidence) {
      for (const f of evidence.features) {
        const p = f.properties
        const [lon, lat] = f.geometry.coordinates as number[]
        const color = Cesium.Color.fromCssColorString(EVIDENCE_COLORS[p.evidence_class] ?? '#9ca3af')
        ds.entities.add({
          id: `evidence:${p.id}`, position: pos(lon, lat),
          ellipse: { semiMajorAxis: p.radius_m, semiMinorAxis: p.radius_m, material: color.withAlpha(0.12), outline: true, outlineColor: color.withAlpha(0.7), outlineWidth: 1.5, height: 0 },
          point: { pixelSize: 5, color, disableDepthTestDistance: Number.POSITIVE_INFINITY },
          label: { ...labelStyle(p.name, EVIDENCE_COLORS[p.evidence_class] ?? '#9ca3af', 10), scaleByDistance: new Cesium.NearFarScalar(1e4, 1.0, 1.2e5, 0.0) },
        })
      }
    }
    if (active.m20_traverse && traverse) {
      for (const f of traverse.features) {
        const coords = (f.geometry.coordinates as number[][]).map(([lo, la]) => pos(lo, la, 2))
        if (coords.length > 1) ds.entities.add({ polyline: { positions: coords, width: 2, material: Cesium.Color.fromCssColorString('#fb923c').withAlpha(0.9), clampToGround: false } })
      }
      const cur = traverse.current?.properties
      if (cur) {
        ds.entities.add({
          id: 'rover:m20', position: pos(Number(cur.lon), Number(cur.lat), 5),
          point: { pixelSize: 9, color: Cesium.Color.fromCssColorString('#fb923c'), outlineColor: Cesium.Color.WHITE, outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY },
          label: { ...labelStyle(`Perseverance · sol ${cur.sol}`, '#fdba74', 11), scaleByDistance: new Cesium.NearFarScalar(2e4, 1.0, 8e5, 0.0) },
        })
      }
    }
    if (bookmarks) {
      for (const b of bookmarks) {
        ds.entities.add({
          id: `bookmark:${b.id}`, position: pos(b.lon, b.lat, 3),
          billboard: undefined,
          point: { pixelSize: 7, color: Cesium.Color.fromCssColorString('#22d3ee'), outlineColor: Cesium.Color.BLACK, outlineWidth: 1, disableDepthTestDistance: Number.POSITIVE_INFINITY },
          label: { ...labelStyle(b.name, '#67e8f9', 10), pixelOffset: new Cesium.Cartesian2(0, 14), verticalOrigin: Cesium.VerticalOrigin.TOP },
        })
      }
    }
    if (base) {
      ds.entities.add({
        id: 'base', position: pos(base.lon, base.lat, 5),
        point: { pixelSize: 12, color: Cesium.Color.fromCssColorString('#ea580c'), outlineColor: Cesium.Color.WHITE, outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY },
        label: { ...labelStyle('BASE', '#fdba74', 11), scaleByDistance: new Cesium.NearFarScalar(2e4, 1.0, 2e6, 0.0) },
        ellipse: { semiMajorAxis: 1000, semiMinorAxis: 1000, material: Cesium.Color.fromCssColorString('#ea580c').withAlpha(0.06), outline: true, outlineColor: Cesium.Color.fromCssColorString('#ea580c').withAlpha(0.5), height: 0 },
      })
    }
    if (showCandidates) {
      candidates.forEach((c) => {
        ds.entities.add({
          id: `candidate:${c.name}`, position: pos(c.lon, c.lat, 4),
          point: { pixelSize: 9, color: Cesium.Color.fromCssColorString('#a78bfa'), outlineColor: Cesium.Color.WHITE, outlineWidth: 1.5, disableDepthTestDistance: Number.POSITIVE_INFINITY },
          label: labelStyle(c.name, '#c4b5fd', 10.5),
          ellipse: { semiMajorAxis: 1000, semiMinorAxis: 1000, material: Cesium.Color.fromCssColorString('#a78bfa').withAlpha(0.05), outline: true, outlineColor: Cesium.Color.fromCssColorString('#a78bfa').withAlpha(0.4), height: 0 },
        })
      })
    }
    if (showRoutePoints) {
      routePoints.forEach((p, i) => {
        ds.entities.add({
          id: `rp:${i}`, position: pos(p.lon, p.lat, 4),
          point: { pixelSize: 8, color: Cesium.Color.fromCssColorString(i === 0 ? '#34d399' : i === routePoints.length - 1 ? '#f87171' : '#22d3ee'), outlineColor: Cesium.Color.BLACK, outlineWidth: 1, disableDepthTestDistance: Number.POSITIVE_INFINITY },
          label: labelStyle(p.label ?? (i === 0 ? 'Start' : i === routePoints.length - 1 ? 'End' : `WP ${i}`), '#e5e7eb', 10),
        })
      })
      if (routePoints.length > 1 && !route) {
        ds.entities.add({ polyline: { positions: routePoints.map((p) => pos(p.lon, p.lat, 3)), width: 1.5, material: new Cesium.PolylineDashMaterialProperty({ color: Cesium.Color.fromCssColorString('#9ca3af').withAlpha(0.7), dashLength: 12 }) } })
      }
    }
    const drawRoute = (r: Route, color: string, width: number, alpha = 1) => {
      const positions = r.geometry.coordinates.map(([lo, la]) => pos(lo, la, 3))
      const material = r.verified ? Cesium.Color.fromCssColorString(color).withAlpha(alpha) : new Cesium.PolylineDashMaterialProperty({ color: Cesium.Color.fromCssColorString(color).withAlpha(alpha), dashLength: 10 })
      ds.entities.add({ polyline: { positions, width, material } })
      // hazard segments
      for (const h of r.hazard_segments) {
        if (h.class === 'caution') continue
        const seg = r.profile.filter((s) => s.d >= h.start_m && s.d <= h.end_m)
        if (seg.length > 1) ds.entities.add({ polyline: { positions: seg.map((s) => pos(s.lon, s.lat, 4)), width: width + 3, material: Cesium.Color.fromCssColorString('#ef4444').withAlpha(0.9) } })
      }
    }
    if (showRoute && extraRoutes) {
      const colors: Record<string, string> = { shortest: '#9ca3af', balanced: '#22d3ee', lowest_risk: '#34d399' }
      for (const [k, r] of Object.entries(extraRoutes)) drawRoute(r, colors[k] ?? '#22d3ee', highlightRoute === k ? 4 : 2, highlightRoute === k ? 1 : 0.55)
    } else if (showRoute && route) drawRoute(route, '#22d3ee', 3.5)

    if (selected) {
      ds.entities.add({
        id: 'selected', position: pos(selected.lon, selected.lat, 6),
        point: { pixelSize: 14, color: Cesium.Color.TRANSPARENT, outlineColor: Cesium.Color.fromCssColorString('#22d3ee'), outlineWidth: 2, disableDepthTestDistance: Number.POSITIVE_INFINITY },
      })
    }
    if (bbox) {
      ds.entities.add({ rectangle: { coordinates: Cesium.Rectangle.fromDegrees(bbox.west, bbox.south, bbox.east, bbox.north), material: Cesium.Color.fromCssColorString('#22d3ee').withAlpha(0.08), outline: true, outlineColor: Cesium.Color.fromCssColorString('#22d3ee'), outlineWidth: 2, height: 0 } })
    }
    if (bboxDraft) {
      ds.entities.add({ position: pos(bboxDraft.lon, bboxDraft.lat, 6), point: { pixelSize: 8, color: Cesium.Color.fromCssColorString('#22d3ee'), disableDepthTestDistance: Number.POSITIVE_INFINITY } })
    }
    viewer.scene.requestRender()
  }, [targets, evidence, traverse, bookmarks, active, base, candidates, routePoints, route, selected, bbox, bboxDraft, missionTargets, showRoute, showCandidates, showRoutePoints, extraRoutes, highlightRoute])

  return <div ref={containerRef} className={className ?? 'absolute inset-0'} data-testid="mars-globe" />
})
