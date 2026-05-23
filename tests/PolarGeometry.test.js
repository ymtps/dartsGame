import { describe, it, expect } from 'vitest'
import { getScoreAt, getSectorCenter, SECTOR_NUMBERS, RING } from '../src/utils/PolarGeometry.js'

const R = 1.0  // board radius for all tests

describe('getScoreAt', () => {
  describe('Bull zones', () => {
    it('double bull at center', () => {
      const result = getScoreAt(0, 0, R)
      expect(result).toEqual({ number: 25, multiplier: 2, points: 50, region: 'double_bull' })
    })

    it('single bull at outer bull radius', () => {
      const r = (RING.DOUBLE_BULL_OUTER + RING.SINGLE_BULL_OUTER) / 2
      const result = getScoreAt(0, r, R)
      expect(result).toEqual({ number: 25, multiplier: 1, points: 25, region: 'single_bull' })
    })
  })

  describe('Miss', () => {
    it('outside board edge', () => {
      const result = getScoreAt(0, 1.1, R)
      expect(result).toEqual({ number: 0, multiplier: 0, points: 0, region: 'miss' })
    })

    it('exactly at board edge (normalized r = 1.0) is miss', () => {
      const result = getScoreAt(0, 1.0, R)
      expect(result.region).toBe('miss')
    })
  })

  describe('Number sectors', () => {
    it('top of board (0, positive Y) → 20', () => {
      const r = (RING.SINGLE_BULL_OUTER + RING.INNER_SINGLE_OUTER) / 2
      const result = getScoreAt(0, r, R)
      expect(result.number).toBe(20)
      expect(result.multiplier).toBe(1)
      expect(result.points).toBe(20)
    })

    it('all 20 numbers are reachable in inner single', () => {
      const r = (RING.SINGLE_BULL_OUTER + RING.INNER_SINGLE_OUTER) / 2
      const found = new Set()
      for (let i = 0; i < 20; i++) {
        const angle = (i * 2 * Math.PI) / 20
        const x = r * Math.sin(angle)
        const y = r * Math.cos(angle)
        found.add(getScoreAt(x, y, R).number)
      }
      expect(found.size).toBe(20)
      for (const n of SECTOR_NUMBERS) {
        expect(found.has(n)).toBe(true)
      }
    })
  })

  describe('Ring multipliers', () => {
    it('triple ring for number 20', () => {
      const r = (RING.INNER_SINGLE_OUTER + RING.TRIPLE_OUTER) / 2
      const result = getScoreAt(0, r, R)
      expect(result.number).toBe(20)
      expect(result.multiplier).toBe(3)
      expect(result.points).toBe(60)
    })

    it('double ring for number 20', () => {
      const r = (RING.OUTER_SINGLE_OUTER + RING.DOUBLE_OUTER) / 2
      const result = getScoreAt(0, r, R)
      expect(result.number).toBe(20)
      expect(result.multiplier).toBe(2)
      expect(result.points).toBe(40)
    })

    it('outer single ring for number 20', () => {
      const r = (RING.TRIPLE_OUTER + RING.OUTER_SINGLE_OUTER) / 2
      const result = getScoreAt(0, r, R)
      expect(result.number).toBe(20)
      expect(result.multiplier).toBe(1)
      expect(result.points).toBe(20)
    })
  })

  describe('Edge cases', () => {
    it('sector boundary precision — point right between 20 and 5', () => {
      // The boundary between sector 20 (index 0) and sector 5 (index 19) is at -9° (or 351°)
      // A point at exactly this boundary should be assigned to one sector without error
      const r = (RING.SINGLE_BULL_OUTER + RING.INNER_SINGLE_OUTER) / 2
      const boundaryAngle = (-9 * Math.PI) / 180  // exactly -9°
      const x = r * Math.sin(boundaryAngle)
      const y = r * Math.cos(boundaryAngle)
      const result = getScoreAt(x, y, R)
      expect([20, 5]).toContain(result.number)
    })

    it('large board radius scales correctly', () => {
      const bigR = 170  // mm-based board radius
      const r = (RING.SINGLE_BULL_OUTER + RING.INNER_SINGLE_OUTER) / 2 * bigR
      const result = getScoreAt(0, r, bigR)
      expect(result.number).toBe(20)
    })
  })
})

describe('getSectorCenter', () => {
  it('returns a point inside the triple ring for triple 20', () => {
    const center = getSectorCenter(20, 'triple', R)
    const score = getScoreAt(center.x, center.y, R)
    expect(score.number).toBe(20)
    expect(score.multiplier).toBe(3)
  })

  it('returns a point inside the double ring for double 20', () => {
    const center = getSectorCenter(20, 'double', R)
    const score = getScoreAt(center.x, center.y, R)
    expect(score.number).toBe(20)
    expect(score.multiplier).toBe(2)
  })

  it('returns origin for double bull', () => {
    const center = getSectorCenter(25, 'double_bull', R)
    const score = getScoreAt(center.x, center.y, R)
    expect(score.region).toBe('double_bull')
  })
})
