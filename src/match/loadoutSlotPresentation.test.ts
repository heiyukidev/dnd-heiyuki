import { map } from 'lodash'
import { describe, expect, it } from 'vitest'

import { ITEM_CATALOG } from './itemCatalog'
import {
  formatCooldownLine,
  formatEffectSentence,
  formatPassiveCue,
  formatPassiveSentence,
  getDraftOfferPresentation,
  getKindColor,
  getLoadoutSlotPresentation,
  getLoadoutSlotPresentationForMatch,
  getLoadoutSlotPresentationFromItem,
  LOADOUT_EFFECT_KIND_COLORS,
  LOADOUT_PASSIVE_ACCENT_COLOR,
} from './loadoutSlotPresentation'
import type { ItemEffect, MatchSeatState } from './types'

function makeSeats(
  seat0Slots: string[],
  seat1Slots: string[] = ['hermes_winged_needle', 'hygieia_soft_bandage', 'athena_aegis_chip'],
): [MatchSeatState, MatchSeatState] {
  return [
    {
      life: 100,
      shield: 0,
      slots: map(seat0Slots, (itemKey) => ({ itemKey })),
    },
    {
      life: 100,
      shield: 0,
      slots: map(seat1Slots, (itemKey) => ({ itemKey })),
    },
  ]
}

