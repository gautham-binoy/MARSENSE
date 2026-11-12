import { describe, it, expect } from 'vitest'
import { fmt, cn } from '@/lib/utils'
import { classTone } from '@/components/common'

describe('Formatting Utilities', () => {
  it('formats coordinates correctly in planetocentric notation', () => {
    expect(fmt.coord(77.45089, 18.44463)).toBe('18.4446°N, 77.4509°E')
    expect(fmt.coord(-137.4, -4.59)).toBe('4.5900°S, 137.4000°W')
  })

  it('formats kilometers and meters correctly', () => {
    expect(fmt.km(2500)).toBe('2.50 km')
    expect(fmt.km(450)).toBe('0.45 km')
    expect(fmt.km(null)).toBe('—')
  })

  it('maps terrain classes to design tokens', () => {
    expect(classTone('benign')).toBe('safe')
    expect(classTone('caution')).toBe('caution')
    expect(classTone('hazardous')).toBe('danger')
    expect(classTone('impassable')).toBe('danger')
    expect(classTone(null)).toBe('default')
  })

  it('merges tailwind class names correctly', () => {
    expect(cn('p-2', 'text-fg', false && 'hidden')).toBe('p-2 text-fg')
    expect(cn('p-2', 'p-4')).toBe('p-4')
  })
})
