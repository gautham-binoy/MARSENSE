import type { Route } from '@/lib/api'
import type { RoutePoint } from '@/store/mission'

export function exportRouteAsGeoJson(route: Route, waypoints: RoutePoint[], missionName = 'MarsRoute'): void {
  const geojson = {
    type: 'FeatureCollection',
    name: missionName,
    crs: {
      type: 'name',
      properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' },
    },
    features: [
      {
        type: 'Feature',
        properties: {
          name: `${missionName} Trajectory`,
          strategy: route.strategy,
          length_m: route.length_m,
          climb_m: route.climb_m,
          descent_m: route.descent_m,
          estimated_duration_h: route.estimated_duration_h,
          hazard_m: route.hazard_m,
          caution_m: route.caution_m,
          verified: route.verified,
        },
        geometry: route.geometry,
      },
      ...waypoints.map((p, i) => ({
        type: 'Feature',
        properties: {
          name: p.label || `Waypoint ${i + 1}`,
          sequence: i + 1,
        },
        geometry: {
          type: 'Point',
          coordinates: [p.lon, p.lat],
        },
      })),
    ],
  }

  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json' })
  downloadBlob(blob, `${missionName.replace(/[^a-zA-Z0-9_-]/g, '_')}_traverse.geojson`)
}

export function exportRouteAsGpx(route: Route, waypoints: RoutePoint[], missionName = 'MarsRoute'): void {
  const coords = route.geometry.coordinates
  const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="MARSENSE Navigator" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${missionName}</name>
    <desc>MARSENSE Planetary Exploration Route - Jezero Crater, Mars</desc>
    <time>${new Date().toISOString()}</time>
  </metadata>
  <trk>
    <name>${missionName} Path</name>
    <trkseg>
`
  const trackPoints = coords
    .map(([lon, lat]) => `      <trkpt lat="${lat}" lon="${lon}"></trkpt>`)
    .join('\n')

  const wptPoints = waypoints
    .map(
      (p, i) => `  <wpt lat="${p.lat}" lon="${p.lon}">
    <name>${p.label || `WP${i + 1}`}</name>
  </wpt>`
    )
    .join('\n')

  const gpxFooter = `
    </trkseg>
  </trk>
${wptPoints}
</gpx>`

  const blob = new Blob([gpxHeader + trackPoints + gpxFooter], { type: 'application/gpx+xml' })
  downloadBlob(blob, `${missionName.replace(/[^a-zA-Z0-9_-]/g, '_')}_traverse.gpx`)
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
