import { describe, expect, it } from 'vitest'
import {
  characterLevelFromClassLevels,
  CUMULATIVE_XP_FOR_LEVEL,
  nextLevelCumulativeXp,
  parseExperiencePointsField,
} from './xpThresholds'

describe('CUMULATIVE_XP_FOR_LEVEL', () => {
  it('has 20 PHB thresholds', () => {
    expect(CUMULATIVE_XP_FOR_LEVEL).toHaveLength(20)
    expect(CUMULATIVE_XP_FOR_LEVEL[0]).toBe(0)
    expect(CUMULATIVE_XP_FOR_LEVEL[1]).toBe(300)
    expect(CUMULATIVE_XP_FOR_LEVEL[19]).toBe(355000)
  })
})

describe('characterLevelFromClassLevels', () => {
  it('sums levels and clamps', () => {
    expect(
      characterLevelFromClassLevels([
        { class: 'fighter', level: 2 },
        { class: 'wizard', level: 3 },
      ]),
    ).toBe(5)
  })

  it('defaults to 1 when sum is zero', () => {
    expect(characterLevelFromClassLevels([])).toBe(1)
  })
})

describe('parseExperiencePointsField', () => {
  it('parses first integer and strips commas', () => {
    expect(parseExperiencePointsField('6,500 XP')).toBe(6500)
    expect(parseExperiencePointsField('  6500  ')).toBe(6500)
  })

  it('returns null when missing', () => {
    expect(parseExperiencePointsField('')).toBeNull()
    expect(parseExperiencePointsField('n/a')).toBeNull()
  })
})

describe('nextLevelCumulativeXp', () => {
  it('returns cumulative XP for the next tier', () => {
    expect(nextLevelCumulativeXp(1)).toBe(300)
    expect(nextLevelCumulativeXp(5)).toBe(14000)
  })

  it('returns null at level 20', () => {
    expect(nextLevelCumulativeXp(20)).toBeNull()
  })
})
