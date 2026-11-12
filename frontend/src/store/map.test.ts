import { describe, it, expect } from 'vitest'
import { useMap } from '@/store/map'

describe('Map Store', () => {
  it('initializes with default Viking basemap and active layers', () => {
    const s = useMap.getState()
    expect(s.basemap).toBe('viking_mdim21_color')
    expect(s.active.jezero_hirise_mosaic).toBe(true)
    expect(s.clickMode).toBe('inspect')
  })

  it('updates basemap and layer visibility', () => {
    const s = useMap.getState()
    s.setBasemap('mola_color_hillshade')
    expect(useMap.getState().basemap).toBe('mola_color_hillshade')

    s.toggle('ctx_dtm_slope', true)
    expect(useMap.getState().active.ctx_dtm_slope).toBe(true)

    s.toggle('ctx_dtm_slope', false)
    expect(useMap.getState().active.ctx_dtm_slope).toBe(false)
  })

  it('updates clickMode and selections', () => {
    const s = useMap.getState()
    s.setClickMode('route')
    expect(useMap.getState().clickMode).toBe('route')

    s.setSelected({ lon: 77.45, lat: 18.44 })
    expect(useMap.getState().selected).toEqual({ lon: 77.45, lat: 18.44 })
  })
})
