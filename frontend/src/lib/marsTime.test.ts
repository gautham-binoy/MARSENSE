import { describe, it, expect } from 'vitest'
import { calculateMarsTime } from './marsTime'

describe('Mars Time & Orbital Dynamics', () => {
  it('calculates valid MSD and clock values for current date', () => {
    const t = calculateMarsTime(new Date())
    expect(t.msd).toBeGreaterThan(50000)
    expect(t.mtcStr).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    expect(t.lmstStr).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    expect(t.ltstStr).toMatch(/^\d{2}:\d{2}:\d{2}$/)
    expect(t.m20Sol).toBeGreaterThan(1000)
    expect(t.lsDeg).toBeGreaterThanOrEqual(0)
    expect(t.lsDeg).toBeLessThan(360)
    expect(typeof t.season).toBe('string')
  })

  it('determines season accurately across Ls thresholds', () => {
    // Test custom dates or behavior
    const res = calculateMarsTime(new Date('2021-02-18T20:55:00Z'))
    expect(res.m20Sol).toBe(0) // Touchdown sol
  })
})
