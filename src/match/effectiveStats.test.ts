import { describe, expect, it } from 'vitest'

import { ITEM_CATALOG } from './itemCatalog'
import {
  MIN_EFFECTIVE_COOLDOWN_MS,
  MIN_EFFECTIVE_POTENCY,
  resolveSlotEffectiveStats,
  rewriteNextReadyAtForEffectiveCooldown,
} from './effectiveStats'
import type { ItemCatalog, MatchSeatState, PassiveDefinition } from './types'

function seat(
  slots: MatchSeatState['slots'],
  life = 100,
  shield = 0,
): MatchSeatState {
  return { life, shield, slots }
}

function dualSeats(
  a: MatchSeatState,
  b: MatchSeatState,
): [MatchSeatState, MatchSeatState] {
  return [a, b]
}

const TEST_CATALOG = {
  ...ITEM_CATALOG,
  enemy_haste: {
    key: 'enemy_haste',
    name: 'Enemy Haste',
    passive: {
      seatTarget: 'enemy',
      filter: 'damage',
      changes: [{ stat: 'cooldown', mode: 'percent', value: -0.5 }],
    } satisfies PassiveDefinition,
  },
  global_slow: {
    key: 'global_slow',
    name: 'Global Slow',
    passive: {
      seatTarget: 'both',
      filter: 'all',
      changes: [{ stat: 'cooldown', mode: 'percent', value: 0.1 }],
    } satisfies PassiveDefinition,
  },
  flat_potency_aura: {
    key: 'flat_potency_aura',
    name: 'Flat Potency Aura',
    passive: {
      seatTarget: 'own',
      filter: 'all',
      changes: [{ stat: 'potency', mode: 'flat', value: 3 }],
    } satisfies PassiveDefinition,
  },
  percent_potency_nerf: {
    key: 'percent_potency_nerf',
    name: 'Percent Potency Nerf',
    passive: {
      seatTarget: 'own',
      filter: 'damage',
      changes: [{ stat: 'potency', mode: 'percent', value: -0.5 }],
    } satisfies PassiveDefinition,
  },
  hybrid_penalty: {
    key: 'hybrid_penalty',
    name: 'Hybrid Penalty',
    effect: 'damage',
    potency: 10,
    cooldownMs: 1_000,
    passive: {
      seatTarget: 'own',
      filter: 'damage',
      changes: [{ stat: 'potency', mode: 'flat', value: -20 }],
    } satisfies PassiveDefinition,
  },
} as const satisfies ItemCatalog

describe('resolveSlotEffectiveStats', () => {
  it('returns base stats when no passives are present', () => {
    const seats = dualSeats(
      seat([{ itemKey: 'spark', nextReadyAt: 2_000 }]),
      seat([{ itemKey: 'ward', nextReadyAt: 3_000 }]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 0 }, ITEM_CATALOG)).toEqual({
      cooldownMs: 2_000,
      potency: 8,
    })
  })

  it('applies own-seat damage cooldown percent from haste_charm', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'haste_charm' },
        { itemKey: 'spark', nextReadyAt: 2_000 },
      ]),
      seat([]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 1 }, ITEM_CATALOG)).toEqual({
      cooldownMs: 1_600,
      potency: 8,
    })
  })

  it('does not shorten non-damage cooldowns for haste_charm', () => {
    const seats = dualSeats(
      seat([{ itemKey: 'haste_charm' }, { itemKey: 'salve', nextReadyAt: 2_500 }]),
      seat([]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 1 }, ITEM_CATALOG)).toEqual({
      cooldownMs: 2_500,
      potency: 6,
    })
  })

  it('applies own-seat heal flat potency from vital_spark including self', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'vital_spark', nextReadyAt: 3_000 },
        { itemKey: 'salve', nextReadyAt: 2_500 },
      ]),
      seat([]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 0 }, ITEM_CATALOG)).toEqual({
      cooldownMs: 3_000,
      potency: 7,
    })
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 1 }, ITEM_CATALOG)).toEqual({
      cooldownMs: 2_500,
      potency: 8,
    })
  })

  it('applies enemy seat target passives to the opposing seat', () => {
    const seats = dualSeats(
      seat([{ itemKey: 'spark', nextReadyAt: 2_000 }]),
      seat([{ itemKey: 'enemy_haste' }]),
    )
    expect(
      resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 0 }, TEST_CATALOG),
    ).toEqual({
      cooldownMs: 1_000,
      potency: 8,
    })
    expect(
      resolveSlotEffectiveStats(seats, { seat: 1, slotIndex: 0 }, TEST_CATALOG),
    ).toEqual({})
  })

  it('applies both-seat target passives to either seat', () => {
    const seats = dualSeats(
      seat([{ itemKey: 'global_slow' }, { itemKey: 'spark', nextReadyAt: 2_000 }]),
      seat([{ itemKey: 'salve', nextReadyAt: 2_500 }]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 1 }, TEST_CATALOG)).toEqual({
      cooldownMs: 2_200,
      potency: 8,
    })
    expect(resolveSlotEffectiveStats(seats, { seat: 1, slotIndex: 0 }, TEST_CATALOG)).toEqual({
      cooldownMs: 2_750,
      potency: 6,
    })
  })

  it('stacks percent modifiers before flat modifiers', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'haste_charm' },
        { itemKey: 'flat_potency_aura' },
        { itemKey: 'spark', nextReadyAt: 2_000 },
      ]),
      seat([]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 2 }, TEST_CATALOG)).toEqual({
      cooldownMs: 1_600,
      potency: 11,
    })
  })

  it('stacks duplicate passive carriers independently', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'haste_charm' },
        { itemKey: 'haste_charm' },
        { itemKey: 'spark', nextReadyAt: 2_000 },
      ]),
      seat([]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 2 }, ITEM_CATALOG)).toEqual({
      cooldownMs: 1_200,
      potency: 8,
    })
  })

  it('floors effective cooldown at 500ms', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'haste_charm' },
        { itemKey: 'haste_charm' },
        { itemKey: 'haste_charm' },
        { itemKey: 'haste_charm' },
        { itemKey: 'spark', nextReadyAt: 800 },
      ]),
      seat([]),
    )
    expect(
      resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 4 }, ITEM_CATALOG),
    ).toEqual({
      cooldownMs: MIN_EFFECTIVE_COOLDOWN_MS,
      potency: 8,
    })
  })

  it('floors effective potency at 0', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'percent_potency_nerf' },
        { itemKey: 'hybrid_penalty' },
        { itemKey: 'spark', nextReadyAt: 2_000 },
      ]),
      seat([]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 2 }, TEST_CATALOG)).toEqual({
      cooldownMs: 2_000,
      potency: MIN_EFFECTIVE_POTENCY,
    })
  })

  it('returns no stats for passive-only recipients', () => {
    const seats = dualSeats(
      seat([{ itemKey: 'haste_charm' }, { itemKey: 'spark', nextReadyAt: 2_000 }]),
      seat([]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 0 }, ITEM_CATALOG)).toEqual(
      {},
    )
  })

  it('lets passive-only carriers contribute without receiving rewrites', () => {
    const seats = dualSeats(
      seat([
        { itemKey: 'haste_charm' },
        { itemKey: 'flat_potency_aura' },
        { itemKey: 'spark', nextReadyAt: 2_000 },
      ]),
      seat([]),
    )
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 0 }, TEST_CATALOG)).toEqual({})
    expect(resolveSlotEffectiveStats(seats, { seat: 0, slotIndex: 2 }, TEST_CATALOG)).toEqual({
      cooldownMs: 1_600,
      potency: 11,
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
