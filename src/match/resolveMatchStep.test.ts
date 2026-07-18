import { cloneDeep, map } from 'lodash'
import { describe, expect, it } from 'vitest'

import { ITEM_CATALOG } from './itemCatalog'
import {
  DEFAULT_MATCH_TIME_CAP_MS,
  MATCH_LIFE_CAP,
  resolveMatchStep,
} from './resolveMatchStep'
import type { MatchSeatState, SeatIndex } from './types'

function seat(
  life: number,
  shield: number,
  slots: { itemKey: string; nextReadyAt: number }[],
): MatchSeatState {
  return { life, shield, slots }
}

function dualSeats(
  a: MatchSeatState,
  b: MatchSeatState,
): [MatchSeatState, MatchSeatState] {
  return [a, b]
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
})
