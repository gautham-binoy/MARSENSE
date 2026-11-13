import { describe, it, expect, vi } from 'vitest'
import { exportRouteAsGeoJson, exportRouteAsGpx } from './routeExport'
import type { Route } from './api'

describe('Route Export Utilities', () => {
  const dummyRoute: Route = {
    strategy: 'balanced',
    strategy_description: 'Balanced path',
    geometry: {
      type: 'LineString',
      coordinates: [
        [77.45, 18.44],
        [77.42, 18.43],
      ],
    },
    length_m: 3500,
    climb_m: 45,
    descent_m: 12,
    max_slope_deg: 8.5,
    mean_slope_deg: 3.2,
    caution_m: 0,
    hazard_m: 0,
    hazard_segments: [],
    profile: [],
    estimated_duration_h: 1.4,
    terrain_time_factor: 1.0,
    coverage_fraction: 1.0,
    verified: true,
    verification_note: null,
    grid: { dataset_id: 'ctx', resolution_m: 20, roughness_used: true },
    constraints: {},
    explanation: 'Test route',
  }

  const dummyWaypoints = [
    { lon: 77.45, lat: 18.44, label: 'Base' },
    { lon: 77.42, lat: 18.43, label: 'Kodiak' },
  ]

  it('generates GeoJSON and triggers download without throwing', () => {
    // Mock URL and click
    const createObjectURL = vi.fn(() => 'blob:mock-url')
    const revokeObjectURL = vi.fn()
    window.URL.createObjectURL = createObjectURL
    window.URL.revokeObjectURL = revokeObjectURL

    expect(() => exportRouteAsGeoJson(dummyRoute, dummyWaypoints, 'TestMission')).not.toThrow()
    expect(createObjectURL).toHaveBeenCalled()
  })

  it('generates GPX and triggers download without throwing', () => {
    const createObjectURL = vi.fn(() => 'blob:mock-url')
    const revokeObjectURL = vi.fn()
    window.URL.createObjectURL = createObjectURL
    window.URL.revokeObjectURL = revokeObjectURL

    expect(() => exportRouteAsGpx(dummyRoute, dummyWaypoints, 'TestMission')).not.toThrow()
    expect(createObjectURL).toHaveBeenCalled()
  })
})
