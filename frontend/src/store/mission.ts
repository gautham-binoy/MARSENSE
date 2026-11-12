/* Single source of truth for the mission plan: base, targets, route, supplies, assumptions, scenario, results. */
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Assessment, Assumptions, LandingCompare, Route, SimResult, Supplies } from '@/lib/api'

export interface LonLat { lon: number; lat: number }
export interface RoutePoint extends LonLat { label?: string }

export const DEFAULT_SUPPLIES: Supplies = {
  crew: 2, duration_days: 10, oxygen_kg: 40, water_kg: 120, battery_kwh: 800, co2_scrubber_capacity_kg: 40, food_kg: 20,
  emergency_reserve_fraction: 0.2, return_journey_days: 1,
}
export const DEFAULT_ASSUMPTIONS: Assumptions = {
  o2_kg_per_day: 0.84, o2_eva_multiplier: 1.6, co2_kg_per_day: 1.04, water_kg_per_day: 2.5, hygiene_water_kg_per_day: 1.0,
  water_recycling_efficiency: 0, food_kg_per_day: 0.62, habitat_power_kw: 2.0, eva_suit_power_kwh_per_h: 0.3, rover_kwh_per_km: 1.2,
  solar_recharge_kwh_per_sol: 0, eva_hours_per_day: 4, rover_km_per_day: 0,
}

export const JEZERO_LANDING: LonLat = { lon: 77.45089, lat: 18.44463 }

interface MissionState {
  missionId: number | null
  name: string
  regionId: string
  profile: 'rover' | 'astronaut'
  base: LonLat | null
  targets: string[]
  routePoints: RoutePoint[]
  routeStrategy: string
  route: Route | null
  alternatives: Record<string, Route> | null
  supplies: Supplies
  assumptions: Assumptions
  scenarioId: string
  simulation: SimResult | null
  assessment: Assessment | null
  landing: LandingCompare | null
  candidates: { lon: number; lat: number; name: string }[]
  // actions
  setName: (n: string) => void
  setProfile: (p: 'rover' | 'astronaut') => void
  setBase: (p: LonLat | null) => void
  toggleTarget: (id: string) => void
  setTargets: (ids: string[]) => void
  setRoutePoints: (pts: RoutePoint[]) => void
  addRoutePoint: (p: RoutePoint) => void
  removeRoutePoint: (i: number) => void
  setRouteStrategy: (s: string) => void
  setRoute: (r: Route | null, alts?: Record<string, Route> | null) => void
  setSupplies: (s: Partial<Supplies>) => void
  setAssumptions: (a: Partial<Assumptions>) => void
  setScenario: (id: string) => void
  setSimulation: (s: SimResult | null) => void
  setAssessment: (a: Assessment | null) => void
  setLanding: (l: LandingCompare | null) => void
  setCandidates: (c: { lon: number; lat: number; name: string }[]) => void
  addCandidate: (c: { lon: number; lat: number; name?: string }) => void
  setMissionId: (id: number | null) => void
  loadPlan: (plan: Record<string, unknown>, id: number | null, name: string) => void
  reset: () => void
}

const initial = {
  missionId: null, name: 'Jezero Delta Sortie', regionId: 'jezero', profile: 'rover' as const, base: JEZERO_LANDING, targets: [] as string[],
  routePoints: [] as RoutePoint[], routeStrategy: 'balanced', route: null, alternatives: null,
  supplies: DEFAULT_SUPPLIES, assumptions: DEFAULT_ASSUMPTIONS, scenarioId: 'normal', simulation: null, assessment: null, landing: null,
  candidates: [] as { lon: number; lat: number; name: string }[],
}

export const useMission = create<MissionState>()(
  persist(
    (set, get) => ({
      ...initial,
      setName: (name) => set({ name }),
      setProfile: (profile) => set({ profile, route: null, alternatives: null, assessment: null }),
      setBase: (base) => set({ base, assessment: null }),
      toggleTarget: (id) => set((s) => ({ targets: s.targets.includes(id) ? s.targets.filter((t) => t !== id) : [...s.targets, id], assessment: null })),
      setTargets: (targets) => set({ targets, assessment: null }),
      setRoutePoints: (routePoints) => set({ routePoints, route: null, alternatives: null }),
      addRoutePoint: (p) => set((s) => ({ routePoints: [...s.routePoints, p], route: null, alternatives: null })),
      removeRoutePoint: (i) => set((s) => ({ routePoints: s.routePoints.filter((_, j) => j !== i), route: null, alternatives: null })),
      setRouteStrategy: (routeStrategy) => set({ routeStrategy }),
      setRoute: (route, alts) => set({ route, alternatives: alts === undefined ? get().alternatives : alts, assessment: null }),
      setSupplies: (s) => set((st) => ({ supplies: { ...st.supplies, ...s }, simulation: null, assessment: null })),
      setAssumptions: (a) => set((st) => ({ assumptions: { ...st.assumptions, ...a }, simulation: null, assessment: null })),
      setScenario: (scenarioId) => set({ scenarioId, assessment: null }),
      setSimulation: (simulation) => set({ simulation }),
      setAssessment: (assessment) => set({ assessment }),
      setLanding: (landing) => set({ landing }),
      setCandidates: (candidates) => set({ candidates, landing: null }),
      addCandidate: (c) => set((s) => ({ candidates: [...s.candidates, { ...c, name: c.name ?? `Site ${String.fromCharCode(65 + s.candidates.length)}` }], landing: null })),
      setMissionId: (missionId) => set({ missionId }),
      loadPlan: (plan, id, name) =>
        set({
          missionId: id, name,
          base: (plan.base as LonLat) ?? null, targets: (plan.targets as string[]) ?? [], routePoints: (plan.route_points as RoutePoint[]) ?? [],
          route: (plan.route as Route) ?? null, supplies: { ...DEFAULT_SUPPLIES, ...((plan.supplies as Supplies) ?? {}) },
          assumptions: { ...DEFAULT_ASSUMPTIONS, ...((plan.assumptions as Assumptions) ?? {}) }, scenarioId: (plan.scenario_id as string) ?? 'normal',
          profile: (plan.profile as 'rover' | 'astronaut') ?? 'rover', routeStrategy: (plan.route?.toString() && (plan.route as Route).strategy) || 'balanced',
          candidates: (plan.candidates as { lon: number; lat: number; name: string }[]) ?? [], simulation: null, assessment: null, landing: null, alternatives: null,
        }),
      reset: () => set({ ...initial }),
    }),
    { name: 'marsense-mission-v1', partialize: (s) => ({ ...s, simulation: null, alternatives: null }) },
  ),
)

/** Serialisable plan sent to /api/missions and /api/reports */
export function planFromState(s: MissionState) {
  return {
    base: s.base, targets: s.targets, route_points: s.routePoints, route: s.route, supplies: s.supplies, assumptions: s.assumptions,
    scenario_id: s.scenarioId, profile: s.profile, candidates: s.candidates,
    simulation_summary: s.simulation ? { verdict: s.simulation.verdict, limiting_resource: s.simulation.limiting_resource, warnings: s.simulation.warnings } : null,
  }
}
