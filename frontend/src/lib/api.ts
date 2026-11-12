/* Typed API client. All backend access goes through here. */

export type Reliability = 'measured' | 'processed_observation' | 'derived' | 'inference' | 'simulation' | 'placeholder' | 'none'

export interface Provenance {
  dataset_id: string | null
  reliability: Reliability | string
  method?: string | null
  resolution_m?: number | null
  note?: string | null
}

export interface Dataset {
  id: string
  name: string
  mission: string
  instrument: string
  source_url: string
  access_url?: string | null
  description: string
  coverage: { kind: string; west?: number; south?: number; east?: number; north?: number; description?: string }
  resolution: string
  units?: string | null
  acquisition: string
  processing_level: string
  reliability: Reliability
  quality_notes: string
  attribution: string
  license: string
  local_file?: string | null
  kind: string
  status: { status: 'cached' | 'not_downloaded' | 'streamed'; size_bytes: number; path: string | null }
}

export interface LegendStop { value: number | string; color: string; label?: string | null }
export interface Rect { west: number; south: number; east: number; north: number }
export interface MapLayer {
  id: string
  name: string
  group: string
  type: 'wmts' | 'xyz_backend' | 'vector'
  url: string | null
  dataset_id: string
  rectangle: Rect | null
  min_zoom: number
  max_zoom: number
  units?: string | null
  legend?: LegendStop[] | null
  legend_type?: 'gradient' | 'classes' | 'symbols' | null
  description: string
  reliability: string
  source_note: string
  acquisition: string
  resolution: string
  default_opacity: number
  is_basemap: boolean
}

export interface TerrainPoint {
  covered: boolean
  elevation_m: number | null
  slope_deg: number | null
  roughness_m: number | null
  roughness_resolved?: boolean
  terrain_class: string | null
  local_slope_p90_deg?: number | null
  dataset_id: string | null
  resolution_m: number | null
  reliability: string | null
  note: string | null
}

export interface ScienceTarget {
  id: string; name: string; type: string; priority: number; lon: number; lat: number; elevation_m: number
  location_basis: string; summary: string; science_value: string; mission: string; instruments: string[]; sources: string[]
  distance_m?: number
}

export interface Inspection {
  lon: number; lat: number; terrain: TerrainPoint; nearby_targets: ScienceTarget[]
  nearby_evidence: { id: string; name: string; evidence_class: string; distance_m: number; category: string }[]
  confidence: number; provenance: Provenance[]
}

export interface RegionStats {
  covered: boolean; dataset_id: string | null; resolution_m?: number; reliability?: string; coverage_fraction: number; n_pixels?: number; area_km2?: number
  elevation?: { min: number; max: number; mean: number; relief: number }
  slope_deg?: { mean: number; p50: number; p90: number; max: number }
  roughness_m?: { mean: number; p50: number; p90: number; max: number } | null
  roughness_resolved?: boolean
  class_fractions?: Record<'benign' | 'caution' | 'hazardous' | 'impassable', number>
  obstacle_density_per_km2?: number | null
  traversability_index?: number
  thresholds?: Record<string, number | string>
  explanations?: string[]
  provenance?: Provenance[]
}

export interface ProfileSample { d: number; lon: number; lat: number; z: number | null; slope: number | null; src: string | null }

export interface Route {
  strategy: string; strategy_description: string
  geometry: { type: 'LineString'; coordinates: [number, number][] }
  length_m: number; climb_m: number; descent_m: number; max_slope_deg: number | null; mean_slope_deg: number | null
  caution_m: number; hazard_m: number
  hazard_segments: { start_m: number; end_m: number; class: string; max_slope: number }[]
  profile: ProfileSample[]
  estimated_duration_h: number | null; terrain_time_factor: number; coverage_fraction: number
  verified: boolean; verification_note: string | null
  grid: { dataset_id: string; resolution_m: number; roughness_used: boolean }
  constraints: Record<string, unknown>
  explanation: string
  provenance?: Provenance[]
}

export interface RouteAlternatives { routes: Record<string, Route>; errors: Record<string, string>; recommended: string; recommendation_reason: string }

export interface SiteScore {
  name: string; lon: number; lat: number; radius_m: number; overall_score: number; confidence: number
  verdict: 'favourable' | 'marginal' | 'unfavourable' | 'cannot_assess'
  factors: Record<string, { score: number; value: number | string | null; unit: string; confidence: number; detail: string; weight: number }>
  weights: Record<string, number>; missing: string[]; penalties: string[]; favourable: string[]
  terrain: RegionStats; nearby_targets: ScienceTarget[]; nearby_evidence: { id: string; name: string; evidence_class: string; distance_m: number }[]
  disclaimer: string
}
export interface LandingCompare { sites: SiteScore[]; ranking: string[]; weights: Record<string, number>; provenance: Provenance[] }

