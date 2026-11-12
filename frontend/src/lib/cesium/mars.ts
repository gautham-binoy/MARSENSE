/* Cesium configuration for Mars: ellipsoid, WMTS providers (NASA Trek), backend raster tiles. */
import * as Cesium from 'cesium'
import type { MapLayer } from '@/lib/api'

export const MARS_RADIUS = 3396190
// IAU 2000 Mars ellipsoid (equatorial 3396.19 km, polar 3376.20 km). Data products use the sphere; the
// difference only affects globe shading, not the geographic lat/lon tiling scheme.
export const MARS_ELLIPSOID = new Cesium.Ellipsoid(3396190, 3396190, 3376200)

let configured = false
export function configureCesiumForMars() {
  if (configured) return
  configured = true
  Cesium.Ellipsoid.default = MARS_ELLIPSOID
  // no Cesium Ion: never request Earth assets
  Cesium.Ion.defaultAccessToken = ''
}

export const JEZERO = { lon: 77.45, lat: 18.44 }

export function trekProvider(layer: MapLayer): Cesium.ImageryProvider {
  // Trek template: .../{z}/{y}/{x}.ext where y = TileRow, x = TileCol in a 2x1 geographic scheme.
  const url = layer.url!.replace('{z}', '{TileMatrix}').replace('{y}', '{TileRow}').replace('{x}', '{TileCol}')
  const scheme = new Cesium.GeographicTilingScheme({ ellipsoid: MARS_ELLIPSOID, numberOfLevelZeroTilesX: 2, numberOfLevelZeroTilesY: 1 })
  const rect = layer.rectangle ? Cesium.Rectangle.fromDegrees(layer.rectangle.west, layer.rectangle.south, layer.rectangle.east, layer.rectangle.north) : undefined
  return new Cesium.WebMapTileServiceImageryProvider({
    url,
    layer: layer.id,
    style: 'default',
    format: 'image/png',
    tileMatrixSetID: 'default028mm',
    tilingScheme: scheme,
    rectangle: rect,
    minimumLevel: layer.min_zoom,
    maximumLevel: layer.max_zoom,
    credit: new Cesium.Credit(layer.source_note),
  })
}

export function backendTileProvider(layer: MapLayer): Cesium.ImageryProvider {
  const scheme = new Cesium.GeographicTilingScheme({ ellipsoid: MARS_ELLIPSOID, numberOfLevelZeroTilesX: 2, numberOfLevelZeroTilesY: 1 })
  const rect = layer.rectangle ? Cesium.Rectangle.fromDegrees(layer.rectangle.west, layer.rectangle.south, layer.rectangle.east, layer.rectangle.north) : undefined
  return new Cesium.UrlTemplateImageryProvider({
    url: layer.url!,
    tilingScheme: scheme,
    rectangle: rect,
    minimumLevel: layer.min_zoom,
    maximumLevel: layer.max_zoom,
    hasAlphaChannel: true,
    credit: new Cesium.Credit(layer.source_note),
  })
}

export function providerFor(layer: MapLayer): Cesium.ImageryProvider | null {
  if (layer.type === 'wmts') return trekProvider(layer)
  if (layer.type === 'xyz_backend') return backendTileProvider(layer)
  return null
}

export function flyTo(viewer: Cesium.Viewer, lon: number, lat: number, height = 60000, duration = 1.6, pitchDeg = -55) {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(lon, lat - (height > 100000 ? 0 : height / 400000), height, MARS_ELLIPSOID),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(pitchDeg), roll: 0 },
    duration,
  })
}

export function cameraCartographic(viewer: Cesium.Viewer) {
  const c = viewer.camera.positionCartographic
  return { lon: Cesium.Math.toDegrees(c.longitude), lat: Cesium.Math.toDegrees(c.latitude), height: c.height }
}

export function pickLonLat(viewer: Cesium.Viewer, position: Cesium.Cartesian2): { lon: number; lat: number } | null {
  const cart = viewer.camera.pickEllipsoid(position, MARS_ELLIPSOID)
  if (!cart) return null
  const c = Cesium.Cartographic.fromCartesian(cart, MARS_ELLIPSOID)
  return { lon: Cesium.Math.toDegrees(c.longitude), lat: Cesium.Math.toDegrees(c.latitude) }
}
