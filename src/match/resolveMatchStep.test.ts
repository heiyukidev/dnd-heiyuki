import { cloneDeep, map } from 'lodash'
import { describe, expect, it } from 'vitest'

import { MIN_EFFECTIVE_COOLDOWN_MS } from './effectiveStats'
import { ITEM_CATALOG } from './itemCatalog'
import {
  DEFAULT_MATCH_TIME_CAP_MS,
  earliestWakeAt,
  MATCH_LIFE_CAP,
  reEvalFireCapableSlotSchedules,
  resolveMatchStep,
  seedFireCapableSlotSchedulesAtMatchStart,
} from './resolveMatchStep'
import type { LoadoutSlot, MatchSeatState, SeatIndex } from './types'

function seat(
  life: number,
  shield: number,
  slots: LoadoutSlot[],
): MatchSeatState {
  return { life, shield, slots }
}

function dualSeats(
  a: MatchSeatState,
  b: MatchSeatState,
): [MatchSeatState, MatchSeatState] {
  return [a, b]
}

function seededAtMatchStart(
  matchStartedAt: number,
  a: MatchSeatState,
  b: MatchSeatState,
): [MatchSeatState, MatchSeatState] {
  const seats = dualSeats(a, b)
  seedFireCapableSlotSchedulesAtMatchStart(seats, matchStartedAt, ITEM_CATALOG)
  return seats
}

