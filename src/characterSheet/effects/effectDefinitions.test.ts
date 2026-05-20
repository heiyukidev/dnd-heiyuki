import { describe, expect, it } from 'vitest'

import {
  defaultEndsAtRound,
  getEffectDefinition,
  listEffectDefinitions,
  tempHpGrantForEffectKey,
} from './effectDefinitions'

describe('effectDefinitions', () => {
  it('loads ten vertical slice definitions', () => {
    expect(listEffectDefinitions().length).toBe(10)
  })

  it('resolves barkskin acFloor', () => {
    const def = getEffectDefinition('barkskin')
    expect(def?.modifiers[0]).toEqual({ op: 'acFloor', value: 16 })
    expect(def?.durationRounds).toBe(10)
  })

  it('computes default endsAtRound inclusive of start round', () => {
    expect(defaultEndsAtRound(3, 10)).toBe(12)
    expect(defaultEndsAtRound(1, 1)).toBe(1)
    expect(defaultEndsAtRound(1, null)).toBe(null)
  })

  it('false-life grants flat temp HP', () => {
    expect(tempHpGrantForEffectKey('false-life')).toBe(12)
    expect(tempHpGrantForEffectKey('barkskin')).toBe(0)
  })
})