export interface Supplies {
  crew: number; duration_days: number; oxygen_kg: number; water_kg: number; battery_kwh: number; co2_scrubber_capacity_kg: number; food_kg: number
  emergency_reserve_fraction: number; return_journey_days: number
}
export interface Assumptions {
  o2_kg_per_day: number; o2_eva_multiplier: number; co2_kg_per_day: number; water_kg_per_day: number; hygiene_water_kg_per_day: number
  water_recycling_efficiency: number; food_kg_per_day: number; habitat_power_kw: number; eva_suit_power_kwh_per_h: number; rover_kwh_per_km: number
  solar_recharge_kwh_per_sol: number; eva_hours_per_day: number; rover_km_per_day: number
}
export interface Scenario { id: string; name: string; description: string; delay_days: number; consumption_multiplier: number; scrubber_efficiency: number; power_loss_fraction: number; water_loss_fraction: number; extra_return_days: number; eva_hours_override: number | null }
export type ResourceKey = 'oxygen' | 'water' | 'power' | 'co2_scrubber' | 'food'
export interface SimResult {
  scenario: Scenario; supplies: Supplies; assumptions: Assumptions & { sources: string[] }; total_days: number
  timeline: ({ day: number } & Record<ResourceKey, number>)[]
  summary: Record<ResourceKey, { label: string; initial: number; remaining_at_end: number; consumed: number; reserve_threshold: number; mean_rate_per_day: number; days_to_depletion: number | null; margin_days: number | null; status: 'ok' | 'warning' | 'critical' }>
  warnings: { resource: ResourceKey; severity: 'warning' | 'critical'; day: number; message: string }[]
  recommended_supplies: Record<ResourceKey, number>
  verdict: 'ok' | 'warning' | 'critical'; limiting_resource: ResourceKey; disclaimer: string
}
export interface SimResponse { results: Record<string, SimResult>; scenarios: Scenario[] }

export interface Assessment {
  overall_score: number; confidence: number; verdict: 'feasible' | 'feasible_with_changes' | 'insufficient_data' | 'not_recommended'; caps_applied: string[]
  categories: Record<string, { score: number; confidence: number; inputs: Record<string, unknown>; explanation: string; warnings: string[] }>
  weights: Record<string, number>; critical_warnings: string[]; recommendations: string[]; simulation_verdict: string; scenario: string; disclaimer: string
}

export interface MedaSummary {
  dataset_id: string; reliability: string; historical: boolean; instrument: string; location: string
  records: { sol: number; earth_date: string | null; location: { lon: number; lat: number; elevation_m: number; basis: string } | null
    pressure_pa?: { min: number; mean: number; max: number }; pressure_meta?: { sensors: string[]; n_samples: number; file: string; ltst: string[] }
    air_temp_c?: { min: number; mean: number; max: number }; air_temp_meta?: { sensors: string[]; n_samples: number; file: string; ltst: string[] } }[]
  range: { air_temp_c: { min: number; max: number } | null; pressure_pa: { min: number; max: number } | null; sols: number[] | null }
  coverage_note: string; no_realtime_note: string; provenance: Provenance[]
}
export interface RadSummary {
  dataset_id: string; reliability: string; historical: boolean; instrument: string
  site: { name: string; lon: number; lat: number; elevation_m: number; distance_to_jezero_km: number; note: string }
  records: { sol: number; start_utc: string | null; n_observations: number; dose_rate_B_uGy_h: { mean: number; min: number; max: number; n: number } | null; dose_rate_E_uGy_h: { mean: number; min: number; max: number; n: number } | null; dose_per_sol_B_uGy: number | null; dose_per_sol_E_uGy: number | null; file: string }[]
  typical_dose_rate_E_uGy_h: number | null; typical_dose_per_sol_E_uGy: number | null; published_reference: string; limitations: string[]; provenance: Provenance[]
}

export interface Evidence {
  id: string; name: string; category: string; evidence_class: 'direct_observation' | 'remote_sensing_indication' | 'inference' | 'unknown'; geometry_type: string
  radius_m: number; minerals: string[]; instrument: string; resolution_m: number; interpretation: string; uncertainty: string; sources: string[]
}
export interface FeatureCollection<P> { type: 'FeatureCollection'; features: { type: 'Feature'; geometry: { type: string; coordinates: number[] | number[][] }; properties: P }[]; [k: string]: unknown }

export interface Bookmark { id: number; name: string; lon: number; lat: number; region_id: string | null; notes: string | null; snapshot: Inspection | null; created_at: string }
export interface Region { id: string; name: string; description: string; west: number; south: number; east: number; north: number; center_lon: number; center_lat: number; dataset_ids: string[] }
export interface MissionSummary { id: number; name: string; region_id: string; updated_at: string; verdict: string | null; score: number | null }

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

const BASE = import.meta.env.VITE_API_BASE ?? ''

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, { headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) }, ...init })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const j = await res.json()
      detail = typeof j.detail === 'string' ? j.detail : JSON.stringify(j.detail ?? j)
    } catch { /* ignore */ }
    throw new ApiError(res.status, detail)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