describe('resolveMatchStep', () => {
  it('resolves a single damage fire and refreshes nextReadyAt', () => {
    const matchStartedAt = 1_000
    const t = matchStartedAt + 2_000
    const seats = dualSeats(
      seat(100, 0, [{ itemKey: 'spark', nextReadyAt: t }]),
      seat(100, 0, [{ itemKey: 'ward', nextReadyAt: t + 10_000 }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(result.fires).toEqual([
      { seat: 0, slotIndex: 0, itemKey: 'spark', effect: 'damage', potency: 8 },
    ])
    expect(result.seats[1].life).toBe(92)
    expect(result.seats[0].slots[0].nextReadyAt).toBe(t + 2_000)
    expect(result.animationHints).toEqual([{ kind: 'damage', seat: 0, slotIndex: 0 }])
    expect(result.outcome).toEqual({ type: 'continue' })
    expect(result.nextWakeAt).toBe(t + 2_000)
  })

  it('orders same-timestamp fires by seat resolve order then slot index', () => {
    const matchStartedAt = 0
    const t = 1_000
    const seats = dualSeats(
      seat(100, 0, [
        { itemKey: 'spark', nextReadyAt: t },
        { itemKey: 'cannon', nextReadyAt: t },
      ]),
      seat(100, 0, [{ itemKey: 'salve', nextReadyAt: t }]),
    )
    const hostFirst = resolveMatchStep({
      seats: cloneDeep(seats),
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(map(hostFirst.fires, (f) => `${f.seat}:${f.slotIndex}:${f.itemKey}`)).toEqual([
      '0:0:spark',
      '0:1:cannon',
      '1:0:salve',
    ])

    const guestFirst = resolveMatchStep({
      seats: cloneDeep(seats),
      t,
      seatResolveOrder: [1, 0],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(map(guestFirst.fires, (f) => `${f.seat}:${f.slotIndex}:${f.itemKey}`)).toEqual([
      '1:0:salve',
      '0:0:spark',
      '0:1:cannon',
    ])
  })

  it('applies damage through shield before life', () => {
    const t = 5_000
    const seats = dualSeats(
      seat(100, 0, [{ itemKey: 'cannon', nextReadyAt: t }]),
      seat(100, 10, [{ itemKey: 'ward', nextReadyAt: t + 99_000 }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt: 0,
    })
    expect(result.seats[1].shield).toBe(0)
    expect(result.seats[1].life).toBe(92)
  })

  it('caps heal at 100 life', () => {
    const t = 2_500
    const seats = dualSeats(
      seat(97, 0, [{ itemKey: 'salve', nextReadyAt: t }]),
      seat(100, 0, [{ itemKey: 'spark', nextReadyAt: t + 99_000 }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt: 0,
    })
    expect(result.seats[0].life).toBe(MATCH_LIFE_CAP)
  })

  it('stacks shield with no cap', () => {
    const t = 3_000
    const seats = dualSeats(
      seat(100, 5, [{ itemKey: 'ward', nextReadyAt: t }]),
      seat(100, 0, [{ itemKey: 'spark', nextReadyAt: t + 99_000 }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt: 0,
    })
    expect(result.seats[0].shield).toBe(13)
  })

  it('declares winner when one seat reaches 0 life', () => {
    const t = 2_000
    const seats = dualSeats(
      seat(100, 0, [{ itemKey: 'cannon', nextReadyAt: t }]),
      seat(10, 0, [{ itemKey: 'ward', nextReadyAt: t + 99_000 }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt: 0,
    })
    expect(result.seats[1].life).toBe(0)
    expect(result.outcome).toEqual({ type: 'winner', seat: 0 })
    expect(result.nextWakeAt).toBeUndefined()
  })

  it('draws on mutual kill at the same instant', () => {
    const t = 4_500
    const seats = dualSeats(
      seat(10, 0, [{ itemKey: 'cannon', nextReadyAt: t }]),
      seat(10, 0, [{ itemKey: 'cannon', nextReadyAt: t }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1] as [SeatIndex, SeatIndex],
      catalog: ITEM_CATALOG,
      matchStartedAt: 0,
    })
    expect(result.seats[0].life).toBe(0)
    expect(result.seats[1].life).toBe(0)
    expect(result.outcome).toEqual({ type: 'draw' })
  })

  it('does not resurrect via same-tick heal after lethal damage', () => {
    const t = 3_000
    const seats = dualSeats(
      seat(100, 0, [{ itemKey: 'cannon', nextReadyAt: t }]),
      seat(10, 0, [{ itemKey: 'salve', nextReadyAt: t }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt: 0,
    })
    expect(result.fires).toHaveLength(2)
    expect(result.seats[1].life).toBe(0)
    expect(result.outcome).toEqual({ type: 'winner', seat: 0 })
  })

  it('still applies remaining same-tick damage after lethal for mutual draw', () => {
    const t = 4_000
    const seats = dualSeats(
      seat(10, 0, [
        { itemKey: 'cannon', nextReadyAt: t },
        { itemKey: 'salve', nextReadyAt: t },
      ]),
      seat(10, 0, [{ itemKey: 'cannon', nextReadyAt: t }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt: 0,
    })
    expect(result.seats[0].life).toBe(0)
    expect(result.seats[1].life).toBe(0)
    expect(result.outcome).toEqual({ type: 'draw' })
  })

  it('advances unknown itemKey slots so wakes do not tight-loop', () => {
    const matchStartedAt = 0
    const t = 1_000
    const seats = dualSeats(
      seat(100, 0, [{ itemKey: 'missing-item', nextReadyAt: t }]),
      seat(100, 0, [{ itemKey: 'ward', nextReadyAt: 7_000 }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(result.fires).toEqual([])
    expect(result.seats[0].slots[0].nextReadyAt).toBe(DEFAULT_MATCH_TIME_CAP_MS)
    expect(result.outcome).toEqual({ type: 'continue' })
    expect(result.nextWakeAt).toBe(7_000)
  })


  it('resolves time-cap win by higher life without firing', () => {
    const matchStartedAt = 0
    const t = DEFAULT_MATCH_TIME_CAP_MS
    const seats = dualSeats(
      seat(80, 0, [{ itemKey: 'spark', nextReadyAt: t }]),
      seat(60, 0, [{ itemKey: 'spark', nextReadyAt: t }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(result.fires).toEqual([])
    expect(result.outcome).toEqual({ type: 'winner', seat: 0 })
    expect(result.seats[0].life).toBe(80)
    expect(result.seats[1].life).toBe(60)
  })

  it('resolves time-cap draw when life totals are equal', () => {
    const matchStartedAt = 100
    const t = matchStartedAt + DEFAULT_MATCH_TIME_CAP_MS
    const seats = dualSeats(
      seat(55, 20, [{ itemKey: 'mend', nextReadyAt: t }]),
      seat(55, 0, [{ itemKey: 'bulwark', nextReadyAt: t }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [1, 0],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(result.outcome).toEqual({ type: 'draw' })
    expect(result.fires).toEqual([])
  })

  it('selects next wake as the soonest refreshed ready or time cap', () => {
    const matchStartedAt = 0
    const t = 2_000
    const seats = dualSeats(
      seat(100, 0, [
        { itemKey: 'spark', nextReadyAt: t },
        { itemKey: 'cannon', nextReadyAt: 10_000 },
      ]),
      seat(100, 0, [{ itemKey: 'ward', nextReadyAt: 7_000 }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(result.seats[0].slots[0].nextReadyAt).toBe(t + 2_000)
    expect(result.nextWakeAt).toBe(t + 2_000)
  })

  it('selects time cap as next wake when it is sooner than refreshed ready times', () => {
    const matchStartedAt = 0
    const t = DEFAULT_MATCH_TIME_CAP_MS - 500
    const seats = dualSeats(
      seat(100, 0, [{ itemKey: 'spark', nextReadyAt: t }]),
      seat(100, 0, [{ itemKey: 'ward', nextReadyAt: t + 99_000 }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(result.outcome).toEqual({ type: 'continue' })
    expect(result.nextWakeAt).toBe(DEFAULT_MATCH_TIME_CAP_MS)
  })

  it('matches base catalog timing and potency when no passives are present', () => {
    const matchStartedAt = 0
    const seats = seededAtMatchStart(
      matchStartedAt,
      seat(100, 0, [{ itemKey: 'spark' }, { itemKey: 'salve' }, { itemKey: 'ward' }]),
      seat(100, 0, [{ itemKey: 'cannon' }, { itemKey: 'mend' }, { itemKey: 'bulwark' }]),
    )
    expect(seats[0].slots[0].nextReadyAt).toBe(matchStartedAt + 2_000)
    expect(seats[0].slots[1].nextReadyAt).toBe(matchStartedAt + 2_500)
    expect(seats[0].slots[2].nextReadyAt).toBe(matchStartedAt + 3_000)
    expect(earliestWakeAt(seats, matchStartedAt)).toBe(matchStartedAt + 2_000)

    const t = matchStartedAt + 2_000
    const result = resolveMatchStep({
      seats: cloneDeep(seats),
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(result.fires).toEqual([
      { seat: 0, slotIndex: 0, itemKey: 'spark', effect: 'damage', potency: 8 },
    ])
    expect(result.seats[0].slots[0].nextReadyAt).toBe(t + 2_000)
    expect(result.seats[0].slots[0].lastChargeCooldownMs).toBe(2_000)
    expect(result.nextWakeAt).toBe(matchStartedAt + 2_500)
  })

  it('seeds the first damage charge with haste_charm effective cooldown at match start', () => {
    const matchStartedAt = 0
    const seats = seededAtMatchStart(
      matchStartedAt,
      seat(100, 0, [{ itemKey: 'haste_charm' }, { itemKey: 'spark' }]),
      seat(100, 0, [{ itemKey: 'ward' }]),
    )
    expect(seats[0].slots[1].nextReadyAt).toBe(matchStartedAt + 1_600)
    expect(seats[0].slots[1].lastChargeCooldownMs).toBe(1_600)
    expect(earliestWakeAt(seats, matchStartedAt)).toBe(matchStartedAt + 1_600)

    const t = matchStartedAt + 1_600
    const result = resolveMatchStep({
      seats: cloneDeep(seats),
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(result.fires).toEqual([
      { seat: 0, slotIndex: 1, itemKey: 'spark', effect: 'damage', potency: 8 },
    ])
    expect(result.seats[0].slots[1].nextReadyAt).toBe(t + 1_600)
    expect(result.nextWakeAt).toBe(matchStartedAt + 3_000)
  })

  it('shortens own-seat damage recharge when haste_charm is present', () => {
    const matchStartedAt = 0
    const t = 2_000
    const seats = dualSeats(
      seat(100, 0, [
        { itemKey: 'haste_charm' },
        { itemKey: 'spark', nextReadyAt: t, lastChargeCooldownMs: 2_000 },
      ]),
      seat(100, 0, [{ itemKey: 'ward', nextReadyAt: t + 99_000 }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(result.fires).toEqual([
      { seat: 0, slotIndex: 1, itemKey: 'spark', effect: 'damage', potency: 8 },
    ])
    expect(result.seats[0].slots[1].nextReadyAt).toBe(t + 1_600)
    expect(result.seats[0].slots[1].lastChargeCooldownMs).toBe(1_600)
    expect(result.nextWakeAt).toBe(t + 1_600)
  })

  it('buffs own-seat heal potency with vital_spark including self', () => {
    const matchStartedAt = 0
    const t = 3_000
    const seats = dualSeats(
      seat(90, 0, [
        { itemKey: 'vital_spark', nextReadyAt: t, lastChargeCooldownMs: 3_000 },
        { itemKey: 'salve', nextReadyAt: t + 99_000 },
      ]),
      seat(100, 0, [{ itemKey: 'spark', nextReadyAt: t + 99_000 }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(result.fires).toEqual([
      { seat: 0, slotIndex: 0, itemKey: 'vital_spark', effect: 'heal', potency: 7 },
    ])
    expect(result.seats[0].life).toBe(97)
    expect(result.seats[0].slots[0].nextReadyAt).toBe(t + 3_000)
  })

  it('applies vital_spark potency buff to other own-seat heal items', () => {
    const matchStartedAt = 0
    const t = 2_500
    const seats = dualSeats(
      seat(90, 0, [
        { itemKey: 'vital_spark', nextReadyAt: t + 99_000 },
        { itemKey: 'salve', nextReadyAt: t, lastChargeCooldownMs: 2_500 },
      ]),
      seat(100, 0, [{ itemKey: 'spark', nextReadyAt: t + 99_000 }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(result.fires).toEqual([
      { seat: 0, slotIndex: 1, itemKey: 'salve', effect: 'heal', potency: 8 },
    ])
    expect(result.seats[0].life).toBe(98)
  })

  it('never fires passive-only slots or emits animation hints for them', () => {
    const matchStartedAt = 0
    const t = 5_000
    const seats = dualSeats(
      seat(100, 0, [
        { itemKey: 'haste_charm' },
        { itemKey: 'haste_charm' },
        { itemKey: 'spark', nextReadyAt: t, lastChargeCooldownMs: 2_000 },
      ]),
      seat(100, 0, [{ itemKey: 'haste_charm' }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(result.fires).toEqual([
      { seat: 0, slotIndex: 2, itemKey: 'spark', effect: 'damage', potency: 8 },
    ])
    expect(result.animationHints).toEqual([{ kind: 'damage', seat: 0, slotIndex: 2 }])
    expect(result.seats[0].slots[0].nextReadyAt).toBeUndefined()
    expect(result.seats[1].slots[0].nextReadyAt).toBeUndefined()
  })

  it('stacks duplicate haste charms on damage cooldown percent', () => {
    const matchStartedAt = 0
    const t = 2_000
    const seats = dualSeats(
      seat(100, 0, [
        { itemKey: 'haste_charm' },
        { itemKey: 'haste_charm' },
        { itemKey: 'haste_charm' },
        { itemKey: 'spark', nextReadyAt: t, lastChargeCooldownMs: 2_000 },
      ]),
      seat(100, 0, [{ itemKey: 'ward', nextReadyAt: t + 99_000 }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(result.seats[0].slots[3].nextReadyAt).toBe(t + 800)
    expect(result.seats[0].slots[3].lastChargeCooldownMs).toBeCloseTo(800)
  })

  it('floors stacked haste at 500ms effective cooldown', () => {
    const matchStartedAt = 0
    const t = 2_000
    const seats = dualSeats(
      seat(100, 0, [
        { itemKey: 'haste_charm' },
        { itemKey: 'haste_charm' },
        { itemKey: 'haste_charm' },
        { itemKey: 'haste_charm' },
        { itemKey: 'haste_charm' },
        { itemKey: 'spark', nextReadyAt: t, lastChargeCooldownMs: 2_000 },
      ]),
      seat(100, 0, [{ itemKey: 'ward', nextReadyAt: t + 99_000 }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(result.seats[0].slots[5].lastChargeCooldownMs).toBe(MIN_EFFECTIVE_COOLDOWN_MS)
    expect(result.seats[0].slots[5].nextReadyAt).toBe(t + MIN_EFFECTIVE_COOLDOWN_MS)
  })

  it('rewrites mid-charge nextReadyAt when effective cooldown changes via re-eval', () => {
    const matchStartedAt = 0
    const tFire = 1_000
    const afterFire = resolveMatchStep({
      seats: dualSeats(
        seat(100, 0, [{ itemKey: 'spark', nextReadyAt: tFire, lastChargeCooldownMs: 2_000 }]),
        seat(100, 0, [{ itemKey: 'ward', nextReadyAt: tFire + 99_000 }]),
      ),
      t: tFire,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(afterFire.seats[0].slots[0].nextReadyAt).toBe(3_000)

    const tReEval = 1_500
    const seatsWithCharm = dualSeats(
      seat(100, 0, [
        { itemKey: 'haste_charm' },
        {
          itemKey: 'spark',
          nextReadyAt: afterFire.seats[0].slots[0].nextReadyAt,
          lastChargeCooldownMs: afterFire.seats[0].slots[0].lastChargeCooldownMs,
        },
      ]),
      seat(100, 0, [{ itemKey: 'ward', nextReadyAt: tReEval + 99_000 }]),
    )
    const reEvalResult = resolveMatchStep({
      seats: seatsWithCharm,
      t: tReEval,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(reEvalResult.fires).toEqual([])
    expect(reEvalResult.seats[0].slots[1].nextReadyAt).toBe(2_700)
    expect(reEvalResult.seats[0].slots[1].lastChargeCooldownMs).toBe(1_600)
  })

  it('exposes reEvalFireCapableSlotSchedules for explicit prior-effective overrides', () => {
    const now = 1_000
    const seats = dualSeats(
      seat(100, 0, [{ itemKey: 'spark', nextReadyAt: 2_000, lastChargeCooldownMs: 2_000 }]),
      seat(100, 0, []),
    )
    reEvalFireCapableSlotSchedules(seats, now, ITEM_CATALOG, [
      [{ cooldownMs: 2_000, potency: 8 }],
      [],
    ])
    expect(seats[0].slots[0].nextReadyAt).toBe(2_000)

    const seatsWithCharm = dualSeats(
      seat(100, 0, [
        { itemKey: 'haste_charm' },
        { itemKey: 'spark', nextReadyAt: 2_000, lastChargeCooldownMs: 2_000 },
      ]),
      seat(100, 0, []),
    )
    reEvalFireCapableSlotSchedules(seatsWithCharm, now, ITEM_CATALOG, [
      [{}, { cooldownMs: 2_000, potency: 8 }],
      [],
    ])
    expect(seatsWithCharm[0].slots[1].nextReadyAt).toBe(1_800)
    expect(seatsWithCharm[0].slots[1].lastChargeCooldownMs).toBe(1_600)
  })

  it('ignores passive-only slots when scheduling next wake', () => {
    const matchStartedAt = 0
    const t = 1_000
    const seats = dualSeats(
      seat(100, 0, [
        { itemKey: 'haste_charm' },
        { itemKey: 'haste_charm' },
        { itemKey: 'haste_charm' },
      ]),
      seat(100, 0, [{ itemKey: 'haste_charm' }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(result.fires).toEqual([])
    expect(result.nextWakeAt).toBe(DEFAULT_MATCH_TIME_CAP_MS)
  })
})
