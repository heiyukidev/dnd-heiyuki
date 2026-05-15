import { merge } from 'lodash'
import { describe, expect, it } from 'vitest'

import { computeMaxHitPoints } from './computeMaxHitPoints'
import type { CharacterSheetForm } from './defaults'

const BLANK_ABILITIES = {
  str: { score: '', mod: '' },
  dex: { score: '', mod: '' },
  con: { score: '', mod: '' },
  int: { score: '', mod: '' },
  wis: { score: '', mod: '' },
  cha: { score: '', mod: '' },
} satisfies CharacterSheetForm['abilities']

function hpInput(
  overrides: Partial<Pick<CharacterSheetForm, 'classLevels' | 'abilities'>> = {},
): Pick<CharacterSheetForm, 'classLevels' | 'abilities'> {
  return {
    abilities: merge({}, BLANK_ABILITIES, overrides.abilities),
    classLevels: overrides.classLevels ?? [],
  }
}

describe('computeMaxHitPoints', () => {
  it('fighter 5, Con 14 (+2) → 44', () => {
    expect(
      computeMaxHitPoints(
        hpInput({
          classLevels: [{ class: 'fighter', level: 5 }],
          abilities: { con: { score: '14', mod: '+2' } },
        }),
      ),
    ).toBe(44)
  })

  it('wizard 3, Con 10 (+0) → 14', () => {
    expect(
      computeMaxHitPoints(
        hpInput({
          classLevels: [{ class: 'wizard', level: 3 }],
          abilities: { con: { score: '10', mod: '' } },
        }),
      ),
    ).toBe(14)
  })

  it('multiclass fighter 2 + wizard 2 → null', () => {
    expect(
      computeMaxHitPoints(
        hpInput({
          classLevels: [
            { class: 'fighter', level: 2 },
            { class: 'wizard', level: 2 },
          ],
        }),
      ),
    ).toBeNull()
  })

  it('no class / empty classLevels → null', () => {
    expect(computeMaxHitPoints(hpInput({}))).toBeNull()
    expect(
      computeMaxHitPoints(
        hpInput({
          classLevels: [{ class: '', level: 1 }],
        }),
      ),
    ).toBeNull()
  })
})
