import { describe, expect, it } from 'vitest'

import { applyAcEffectOps, applyMaxHpBonus, applySpeedEffectOps } from './applyEffectOps'

describe('applyEffectOps', () => {
  it('acSet picks highest then floor then bonus', () => {
    const ac = applyAcEffectOps(12, 2, [
      { op: 'acSet', base: 13, addDexMod: true },
      { op: 'acFloor', value: 16 },
      { op: 'acBonus', value: 2 },
    ])
    expect(ac).toBe(18)
  })

  it('speedAdjust multiply then add in order', () => {
    const speed = applySpeedEffectOps(30, [
      { op: 'speedAdjust', multiply: 2 },
      { op: 'speedAdjust', add: 10 },
    ])
    expect(speed).toBe(70)
  })

  it('maxHpBonus adds to calculated max', () => {
    expect(applyMaxHpBonus(20, [{ op: 'maxHpBonus', value: 5 }])).toBe(25)
    expect(applyMaxHpBonus(null, [{ op: 'maxHpBonus', value: 5 }])).toBe(null)
  })

  it('barkskin + mage armor stacking matches ADR', () => {
    const mundane = 12
    const dexMod = 3
    const ac = applyAcEffectOps(mundane, dexMod, [
      { op: 'acSet', base: 13, addDexMod: true },
      { op: 'acFloor', value: 16 },
    ])
    expect(ac).toBe(16)
  })
})