const get = <T,>(p: string) => request<T>(p)
const post = <T,>(p: string, body: unknown) => request<T>(p, { method: 'POST', body: JSON.stringify(body) })
const put = <T,>(p: string, body: unknown) => request<T>(p, { method: 'PUT', body: JSON.stringify(body) })
const del = (p: string) => request<void>(p, { method: 'DELETE' })

export const api = {
  health: () => get<{ status: string; terrain_loaded: string[]; primary_resolution_m: number | null }>('/api/health'),
  regions: () => get<Region[]>('/api/regions'),
  datasets: () => get<{ datasets: Dataset[]; fetch_log: { file: string; url: string; bytes: number; fetched_at: string }[] }>('/api/datasets'),
  layers: () => get<MapLayer[]>('/api/layers'),
  inspect: (lon: number, lat: number, profile = 'rover') => get<Inspection>(`/api/locations/inspect?lon=${lon}&lat=${lat}&profile=${profile}`),
  terrainAnalyze: (body: { west: number; south: number; east: number; north: number; polygon?: number[][]; profile?: string; thresholds?: Record<string, number> }) => post<RegionStats>('/api/terrain/analyze', body),
  terrainProfile: (points: { lon: number; lat: number }[], step_m = 20) => post<{ samples: ProfileSample[]; length_m: number; climb_m: number; descent_m: number; coverage_fraction: number }>('/api/terrain/profile', { points, step_m }),
  thresholds: () => get<Record<'rover' | 'astronaut', Record<string, number | string>>>('/api/terrain/thresholds'),
  landingCompare: (body: { sites: { lon: number; lat: number; name?: string }[]; radius_m?: number; weights?: Record<string, number>; profile?: string }) => post<LandingCompare>('/api/landing-sites/compare', body),
  evidence: () => get<FeatureCollection<Evidence> & { disclaimer: string }>('/api/resources/evidence'),
  waterIce: () => get<{ status: string; statement: string; sources: string[] }>('/api/resources/water-ice'),
  targets: () => get<FeatureCollection<Omit<ScienceTarget, 'lon' | 'lat'>> & { note: string }>('/api/science-targets'),
  target: (id: string) => get<ScienceTarget & { terrain: TerrainPoint; nearby_evidence: Evidence[] }>(`/api/science-targets/${id}`),
  traverse: () => get<FeatureCollection<{ sol: number }> & { current: { properties: Record<string, number | string> } | null; fetched_at: string | null }>('/api/rovers/m20/traverse'),
  rovers: () => get<{ rovers: { rover: string; lon: number; lat: number; sol: number; elevation_m: number; odometry_km: number }[]; fetched_at: string | null }>('/api/rovers/positions'),
  meda: () => get<MedaSummary>('/api/environment/meda'),
  rad: () => get<RadSummary>('/api/environment/rad'),
  planRoute: (body: { points: { lon: number; lat: number }[]; strategy?: string; profile?: string; max_slope_deg?: number | null; max_roughness_m?: number | null; speed_kmh?: number; downsample?: number; alternatives?: boolean }) =>
    post<Route | RouteAlternatives>('/api/routes/plan', body),
  strategies: () => get<Record<string, { slope_weight: number; roughness_weight: number; description: string }>>('/api/routes/strategies'),
  simulate: (body: { supplies?: Partial<Supplies>; assumptions?: Partial<Assumptions>; scenario_ids?: string[]; custom_scenario?: Partial<Scenario> }) => post<SimResponse>('/api/survival/simulate', body),
  scenarios: () => get<{ scenarios: Scenario[]; defaults: { supplies: Supplies; assumptions: Assumptions & { sources: string[] } } }>('/api/survival/scenarios'),
  assess: (body: { base: { lon: number; lat: number }; targets: string[]; route: Route | null; supplies: Supplies; assumptions: Assumptions; scenario_id: string; profile: string }) => post<Assessment>('/api/missions/assess', body),
  missions: () => get<MissionSummary[]>('/api/missions'),
  mission: (id: number) => get<{ id: number; name: string; region_id: string; plan: Record<string, unknown>; assessment: Assessment | null }>(`/api/missions/${id}`),
  createMission: (body: { name: string; region_id: string; plan: unknown; assessment?: unknown }) => post<{ id: number }>('/api/missions', body),
  updateMission: (id: number, body: { name: string; region_id: string; plan: unknown; assessment?: unknown }) => put<{ id: number }>(`/api/missions/${id}`, body),
  deleteMission: (id: number) => del(`/api/missions/${id}`),
  bookmarks: () => get<Bookmark[]>('/api/bookmarks'),
  addBookmark: (body: { name: string; lon: number; lat: number; region_id?: string; notes?: string; snapshot?: unknown }) => post<{ id: number }>('/api/bookmarks', body),
  deleteBookmark: (id: number) => del(`/api/bookmarks/${id}`),
  report: async (body: { mission_name: string; plan: unknown; assessment?: unknown; simulation?: unknown; landing?: unknown }) => {
    const res = await fetch(BASE + '/api/reports/mission', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (!res.ok) throw new ApiError(res.status, await res.text())
    return res.blob()
  },
}
