import { map } from 'lodash'
import { describe, expect, it } from 'vitest'

import { ITEM_CATALOG } from './itemCatalog'
import {
  formatCooldownLine,
  formatEffectSentence,
  formatPassiveCue,
  formatPassiveSentence,
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
  seat1Slots: string[] = ['spark', 'salve', 'ward'],
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
      potency: 8,
      sentence: 'Deal 8 damage',
      kindColor: LOADOUT_EFFECT_KIND_COLORS.damage,
    },
    {
      effect: 'heal',
      potency: 6,
      sentence: 'Heal 6',
      kindColor: LOADOUT_EFFECT_KIND_COLORS.heal,
    },
    {
      effect: 'shield',
      potency: 8,
      sentence: 'Gain 8 shield',
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
    { cooldownMs: 2_000, line: 'Cooldown 2s' },
    { cooldownMs: 4_500, line: 'Cooldown 4.5s' },
    { cooldownMs: 2_500, line: 'Cooldown 2.5s' },
    { cooldownMs: 5_000, line: 'Cooldown 5s' },
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
      itemKey: 'spark',
      name: 'Spark',
      effect: 'damage',
      potency: 8,
      cooldownLine: 'Cooldown 2s',
    },
    {
      itemKey: 'cannon',
      name: 'Cannon',
      effect: 'damage',
      potency: 18,
      cooldownLine: 'Cooldown 4.5s',
    },
    {
      itemKey: 'salve',
      name: 'Salve',
      effect: 'heal',
      potency: 6,
      cooldownLine: 'Cooldown 2.5s',
    },
    {
      itemKey: 'mend',
      name: 'Mend',
      effect: 'heal',
      potency: 14,
      cooldownLine: 'Cooldown 5s',
    },
    {
      itemKey: 'ward',
      name: 'Ward',
      effect: 'shield',
      potency: 8,
      cooldownLine: 'Cooldown 3s',
    },
    {
      itemKey: 'bulwark',
      name: 'Bulwark',
      effect: 'shield',
      potency: 16,
      cooldownLine: 'Cooldown 5.5s',
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
      expect(presentation.effectiveCooldownMs).toBe(
        ITEM_CATALOG[itemKey].cooldownMs,
      )
      expect(presentation.kindColor).toBe(getKindColor(effect))
      expect(presentation.passiveSentence).toBeUndefined()
    })
  })

  it('builds the same model from an item definition', () => {
    const item = ITEM_CATALOG.spark
    expect(getLoadoutSlotPresentationFromItem(item)).toEqual(
      getLoadoutSlotPresentation('spark', ITEM_CATALOG),
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
      effectSentence: 'Unknown item',
      cooldownLine: 'Cooldown 2s',
      effectiveCooldownMs: 2_000,
    })
  })

  it('presents passive-only haste_charm with distinct face and no cooldown bar fields', () => {
    const presentation = getLoadoutSlotPresentation('haste_charm', ITEM_CATALOG)
    expect(presentation).toEqual({
      name: 'Haste Charm',
      faceKind: 'passive',
      kindColor: LOADOUT_PASSIVE_ACCENT_COLOR,
      showCooldownBar: false,
      passiveCue: '−20% dmg CD',
      passiveSentence: 'Reduce your damage Items Cooldown by 20%',
    })
  })

  it('presents hybrid vital_spark with fire face and passive popover line', () => {
    const presentation = getLoadoutSlotPresentation('vital_spark', ITEM_CATALOG)
    expect(presentation.faceKind).toBe('fire')
    expect(presentation.showCooldownBar).toBe(true)
    expect(presentation.effect).toBe('heal')
    expect(presentation.potency).toBe(5)
    expect(presentation.effectSentence).toBe('Heal 5')
    expect(presentation.cooldownLine).toBe('Cooldown 3s')
    expect(presentation.passiveSentence).toBe('Grant +2 potency to your heal Items')
  })

  it('formats passive templates for the new catalog keys', () => {
    expect(formatPassiveCue(ITEM_CATALOG.haste_charm.passive!)).toBe('−20% dmg CD')
    expect(formatPassiveSentence(ITEM_CATALOG.haste_charm.passive!)).toBe(
      'Reduce your damage Items Cooldown by 20%',
    )
    expect(formatPassiveCue(ITEM_CATALOG.vital_spark.passive!)).toBe('+2 heal')
    expect(formatPassiveSentence(ITEM_CATALOG.vital_spark.passive!)).toBe(
      'Grant +2 potency to your heal Items',
    )
  })

  it('uses effective cooldown when haste_charm is in the same loadout', () => {
    const seats = makeSeats(['haste_charm', 'spark', 'salve'])
    const presentation = getLoadoutSlotPresentationForMatch({
      itemKey: 'spark',
      catalog: ITEM_CATALOG,
      seats,
      seat: 0,
      slotIndex: 1,
    })
    expect(presentation.potency).toBe(8)
    expect(presentation.cooldownLine).toBe('Cooldown 1.6s')
    expect(presentation.effectiveCooldownMs).toBe(1_600)
  })

  it('uses effective potency when vital_spark is in the same loadout', () => {
    const seats = makeSeats(['vital_spark', 'salve', 'spark'])
    const presentation = getLoadoutSlotPresentationForMatch({
      itemKey: 'salve',
      catalog: ITEM_CATALOG,
      seats,
      seat: 0,
      slotIndex: 1,
    })
    expect(presentation.potency).toBe(8)
    expect(presentation.effectSentence).toBe('Heal 8')
    expect(presentation.cooldownLine).toBe('Cooldown 2.5s')
  })

  it('applies opposing-seat passives when seat target is enemy', () => {
    const seats = makeSeats(
      ['spark', 'salve', 'ward'],
      ['haste_charm', 'mend', 'bulwark'],
    )
    const enemyCharm = {
      ...ITEM_CATALOG.haste_charm,
      passive: {
        seatTarget: 'enemy' as const,
        filter: 'damage' as const,
        changes: [{ stat: 'cooldown' as const, mode: 'percent' as const, value: -0.2 }],
      },
    }
    const catalog = { ...ITEM_CATALOG, haste_charm: enemyCharm }
    const presentation = getLoadoutSlotPresentationForMatch({
      itemKey: 'spark',
      catalog,
      seats,
      seat: 0,
      slotIndex: 0,
    })
    expect(presentation.cooldownLine).toBe('Cooldown 1.6s')
    expect(presentation.effectiveCooldownMs).toBe(1_600)
  })

  it('keeps base stats for match presentation when no passives apply', () => {
    const seats = makeSeats(['spark', 'salve', 'ward'])
    const presentation = getLoadoutSlotPresentationForMatch({
      itemKey: 'spark',
      catalog: ITEM_CATALOG,
      seats,
      seat: 0,
      slotIndex: 0,
    })
    expect(presentation).toEqual(getLoadoutSlotPresentation('spark', ITEM_CATALOG))
  })
})
