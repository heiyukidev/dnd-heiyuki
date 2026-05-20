import { describe, expect, it } from 'vitest'

import { createDefaultSheet } from '../defaults'
import {
  applyDerivedPipeline,
  expireActiveEffectsForRound,
  proficiencyBonusFromLevel,
} from './applyDerivedPipeline'

describe('applyDerivedPipeline', () => {
  it('computes proficiency bonus from total level', () => {
    expect(proficiencyBonusFromLevel(1)).toBe(2)
    expect(proficiencyBonusFromLevel(5)).toBe(3)
    expect(proficiencyBonusFromLevel(9)).toBe(4)
  })

  it('derives save and skill mods for single-class fighter', () => {
    const sheet = createDefaultSheet()
    sheet.classLevels = [{ class: 'fighter', level: 3 }]
    sheet.race = 'human'
    sheet.abilityBaseScores = { str: 15, dex: 14, con: 13, int: 8, wis: 12, cha: 10 }
    const { sheet: out, stats } = applyDerivedPipeline(sheet, { hp: 20, maxHp: 30 })
    expect(out.proficiencyBonus).toBe('+2')
    expect(out.saves?.str?.prof).toBe(true)
    expect(out.saves?.str?.mod).toBe('+5')
    expect(out.skills?.athletics?.mod).toBe('+3')
    expect(stats.maxHp).toBeGreaterThan(0)
  })

  it('applies AC effects (barkskin floor + mage armor set)', () => {
    const sheet = createDefaultSheet()
    sheet.classLevels = [{ class: 'wizard', level: 5 }]
    sheet.race = 'elf'
    sheet.abilityBaseScores = { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 }
    sheet.activeEffects = [
      { id: '1', effectKey: 'mage-armor' },
      { id: '2', effectKey: 'barkskin' },
    ]
    const { sheet: out } = applyDerivedPipeline(sheet, { hp: 10, maxHp: 20 })
    expect(out.armorClass).toBe(16)
  })

  it('grants false-life temp HP without raising max HP or current HP', () => {
    const sheet = createDefaultSheet()
    sheet.classLevels = [{ class: 'wizard', level: 5 }]
    sheet.race = 'human'
    sheet.abilityBaseScores = { str: 8, dex: 14, con: 13, int: 15, wis: 12, cha: 10 }
    sheet.activeEffects = [{ id: 'fl1', effectKey: 'false-life' }]
    sheet.statOverrides = { maxHp: true }
    const result = applyDerivedPipeline(
      sheet,
      { hp: 20, maxHp: 30, tempHp: 0 },
      { previousActiveEffectIds: [] },
    )
    expect(result.tempHpGrant).toBe(12)
    expect(result.stats.hp).toBe(20)
    expect(result.stats.maxHp).toBe(30)
    expect(result.stats.tempHp).toBe(12)
  })

  it('expires shield after one combat round', () => {
    const effects = [{ id: 's1', effectKey: 'shield', startedRound: 1, endsAtRound: 1 }]
    expect(expireActiveEffectsForRound(effects, 1)).toHaveLength(1)
    expect(expireActiveEffectsForRound(effects, 2)).toHaveLength(0)
  })
})