describe('loadoutSlotPresentation', () => {
  const effectTemplateCases: {
    effect: ItemEffect
    potency: number
    sentence: string
    kindColor: string
  }[] = [
    {
      effect: 'damage',
      potency: 5,
      sentence: 'Deal 5 damage',
      kindColor: LOADOUT_EFFECT_KIND_COLORS.damage,
    },
    {
      effect: 'heal',
      potency: 5,
      sentence: 'Heal 5',
      kindColor: LOADOUT_EFFECT_KIND_COLORS.heal,
    },
    {
      effect: 'shield',
      potency: 6,
      sentence: 'Gain 6 shield',
      kindColor: LOADOUT_EFFECT_KIND_COLORS.shield,
    },
  ]

  it('formats each effect template with matching potency and kind color', () => {
    map(effectTemplateCases, ({ effect, potency, sentence, kindColor }) => {
      expect(formatEffectSentence(effect, potency)).toBe(sentence)
      expect(getKindColor(effect)).toBe(kindColor)
    })
  })

  const cooldownCases: { cooldownMs: number; line: string }[] = [
    { cooldownMs: 1_200, line: 'Cooldown 1.2s' },
    { cooldownMs: 5_000, line: 'Cooldown 5s' },
    { cooldownMs: 2_000, line: 'Cooldown 2s' },
    { cooldownMs: 6_000, line: 'Cooldown 6s' },
  ]

  it('formats whole and fractional cooldown seconds', () => {
    map(cooldownCases, ({ cooldownMs, line }) => {
      expect(formatCooldownLine(cooldownMs)).toBe(line)
    })
  })

  const invalidCooldownCases: { cooldownMs: number; line: string }[] = [
    { cooldownMs: Number.NaN, line: 'Cooldown 0s' },
    { cooldownMs: Number.POSITIVE_INFINITY, line: 'Cooldown 0s' },
    { cooldownMs: -500, line: 'Cooldown 0s' },
  ]

  it('defaults invalid cooldown values to a safe line', () => {
    map(invalidCooldownCases, ({ cooldownMs, line }) => {
      expect(formatCooldownLine(cooldownMs)).toBe(line)
    })
  })

  const catalogItemCases: {
    itemKey: keyof typeof ITEM_CATALOG
    name: string
    effect: ItemEffect
    potency: number
    cooldownLine: string
  }[] = [
    {
      itemKey: 'hermes_winged_needle',
      name: 'Winged Needle',
      effect: 'damage',
      potency: 5,
      cooldownLine: 'Cooldown 1.2s',
    },
    {
      itemKey: 'dynamite_fuse_bomb',
      name: 'Fuse Bomb',
      effect: 'damage',
      potency: 22,
      cooldownLine: 'Cooldown 5s',
    },
    {
      itemKey: 'hygieia_soft_bandage',
      name: 'Soft Bandage',
      effect: 'heal',
      potency: 7,
      cooldownLine: 'Cooldown 2s',
    },
    {
      itemKey: 'hygieia_restorative_hymn',
      name: 'Restorative Hymn',
      effect: 'heal',
      potency: 22,
      cooldownLine: 'Cooldown 6s',
    },
    {
      itemKey: 'athena_aegis_chip',
      name: 'Aegis Chip',
      effect: 'shield',
      potency: 8,
      cooldownLine: 'Cooldown 2.5s',
    },
    {
      itemKey: 'athena_parthenon',
      name: 'Parthenon',
      effect: 'shield',
      potency: 27,
      cooldownLine: 'Cooldown 7s',
    },
  ]

  it('maps fire-only catalog items to face and popover fields with echoed potency', () => {
    map(catalogItemCases, ({ itemKey, name, effect, potency, cooldownLine }) => {
      const presentation = getLoadoutSlotPresentation(itemKey, ITEM_CATALOG)
      expect(presentation.name).toBe(name)
      expect(presentation.faceKind).toBe('fire')
      expect(presentation.showCooldownBar).toBe(true)
      expect(presentation.effect).toBe(effect)
      expect(presentation.potency).toBe(potency)
      expect(presentation.effectSentence).toBe(formatEffectSentence(effect, potency))
      expect(presentation.cooldownLine).toBe(cooldownLine)
      expect(presentation.effectiveCooldownMs).toBe(ITEM_CATALOG[itemKey].cooldownMs)
      expect(presentation.kindColor).toBe(getKindColor(effect))
      expect(presentation.passiveSentence).toBeUndefined()
    })
  })

  it('builds the same model from an item definition', () => {
    const item = ITEM_CATALOG.hermes_winged_needle
    expect(getLoadoutSlotPresentationFromItem(item)).toEqual(
      getLoadoutSlotPresentation('hermes_winged_needle', ITEM_CATALOG),
    )
  })

  it('falls back safely for unknown catalog keys', () => {
    const presentation = getLoadoutSlotPresentation('missing-item', ITEM_CATALOG)
    expect(presentation).toEqual({
      name: 'missing-item',
      faceKind: 'fire',
      kindColor: LOADOUT_EFFECT_KIND_COLORS.damage,
      showCooldownBar: true,
      effect: 'damage',
      potency: 0,
      effectSentence: 'Unknown boon',
      cooldownLine: 'Cooldown 2s',
      effectiveCooldownMs: 2_000,
    })
  })

  it('presents passive-only hermes_slipstream with distinct face and no cooldown bar fields', () => {
    const presentation = getLoadoutSlotPresentation('hermes_slipstream', ITEM_CATALOG)
    expect(presentation).toEqual({
      name: 'Slipstream',
      faceKind: 'passive',
      kindColor: LOADOUT_PASSIVE_ACCENT_COLOR,
      showCooldownBar: false,
      passiveCue: '−18% Hermes CD',
      passiveSentence: 'Reduce your Hermes Boons Cooldown by 18%',
    })
  })

  it('presents hybrid hygieia_vital_bloom with fire face and passive popover line', () => {
    const presentation = getLoadoutSlotPresentation('hygieia_vital_bloom', ITEM_CATALOG)
    expect(presentation.faceKind).toBe('fire')
    expect(presentation.showCooldownBar).toBe(true)
    expect(presentation.effect).toBe('heal')
    expect(presentation.potency).toBe(8)
    expect(presentation.effectSentence).toBe('Heal 8')
    expect(presentation.cooldownLine).toBe('Cooldown 2.5s')
    expect(presentation.passiveSentence).toBe('Grant +3 potency to your heal Boons')
  })

  it('formats passive templates for god and effect filters', () => {
    expect(formatPassiveCue(ITEM_CATALOG.hermes_stolen_seconds.passive!)).toBe('−15% dmg Bow CD')
    expect(formatPassiveSentence(ITEM_CATALOG.hermes_stolen_seconds.passive!)).toBe(
      'Reduce your damage Bow Boons Cooldown by 15%',
    )
    expect(formatPassiveCue(ITEM_CATALOG.zeus_thunder_tyrant.passive!)).toBe('+15% dmg CD')
    expect(formatPassiveSentence(ITEM_CATALOG.zeus_thunder_tyrant.passive!)).toBe(
      'Increase enemy damage Boons Cooldown by 15%',
    )
  })

  it('uses effective stats in draft offer when loadout has passives and weapon', () => {
    const offer = getDraftOfferPresentation({
      god: 'Hermes',
      optionKeys: ['hermes_winged_needle'],
      catalog: ITEM_CATALOG,
      seat: 0,
      loadoutKeys: ['hermes_stolen_seconds'],
      weaponKeys: ['hunters_bow', 'steel_longsword'],
    })
    expect(offer.choices[0]?.cooldownLine).toBe('Cooldown 0.959s')
    expect(offer.choices[0]?.potency).toBe(5)
  })

  it('uses soul-adjusted stats in draft offer when soul is provided', () => {
    const offer = getDraftOfferPresentation({
      god: 'Hermes',
      optionKeys: ['hermes_winged_needle'],
      catalog: ITEM_CATALOG,
      seat: 0,
      loadoutKeys: [],
      souls: [{ strength: 2, speed: 3, vitality: 1 }, { strength: 0, speed: 0, vitality: 0 }],
    })
    expect(offer.choices[0]?.potency).toBeCloseTo(5.6)
    expect(offer.choices[0]?.cooldownLine).toBe('Cooldown 1.128s')
  })

  it('builds draft offer presentation with god label and three choices', () => {
    const offer = getDraftOfferPresentation({
      god: 'Hermes',
      optionKeys: ['hermes_winged_needle', 'hermes_dash_cut', 'hermes_slipstream'],
      catalog: ITEM_CATALOG,
    })
    expect(offer.godLabel).toBe('Hermes')
    expect(offer.choices).toHaveLength(3)
    expect(offer.choices[0]?.key).toBe('hermes_winged_needle')
    expect(offer.choices[0]?.name).toBe('Winged Needle')
    expect(offer.choices[2]?.faceKind).toBe('passive')
  })

  it('uses effective cooldown when stolen seconds is in the same loadout', () => {
    const seats = makeSeats([
      'hermes_stolen_seconds',
      'hermes_winged_needle',
      'hygieia_soft_bandage',
    ])
    const presentation = getLoadoutSlotPresentationForMatch({
      itemKey: 'hermes_winged_needle',
      catalog: ITEM_CATALOG,
      seats,
      seat: 0,
      slotIndex: 1,
      weaponKeys: ['hunters_bow', 'steel_longsword'],
    })
    expect(presentation.potency).toBe(5)
    expect(presentation.cooldownLine).toBe('Cooldown 0.959s')
    expect(presentation.effectiveCooldownMs).toBe(958.8)
  })

  it('uses effective potency when vital bloom is in the same loadout', () => {
    const seats = makeSeats(['hygieia_vital_bloom', 'hygieia_soft_bandage', 'hermes_winged_needle'])
    const presentation = getLoadoutSlotPresentationForMatch({
      itemKey: 'hygieia_soft_bandage',
      catalog: ITEM_CATALOG,
      seats,
      seat: 0,
      slotIndex: 1,
    })
    expect(presentation.potency).toBe(10)
    expect(presentation.effectSentence).toBe('Heal 10')
    expect(presentation.cooldownLine).toBe('Cooldown 2s')
  })

  it('applies opposing-seat passives when seat target is enemy', () => {
    const seats = makeSeats(
      ['hermes_winged_needle', 'hygieia_soft_bandage', 'athena_aegis_chip'],
      ['zeus_thunder_tyrant', 'hygieia_restorative_hymn', 'athena_parthenon'],
    )
    const presentation = getLoadoutSlotPresentationForMatch({
      itemKey: 'hermes_winged_needle',
      catalog: ITEM_CATALOG,
      seats,
      seat: 0,
      slotIndex: 0,
    })
    expect(presentation.cooldownLine).toBe('Cooldown 1.38s')
    expect(presentation.effectiveCooldownMs).toBe(1_380)
  })

  it('keeps base stats for match presentation when no passives apply', () => {
    const seats = makeSeats(['hermes_winged_needle', 'hygieia_soft_bandage', 'athena_aegis_chip'])
    const presentation = getLoadoutSlotPresentationForMatch({
      itemKey: 'hermes_winged_needle',
      catalog: ITEM_CATALOG,
      seats,
      seat: 0,
      slotIndex: 0,
    })
    expect(presentation).toEqual(getLoadoutSlotPresentation('hermes_winged_needle', ITEM_CATALOG))
  })
})
