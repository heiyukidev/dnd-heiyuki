import { merge } from 'lodash'
import { describe, expect, it } from 'vitest'

import { computeWalkingSpeed } from './computeWalkingSpeed'
import type { CharacterSheetForm } from './defaults'

const BLANK_ABILITIES = {
  str: { score: '', mod: '' },
  dex: { score: '', mod: '' },
  con: { score: '', mod: '' },
  int: { score: '', mod: '' },
  wis: { score: '', mod: '' },
  cha: { score: '', mod: '' },
} satisfies CharacterSheetForm['abilities']

function speedInput(
  overrides: Partial<
    Pick<CharacterSheetForm, 'race' | 'abilities' | 'equippedLoadout' | 'classLevels'>
  > = {},
): Pick<CharacterSheetForm, 'race' | 'abilities' | 'equippedLoadout' | 'classLevels'> {
  return {
    race: overrides.race ?? '',
    abilities: merge({}, BLANK_ABILITIES, overrides.abilities),
    equippedLoadout: { ...overrides.equippedLoadout },
    classLevels: overrides.classLevels ?? [],
  }
}

describe('computeWalkingSpeed', () => {
  it('human base 30 ft', () => {
    expect(
      computeWalkingSpeed(
        speedInput({
          race: 'human',
        }),
      ),
    ).toBe(30)
  })

  it('dwarf base 25 ft', () => {
    expect(
      computeWalkingSpeed(
        speedInput({
          race: 'dwarf',
        }),
      ),
    ).toBe(25)
  })

  it('gnome base 25 ft', () => {
    expect(
      computeWalkingSpeed(
        speedInput({
          race: 'gnome',
        }),
      ),
    ).toBe(25)
  })

  it('chain mail under STR requirement: −10 ft (non-dwarf)', () => {
    expect(
      computeWalkingSpeed(
        speedInput({
          race: 'human',
          abilities: { str: { score: '12', mod: '' } },
          equippedLoadout: { armor: 'chain-mail' },
        }),
      ),
    ).toBe(20)
  })

  it('chain mail under STR requirement: dwarf ignores heavy-armor speed reduction', () => {
    expect(
      computeWalkingSpeed(
        speedInput({
          race: 'dwarf',
          abilities: { str: { score: '12', mod: '' } },
          equippedLoadout: { armor: 'chain-mail' },
        }),
      ),
    ).toBe(25)
  })

  it('monk 6 unarmored, no shield: +15 ft on base', () => {
    expect(
      computeWalkingSpeed(
        speedInput({
          race: 'human',
          classLevels: [{ class: 'monk', level: 6 }],
        }),
      ),
    ).toBe(45)
  })

  it('monk 6 with leather armor: no monk bonus', () => {
    expect(
      computeWalkingSpeed(
        speedInput({
          race: 'human',
          classLevels: [{ class: 'monk', level: 6 }],
          equippedLoadout: { armor: 'leather-armor' },
        }),
      ),
    ).toBe(30)
  })

  it('barbarian 5 without heavy armor: +10 ft', () => {
    expect(
      computeWalkingSpeed(
        speedInput({
          race: 'human',
          classLevels: [{ class: 'barbarian', level: 5 }],
        }),
      ),
    ).toBe(40)
  })

  it('barbarian 5 with plate: no barbarian Fast Movement bonus', () => {
    expect(
      computeWalkingSpeed(
        speedInput({
          race: 'human',
          classLevels: [{ class: 'barbarian', level: 5 }],
          abilities: { str: { score: '16', mod: '' } },
          equippedLoadout: { armor: 'plate-armor' },
        }),
      ),
    ).toBe(30)
  })
})
