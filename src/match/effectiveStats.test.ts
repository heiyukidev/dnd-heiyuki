import { describe, expect, it } from 'vitest'

import {
  MIN_EFFECTIVE_COOLDOWN_MS,
  MIN_EFFECTIVE_POTENCY,
  resolveSlotEffectiveStats,
  rewriteNextReadyAtForEffectiveCooldown,
} from './effectiveStats'
import { ITEM_CATALOG } from './itemCatalog'
import type { ItemCatalog, MatchSeatState, PassiveDefinition } from './types'

function seat(slots: MatchSeatState['slots'], life = 100, shield = 0): MatchSeatState {
  return { life, shield, slots }
}

function dualSeats(a: MatchSeatState, b: MatchSeatState): [MatchSeatState, MatchSeatState] {
  return [a, b]
}

const BOW_AT_SEAT_0: [string, string] = ['hunters_bow', 'steel_longsword']

const TEST_CATALOG = {
  ...ITEM_CATALOG,
  enemy_haste: {
    key: 'enemy_haste',
    name: 'Enemy Haste',
    god: 'Zeus',
    passive: {
      seatTarget: 'enemy',
      filter: 'damage',
      changes: [{ stat: 'cooldown', mode: 'percent', value: -0.5 }],
    } satisfies PassiveDefinition,
  },
  global_slow: {
    key: 'global_slow',
    name: 'Global Slow',
    god: 'Zeus',
    passive: {
      seatTarget: 'both',
      filter: 'all',
      changes: [{ stat: 'cooldown', mode: 'percent', value: 0.1 }],
    } satisfies PassiveDefinition,
  },
  flat_potency_aura: {
    key: 'flat_potency_aura',
    name: 'Flat Potency Aura',
    god: 'Hygieia',
    passive: {
      seatTarget: 'own',
      filter: 'all',
      changes: [{ stat: 'potency', mode: 'flat', value: 3 }],
    } satisfies PassiveDefinition,
  },
  percent_potency_nerf: {
    key: 'percent_potency_nerf',
    name: 'Percent Potency Nerf',
    god: 'Zeus',
    passive: {
      seatTarget: 'own',
      filter: 'damage',
      changes: [{ stat: 'potency', mode: 'percent', value: -0.5 }],
    } satisfies PassiveDefinition,
  },
  hybrid_penalty: {
    key: 'hybrid_penalty',
    name: 'Hybrid Penalty',
    god: 'Dynamite',
    effect: 'damage',
    potency: 10,
    cooldownMs: 1_000,
    passive: {
      seatTarget: 'own',
      filter: 'damage',
      changes: [{ stat: 'potency', mode: 'flat', value: -20 }],
    } satisfies PassiveDefinition,
  },
  sword_only_haste: {
    key: 'sword_only_haste',
    name: 'Sword Only Haste',
    god: 'Hermes',
    passive: {
      seatTarget: 'own',
      filter: { effectKind: 'damage', weaponType: 'Sword' },
      changes: [{ stat: 'cooldown', mode: 'percent', value: -0.05 }],
    } satisfies PassiveDefinition,
  },
} as const satisfies ItemCatalog

