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
  seat1Slots: string[] = ['hermes_winged_needle', 'apollo_sun_balm', 'athena_aegis_chip'],
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
      sentence: 'Deal 5.0 damage',
      kindColor: LOADOUT_EFFECT_KIND_COLORS.damage,
    },
    {
      effect: 'heal',
      potency: 5,
      sentence: 'Heal 5.0',
      kindColor: LOADOUT_EFFECT_KIND_COLORS.heal,
    },
    {
      effect: 'shield',
      potency: 6,
      sentence: 'Gain 6.0 shield',
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
    { cooldownMs: 5_000, line: 'Cooldown 5.0s' },
    { cooldownMs: 2_000, line: 'Cooldown 2.0s' },
    { cooldownMs: 6_000, line: 'Cooldown 6.0s' },
  ]

  it('formats whole and fractional cooldown seconds', () => {
    map(cooldownCases, ({ cooldownMs, line }) => {
      expect(formatCooldownLine(cooldownMs)).toBe(line)
    })
  })

  const invalidCooldownCases: { cooldownMs: number; line: string }[] = [
    { cooldownMs: Number.NaN, line: 'Cooldown 0.0s' },
    { cooldownMs: Number.POSITIVE_INFINITY, line: 'Cooldown 0.0s' },
    { cooldownMs: -500, line: 'Cooldown 0.0s' },
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
      potency: 4,
      cooldownLine: 'Cooldown 1.0s',
    },
    {
      itemKey: 'ares_blood_surge',
      name: 'Blood Surge',
      effect: 'damage',
      potency: 22,
      cooldownLine: 'Cooldown 5.0s',
    },
    {
      itemKey: 'apollo_sun_balm',
      name: 'Sun Balm',
      effect: 'heal',
      potency: 7,
      cooldownLine: 'Cooldown 2.0s',
    },
    {
      itemKey: 'apollo_healers_hand',
      name: "Healer's Hand",
      effect: 'heal',
      potency: 16,
      cooldownLine: 'Cooldown 4.5s',
    },
    {
      itemKey: 'athena_aegis_chip',
      name: 'Aegis Chip',
      effect: 'shield',
      potency: 8,
      cooldownLine: 'Cooldown 2.5s',
    },
    {
      itemKey: 'athena_tower_ward',
      name: 'Tower Ward',
      effect: 'shield',
      potency: 19,
      cooldownLine: 'Cooldown 5.0s',
    },
  ]

  it('maps fire-only catalog items to face and popover fields with echoed potency', () => {
    map(catalogItemCases, ({ itemKey, name, effect, potency, cooldownLine }) => {
      const presentation = getLoadoutSlotPresentation(itemKey, ITEM_CATALOG)
      const item = ITEM_CATALOG[itemKey]
      const expectedSentence =
        item.requiredWeaponType === undefined
          ? formatEffectSentence(effect, potency)
          : `${formatEffectSentence(effect, potency)} (${item.requiredWeaponType})`
      expect(presentation.name).toBe(name)
      expect(presentation.faceKind).toBe('fire')
      expect(presentation.showCooldownBar).toBe(true)
      expect(presentation.effect).toBe(effect)
      expect(presentation.potency).toBe(potency)
      expect(presentation.effectSentence).toBe(expectedSentence)
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
      cooldownLine: 'Cooldown 2.0s',
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
      passiveCue: '−18.0% Hermes CD',
      passiveSentence: 'Reduce your Hermes Boons Cooldown by 18.0%',
    })
  })

  it('presents hybrid apollo_vital_bloom with fire face and passive popover line', () => {
    const presentation = getLoadoutSlotPresentation('apollo_vital_bloom', ITEM_CATALOG)
    expect(presentation.faceKind).toBe('fire')
    expect(presentation.showCooldownBar).toBe(true)
    expect(presentation.effect).toBe('heal')
    expect(presentation.potency).toBe(8)
    expect(presentation.effectSentence).toBe('Heal 8.0')
    expect(presentation.cooldownLine).toBe('Cooldown 2.5s')
    expect(presentation.passiveSentence).toBe('Grant +3.0 potency to your heal Boons')
  })

  it('formats passive templates for god and effect filters', () => {
    expect(formatPassiveCue(ITEM_CATALOG.hermes_stolen_seconds.passive!)).toBe('−15.0% dmg Spear CD')
    expect(formatPassiveSentence(ITEM_CATALOG.hermes_stolen_seconds.passive!)).toBe(
      'Reduce your damage Spear Boons Cooldown by 15.0%',
    )
    expect(formatPassiveCue(ITEM_CATALOG.zeus_thunder_tyrant.passive!)).toBe('+15.0% dmg CD')
    expect(formatPassiveSentence(ITEM_CATALOG.zeus_thunder_tyrant.passive!)).toBe(
      'Increase enemy damage Boons Cooldown by 15.0%',
    )
  })

  it('uses effective stats in draft offer when loadout has passives and weapon', () => {
    const offer = getDraftOfferPresentation({
      god: 'Hermes',
      optionKeys: ['hermes_winged_needle'],
      catalog: ITEM_CATALOG,
      seat: 0,
      loadoutKeys: ['hermes_stolen_seconds'],
      weaponKeys: ['bronze_spear', 'steel_longsword'],
    })
    expect(offer.choices[0]?.cooldownLine).toBe('Cooldown 0.8s')
    expect(offer.choices[0]?.potency).toBeCloseTo(4.16)
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
    expect(offer.choices[0]?.potency).toBeCloseTo(4.48)
    expect(offer.choices[0]?.cooldownLine).toBe('Cooldown 0.9s')
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
      'apollo_sun_balm',
    ])
    const presentation = getLoadoutSlotPresentationForMatch({
      itemKey: 'hermes_winged_needle',
      catalog: ITEM_CATALOG,
      seats,
      seat: 0,
      slotIndex: 1,
      weaponKeys: ['bronze_spear', 'steel_longsword'],
    })
    expect(presentation.potency).toBeCloseTo(4.16)
    expect(presentation.cooldownLine).toBe('Cooldown 0.8s')
    expect(presentation.effectiveCooldownMs).toBe(807.5)
  })

  it('uses effective potency when vital bloom is in the same loadout', () => {
    const seats = makeSeats(['apollo_vital_bloom', 'apollo_sun_balm', 'hermes_winged_needle'])
    const presentation = getLoadoutSlotPresentationForMatch({
      itemKey: 'apollo_sun_balm',
      catalog: ITEM_CATALOG,
      seats,
      seat: 0,
      slotIndex: 1,
    })
    expect(presentation.potency).toBe(10)
    expect(presentation.effectSentence).toBe('Heal 10.0 (Wand)')
    expect(presentation.cooldownLine).toBe('Cooldown 2.0s')
  })

  it('applies opposing-seat passives when seat target is enemy', () => {
    const seats = makeSeats(
      ['hermes_winged_needle', 'apollo_sun_balm', 'athena_aegis_chip'],
      ['zeus_thunder_tyrant', 'apollo_paean', 'athena_parthenon'],
    )
    const presentation = getLoadoutSlotPresentationForMatch({
      itemKey: 'hermes_winged_needle',
      catalog: ITEM_CATALOG,
      seats,
      seat: 0,
      slotIndex: 0,
    })
    expect(presentation.cooldownLine).toBe('Cooldown 1.1s')
    expect(presentation.effectiveCooldownMs).toBe(1_150)
  })

  it('keeps base stats for match presentation when no passives apply', () => {
    const seats = makeSeats(['hermes_winged_needle', 'apollo_sun_balm', 'athena_aegis_chip'])
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
