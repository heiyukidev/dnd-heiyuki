import { merge } from 'lodash'
import { describe, expect, it } from 'vitest'

import type { CharacterSheetForm } from './defaults'
import { createDefaultSheet } from './defaults'
import { maybeApplyStandardArrayAbilitiesToSheet } from './standardArrayAbilitiesByClass'

function sheetSlice(
  overrides: Partial<Pick<CharacterSheetForm, 'classLevels' | 'abilityBaseScores'>> = {},
): Pick<CharacterSheetForm, 'classLevels' | 'abilityBaseScores' | 'abilities'> {
  const base = createDefaultSheet()
  return {
    abilities: merge({}, base.abilities),
    abilityBaseScores: overrides.abilityBaseScores ?? {},
    classLevels: overrides.classLevels ?? [{ class: 'fighter', level: 1 }],
  }
}

describe('maybeApplyStandardArrayAbilitiesToSheet', () => {
  it('applies the class preset to abilityBaseScores when blank', () => {
    const sheet = sheetSlice({ abilityBaseScores: {} })
    expect(maybeApplyStandardArrayAbilitiesToSheet(sheet)).toBe(true)
    expect(sheet.abilityBaseScores?.str).toBe(15)
    expect(sheet.abilityBaseScores?.int).toBe(8)
  })

  it('reapplies when class changes but base scores still match another class preset', () => {
    const sheet = sheetSlice({ classLevels: [{ class: 'fighter', level: 1 }] })
    expect(maybeApplyStandardArrayAbilitiesToSheet(sheet)).toBe(true)
    expect(sheet.abilityBaseScores?.str).toBe(15)
    sheet.classLevels = [{ class: 'wizard', level: 1 }]
    expect(maybeApplyStandardArrayAbilitiesToSheet(sheet)).toBe(true)
    expect(sheet.abilityBaseScores?.int).toBe(15)
    expect(sheet.abilityBaseScores?.str).toBe(8)
  })

  it('does not overwrite when base scores no longer match any standard-array preset', () => {
    const sheet = sheetSlice({
      abilityBaseScores: { str: 18, dex: 14, con: 14, int: 8, wis: 12, cha: 10 },
      classLevels: [{ class: 'fighter', level: 1 }],
    })
    sheet.classLevels = [{ class: 'wizard', level: 1 }]
    expect(maybeApplyStandardArrayAbilitiesToSheet(sheet)).toBe(false)
    expect(sheet.abilityBaseScores?.str).toBe(18)
  })

  it('no-ops when base scores already match the current class preset', () => {
    const sheet = sheetSlice({ classLevels: [{ class: 'wizard', level: 1 }] })
    expect(maybeApplyStandardArrayAbilitiesToSheet(sheet)).toBe(true)
    expect(maybeApplyStandardArrayAbilitiesToSheet(sheet)).toBe(false)
    expect(sheet.abilityBaseScores?.int).toBe(15)
  })
})
