import { describe, expect, it } from 'vitest'

import {
  rollSoulStats,
  SOUL_STAT_MAX,
  SOUL_STAT_TOTAL,
  soulFavorLine,
  startingLifeFromVitality,
} from './soul'
import type { SoulStats } from './types'

function assertValidPartition(stats: SoulStats): void {
  expect(stats.strength).toBeGreaterThanOrEqual(0)
  expect(stats.strength).toBeLessThanOrEqual(SOUL_STAT_MAX)
  expect(stats.speed).toBeGreaterThanOrEqual(0)
  expect(stats.speed).toBeLessThanOrEqual(SOUL_STAT_MAX)
  expect(stats.vitality).toBeGreaterThanOrEqual(0)
  expect(stats.vitality).toBeLessThanOrEqual(SOUL_STAT_MAX)
  expect(stats.strength + stats.speed + stats.vitality).toBe(SOUL_STAT_TOTAL)
}

describe('rollSoulStats', () => {
  it('partitions 15 into three ints from 0 to 10', () => {
    let seed = 0.123
    const random = () => {
      seed = (seed * 1_103_515_245 + 12_345) % 1
      return seed
    }
    for (let i = 0; i < 200; i += 1) {
      assertValidPartition(rollSoulStats(random))
    }
  })

  it('can reach boundary splits', () => {
    const lowRandom = rollSoulStats(() => 0)
    assertValidPartition(lowRandom)

    const highRandom = rollSoulStats(() => 0.999)
    assertValidPartition(highRandom)
    expect(highRandom.strength).toBe(SOUL_STAT_MAX)
  })
})

describe('soulFavorLine', () => {
  it('returns favor lines for a clear top stat at or above 6', () => {
    expect(soulFavorLine({ strength: 8, speed: 4, vitality: 3 })).toBe('Favors damage kits')
    expect(soulFavorLine({ strength: 2, speed: 9, vitality: 4 })).toBe('Favors Hermes tempo')
    expect(soulFavorLine({ strength: 1, speed: 4, vitality: 10 })).toBe('Favors sustain')
  })

  it('returns Balanced on ties or weak tops', () => {
    expect(soulFavorLine({ strength: 6, speed: 6, vitality: 3 })).toBe('Balanced')
    expect(soulFavorLine({ strength: 5, speed: 5, vitality: 5 })).toBe('Balanced')
    expect(soulFavorLine({ strength: 5, speed: 5, vitality: 5 })).toBe('Balanced')
  })
})

describe('startingLifeFromVitality', () => {
  it('adds vitality to the baseline life cap', () => {
    expect(startingLifeFromVitality(0)).toBe(100)
    expect(startingLifeFromVitality(7)).toBe(107)
  })
})