describe('resolveSlotEffectiveStats', () => {
  it('returns base stats when no passives are present', () => {
    const seats = dualSeats(
      seat([{ itemKey: 'hermes_winged_needle', nextReadyAt: 1_200 }]),
      seat([{ itemKey: 'athena_aegis_chip', nextReadyAt: 2_500 }]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 0 }, ITEM_CATALOG)).toEqual({
      cooldownMs: 1_200,
      potency: 5,
    })
  })

  it('applies own-seat damage cooldown percent from hermes_stolen_seconds', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'hermes_stolen_seconds' },
        { itemKey: 'hermes_winged_needle', nextReadyAt: 1_200 },
      ]),
      seat([]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 1 }, ITEM_CATALOG, undefined, BOW_AT_SEAT_0)).toEqual({
      cooldownMs: 958.8,
      potency: 5,
    })
  })

  it('does not shorten non-damage cooldowns for hermes_stolen_seconds', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'hermes_stolen_seconds' },
        { itemKey: 'hygieia_soft_bandage', nextReadyAt: 2_000 },
      ]),
      seat([]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 1 }, ITEM_CATALOG)).toEqual({
      cooldownMs: 2_000,
      potency: 7,
    })
  })

  it('applies Hermes god filter without buffing Dynamite damage', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'hermes_slipstream' },
        { itemKey: 'hermes_winged_needle', nextReadyAt: 1_200 },
        { itemKey: 'dynamite_fuse_bomb', nextReadyAt: 5_000 },
      ]),
      seat([]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 1 }, ITEM_CATALOG)).toEqual({
      cooldownMs: expect.closeTo(984),
      potency: 5,
    })
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 2 }, ITEM_CATALOG)).toEqual({
      cooldownMs: 5_000,
      potency: 22,
    })
  })

  it('applies own-seat heal flat potency from hygieia_vital_bloom including self', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'hygieia_vital_bloom', nextReadyAt: 2_500 },
        { itemKey: 'hygieia_soft_bandage', nextReadyAt: 2_000 },
      ]),
      seat([]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 0 }, ITEM_CATALOG)).toEqual({
      cooldownMs: 2_500,
      potency: 11,
    })
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 1 }, ITEM_CATALOG)).toEqual({
      cooldownMs: 2_000,
      potency: 10,
    })
  })

  it('applies enemy seat target passives to the opposing seat', () => {
    const seats = dualSeats(
      seat([{ itemKey: 'hermes_winged_needle', nextReadyAt: 1_200 }]),
      seat([{ itemKey: 'enemy_haste' }]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 0 }, TEST_CATALOG)).toEqual({
      cooldownMs: 600,
      potency: 5,
    })
    expect(resolveSlotEffectiveStats(seats, { seat: 1, slotIndex: 0 }, TEST_CATALOG)).toEqual({})
  })

  it('lengthens enemy damage cooldown via zeus_thunder_tyrant', () => {
    const seats = dualSeats(
      seat([{ itemKey: 'hermes_winged_needle', nextReadyAt: 1_200 }]),
      seat([{ itemKey: 'zeus_thunder_tyrant' }]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 0 }, ITEM_CATALOG)).toEqual({
      cooldownMs: 1_380,
      potency: 5,
    })
  })

  it('applies both-seat target passives to either seat', () => {
    const seats = dualSeats(
      seat([{ itemKey: 'global_slow' }, { itemKey: 'hermes_winged_needle', nextReadyAt: 1_200 }]),
      seat([{ itemKey: 'hygieia_soft_bandage', nextReadyAt: 2_000 }]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 1 }, TEST_CATALOG)).toEqual({
      cooldownMs: 1_320,
      potency: 5,
    })
    expect(resolveSlotEffectiveStats(seats, { seat: 1, slotIndex: 0 }, TEST_CATALOG)).toEqual({
      cooldownMs: 2_200,
      potency: 7,
    })
  })

  it('stacks percent modifiers before flat modifiers', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'hermes_stolen_seconds' },
        { itemKey: 'flat_potency_aura' },
        { itemKey: 'hermes_winged_needle', nextReadyAt: 1_200 },
      ]),
      seat([]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 2 }, TEST_CATALOG, undefined, BOW_AT_SEAT_0)).toEqual({
      cooldownMs: 958.8,
      potency: 8,
    })
  })

  it('stacks duplicate passive carriers independently', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'hermes_stolen_seconds' },
        { itemKey: 'hermes_stolen_seconds' },
        { itemKey: 'hermes_winged_needle', nextReadyAt: 1_200 },
      ]),
      seat([]),
    )
    const result = resolveSlotEffectiveStats(
      seats,
      { seat: 0, slotIndex: 2 },
      ITEM_CATALOG,
      undefined,
      BOW_AT_SEAT_0,
    )
    expect(result.cooldownMs).toBeCloseTo(789.6)
    expect(result.potency).toBe(5)
  })

  it('floors effective cooldown at 500ms', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'hermes_slipstream' },
        { itemKey: 'hermes_slipstream' },
        { itemKey: 'hermes_slipstream' },
        { itemKey: 'hermes_quicksilver_jab', nextReadyAt: 800 },
      ]),
      seat([]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 3 }, ITEM_CATALOG)).toEqual({
      cooldownMs: MIN_EFFECTIVE_COOLDOWN_MS,
      potency: 4,
    })
  })

  it('floors effective potency at 0', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'percent_potency_nerf' },
        { itemKey: 'hybrid_penalty' },
        { itemKey: 'hermes_winged_needle', nextReadyAt: 1_200 },
      ]),
      seat([]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 2 }, TEST_CATALOG)).toEqual({
      cooldownMs: 1_200,
      potency: MIN_EFFECTIVE_POTENCY,
    })
  })

  it('returns no stats for passive-only recipients', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'hermes_stolen_seconds' },
        { itemKey: 'hermes_winged_needle', nextReadyAt: 1_200 },
      ]),
      seat([]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 0 }, ITEM_CATALOG)).toEqual({})
  })

  it('lets passive-only carriers contribute without receiving rewrites', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'hermes_stolen_seconds' },
        { itemKey: 'flat_potency_aura' },
        { itemKey: 'hermes_winged_needle', nextReadyAt: 1_200 },
      ]),
      seat([]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 0 }, TEST_CATALOG)).toEqual({})
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 2 }, TEST_CATALOG, undefined, BOW_AT_SEAT_0)).toEqual({
      cooldownMs: 958.8,
      potency: 8,
    })
  })

  it('applies Soul Speed and Strength after Passive stacking', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'flat_potency_aura' },
        { itemKey: 'hermes_winged_needle', nextReadyAt: 1_200 },
      ]),
      seat([]),
    )
    const souls: [import('./types').SoulStats, import('./types').SoulStats] = [
      { strength: 4, speed: 10, vitality: 1 },
      { strength: 0, speed: 0, vitality: 0 },
    ]
    expect(
      resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 1 }, TEST_CATALOG, souls),
    ).toEqual({
      cooldownMs: 960,
      potency: 9.92,
    })
  })

  it('leaves damage potency unchanged when Soul Strength is 0', () => {
    const seats = dualSeats(
      seat([{ itemKey: 'hermes_winged_needle', nextReadyAt: 1_200 }]),
      seat([]),
    )
    const souls: [import('./types').SoulStats, import('./types').SoulStats] = [
      { strength: 0, speed: 0, vitality: 0 },
      { strength: 0, speed: 0, vitality: 0 },
    ]
    expect(
      resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 0 }, ITEM_CATALOG, souls),
    ).toEqual({
      cooldownMs: 1_200,
      potency: 5,
    })
  })

  it('multiplies damage potency by 1.3 when Soul Strength is 5', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'flat_potency_aura' },
        { itemKey: 'hermes_winged_needle', nextReadyAt: 1_200 },
      ]),
      seat([]),
    )
    const souls: [import('./types').SoulStats, import('./types').SoulStats] = [
      { strength: 5, speed: 0, vitality: 0 },
      { strength: 0, speed: 0, vitality: 0 },
    ]
    expect(
      resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 1 }, TEST_CATALOG, souls),
    ).toEqual({
      cooldownMs: 1_200,
      potency: 10.4,
    })
  })

  it('multiplies damage potency by 1.6 when Soul Strength is 10', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'flat_potency_aura' },
        { itemKey: 'hermes_winged_needle', nextReadyAt: 1_200 },
      ]),
      seat([]),
    )
    const souls: [import('./types').SoulStats, import('./types').SoulStats] = [
      { strength: 10, speed: 0, vitality: 0 },
      { strength: 0, speed: 0, vitality: 0 },
    ]
    expect(
      resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 1 }, TEST_CATALOG, souls),
    ).toEqual({
      cooldownMs: 1_200,
      potency: 12.8,
    })
  })

  it('does not multiply Soul Strength into heal or shield potency', () => {
    const seats = dualSeats(
      seat([{ itemKey: 'hygieia_soft_bandage', nextReadyAt: 1_000 }]),
      seat([]),
    )
    const souls: [import('./types').SoulStats, import('./types').SoulStats] = [
      { strength: 6, speed: 0, vitality: 0 },
      { strength: 0, speed: 0, vitality: 0 },
    ]
    expect(
      resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 0 }, ITEM_CATALOG, souls),
    ).toEqual({
      cooldownMs: 2_000,
      potency: 7,
    })
  })

  it('applies Weapon nudges after Soul on the shared effective-stat path', () => {
    const seats = dualSeats(
      seat([{ itemKey: 'hermes_winged_needle', nextReadyAt: 1_200 }]),
      seat([]),
    )
    const souls: [import('./types').SoulStats, import('./types').SoulStats] = [
      { strength: 4, speed: 0, vitality: 0 },
      { strength: 0, speed: 0, vitality: 0 },
    ]
    const weaponKeys: [string, string] = ['steel_longsword', 'hunters_bow']
    const result = resolveSlotEffectiveStats(
      seats,
      { seat: 0, slotIndex: 0 },
      ITEM_CATALOG,
      souls,
      weaponKeys,
    )
    expect(result.cooldownMs).toBe(1_200)
    expect(result.potency).toBeCloseTo(6.51)
  })

  it('gates catalog Passive weaponType on the carrier equipped Weapon', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'hermes_fleet_foot' },
        { itemKey: 'hermes_winged_needle', nextReadyAt: 1_500 },
      ]),
      seat([]),
    )
    const swordWeaponKeys: [string, string] = ['knight_blade', 'war_axe']
    expect(
      resolveSlotEffectiveStats(
        seats,
        { seat: 0, slotIndex: 1 },
        ITEM_CATALOG,
        undefined,
        swordWeaponKeys,
      ),
    ).toEqual({
      cooldownMs: 1_026,
      potency: 5,
    })

    const axeWeaponKeys: [string, string] = ['war_axe', 'knight_blade']
    expect(
      resolveSlotEffectiveStats(
        seats,
        { seat: 0, slotIndex: 1 },
        ITEM_CATALOG,
        undefined,
        axeWeaponKeys,
      ),
    ).toEqual({
      cooldownMs: 1_248,
      potency: 5.5,
    })
  })

  it('gates Passive weaponType on the carrier equipped Weapon', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'sword_only_haste' },
        { itemKey: 'hermes_winged_needle', nextReadyAt: 1_200 },
      ]),
      seat([]),
    )
    const swordWeaponKeys: [string, string] = ['knight_blade', 'war_axe']
    expect(
      resolveSlotEffectiveStats(
        seats,
        { seat: 0, slotIndex: 1 },
        TEST_CATALOG,
        undefined,
        swordWeaponKeys,
      ),
    ).toEqual({
      cooldownMs: 1_083,
      potency: 5,
    })

    const axeWeaponKeys: [string, string] = ['war_axe', 'knight_blade']
    expect(
      resolveSlotEffectiveStats(
        seats,
        { seat: 0, slotIndex: 1 },
        TEST_CATALOG,
        undefined,
        axeWeaponKeys,
      ),
    ).toEqual({
      cooldownMs: 1_248,
      potency: 5.5,
    })
  })
})

describe('rewriteNextReadyAtForEffectiveCooldown', () => {
  it('preserves charge progress fraction when effective cooldown changes', () => {
    const now = 1_000
    const priorEffectiveCooldownMs = 2_000
    const nextReadyAt = now + 1_000
    expect(
      rewriteNextReadyAtForEffectiveCooldown({
        now,
        priorEffectiveCooldownMs,
        newEffectiveCooldownMs: 1_600,
        nextReadyAt,
      }),
    ).toBe(now + 800)
  })

  it('treats overdue slots as fully charged when rescaling', () => {
    const now = 5_000
    expect(
      rewriteNextReadyAtForEffectiveCooldown({
        now,
        priorEffectiveCooldownMs: 2_000,
        newEffectiveCooldownMs: 1_000,
        nextReadyAt: 4_000,
      }),
    ).toBe(now)
  })

  it('treats a freshly scheduled slot as zero progress when rescaling', () => {
    const now = 1_000
    expect(
      rewriteNextReadyAtForEffectiveCooldown({
        now,
        priorEffectiveCooldownMs: 2_000,
        newEffectiveCooldownMs: 1_600,
        nextReadyAt: now + 2_000,
      }),
    ).toBe(now + 1_600)
  })
})
