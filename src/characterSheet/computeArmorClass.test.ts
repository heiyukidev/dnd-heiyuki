import { merge } from 'lodash'
import { describe, expect, it } from 'vitest'

import { computeArmorClass, dexModifierFromSheet } from './computeArmorClass'
import type { CharacterSheetForm } from './defaults'

const BLANK_ABILITIES = {
  str: { score: '', mod: '' },
  dex: { score: '', mod: '' },
  con: { score: '', mod: '' },
  int: { score: '', mod: '' },
  wis: { score: '', mod: '' },
  cha: { score: '', mod: '' },
} satisfies CharacterSheetForm['abilities']

function acInput(
  overrides: Partial<Pick<CharacterSheetForm, 'equippedLoadout' | 'abilities'>> = {},
): Pick<CharacterSheetForm, 'equippedLoadout' | 'abilities'> {
  return {
    abilities: merge({}, BLANK_ABILITIES, overrides.abilities),
    equippedLoadout: { ...overrides.equippedLoadout },
  }
}

describe('computeArmorClass', () => {
  it('chain mail + shield: heavy armor ignores Dex, adds shield +2', () => {
    expect(
      computeArmorClass(
        acInput({
          abilities: { dex: { score: '16', mod: '' } },
          equippedLoadout: { armor: 'chain-mail', shield: 'shield' },
        }),
      ),
    ).toBe(18)
  })

  it('studded leather + high Dex: light armor adds full Dex mod', () => {
    expect(
      computeArmorClass(
        acInput({
          abilities: { dex: { score: '18', mod: '' } },
          equippedLoadout: { armor: 'studded-leather-armor' },
        }),
      ),
    ).toBe(16)
  })

  it('medium armor caps Dex bonus (breastplate)', () => {
    expect(
      computeArmorClass(
        acInput({
          abilities: { dex: { score: '20', mod: '' } },
          equippedLoadout: { armor: 'breastplate' },
        }),
      ),
    ).toBe(16)
  })

  it('no body armor: 10 + Dex modifier', () => {
    expect(
      computeArmorClass(
        acInput({
          abilities: { dex: { score: '14', mod: '' } },
          equippedLoadout: {},
        }),
      ),
    ).toBe(12)
  })

  it('empty armor and shield slots behaves as unarmored', () => {
    expect(
      computeArmorClass(
        acInput({
          equippedLoadout: { weapon: '', gear: '' },
        }),
      ),
    ).toBe(10)
  })

  it('invalid armor index falls back to unarmored', () => {
    expect(
      computeArmorClass(
        acInput({
          abilities: { dex: { score: '10', mod: '' } },
          equippedLoadout: { armor: 'not-real-armor-index' },
        }),
      ),
    ).toBe(10)
  })

  it('shield slot with magic animated-shield adds no bonus (no armor_class in magic JSON)', () => {
    expect(
      computeArmorClass(
        acInput({
          equippedLoadout: { armor: 'chain-mail', shield: 'animated-shield' },
        }),
      ),
    ).toBe(16)
  })

  it('uses mod field when it parses as a finite number', () => {
    expect(
      dexModifierFromSheet({
        score: '10',
        mod: '+5',
      }),
    ).toBe(5)
  })
})
