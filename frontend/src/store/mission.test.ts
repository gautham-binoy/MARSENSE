import { describe, it, expect, beforeEach } from 'vitest'
import { useMission, planFromState, DEFAULT_SUPPLIES } from '@/store/mission'

describe('Mission Store', () => {
  beforeEach(() => {
    useMission.getState().reset()
  })

  it('initializes with default Jezero landing site and supplies', () => {
    const s = useMission.getState()
    expect(s.base).not.toBeNull()
    expect(s.base?.lon).toBeCloseTo(77.45089, 4)
    expect(s.base?.lat).toBeCloseTo(18.44463, 4)
    expect(s.supplies.crew).toBe(2)
    expect(s.supplies.duration_days).toBe(10)
    expect(s.profile).toBe('rover')
  })

  it('updates mission profile and resets route and assessment', () => {
    const s = useMission.getState()
    s.setProfile('astronaut')
    const updated = useMission.getState()
    expect(updated.profile).toBe('astronaut')
    expect(updated.route).toBeNull()
    expect(updated.assessment).toBeNull()
  })

  it('toggles mission targets correctly', () => {
    const s = useMission.getState()
    expect(s.targets).toHaveLength(0)

    s.toggleTarget('kodiak_butte')
    expect(useMission.getState().targets).toContain('kodiak_butte')

    s.toggleTarget('kodiak_butte')
    expect(useMission.getState().targets).not.toContain('kodiak_butte')
  })

  it('adds and removes route points', () => {
    const s = useMission.getState()
    s.addRoutePoint({ lon: 77.45, lat: 18.44, label: 'Start' })
    s.addRoutePoint({ lon: 77.40, lat: 18.42, label: 'End' })

    expect(useMission.getState().routePoints).toHaveLength(2)

    s.removeRoutePoint(0)
    expect(useMission.getState().routePoints).toHaveLength(1)
    expect(useMission.getState().routePoints[0].label).toBe('End')
  })

  it('updates supplies with partial attributes', () => {
    const s = useMission.getState()
    s.setSupplies({ crew: 4, oxygen_kg: 80 })

    const updated = useMission.getState().supplies
    expect(updated.crew).toBe(4)
    expect(updated.oxygen_kg).toBe(80)
    expect(updated.water_kg).toBe(DEFAULT_SUPPLIES.water_kg)
  })

  it('exports serializable plan for API payloads', () => {
    const s = useMission.getState()
    s.setName('Delta Expedition Alpha')
    s.toggleTarget('delta_scarp')

    const plan = planFromState(useMission.getState())
    expect(plan.base).toEqual(s.base)
    expect(plan.targets).toContain('delta_scarp')
    expect(plan.profile).toBe('rover')
    expect(plan.supplies.crew).toBe(2)
  })
})
