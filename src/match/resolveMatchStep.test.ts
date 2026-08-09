import { cloneDeep, map } from 'lodash'
import { describe, expect, it } from 'vitest'

import { MIN_EFFECTIVE_COOLDOWN_MS } from './effectiveStats'
import { startingLifeFromVitality } from './soul'
import { ITEM_CATALOG } from './itemCatalog'
import {
  DEFAULT_MATCH_TIME_CAP_MS,
  earliestWakeAt,
  MATCH_LIFE_CAP,
  reEvalFireCapableSlotSchedules,
  resolveMatchStep,
  seedFireCapableSlotSchedulesAtMatchStart,
} from './resolveMatchStep'
import type { LoadoutSlot, MatchSeatState, SeatIndex, SoulStats } from './types'

function seat(life: number, shield: number, slots: LoadoutSlot[]): MatchSeatState {
  return { life, shield, slots }
}

function dualSeats(a: MatchSeatState, b: MatchSeatState): [MatchSeatState, MatchSeatState] {
  return [a, b]
}

const BOW_AT_SEAT_0: [string, string] = ['hunters_bow', 'steel_longsword']

function seededAtMatchStart(
  matchStartedAt: number,
  a: MatchSeatState,
  b: MatchSeatState,
  weaponKeys?: [string, string],
): [MatchSeatState, MatchSeatState] {
  const seats = dualSeats(a, b)
  seedFireCapableSlotSchedulesAtMatchStart(seats, matchStartedAt, ITEM_CATALOG, undefined, weaponKeys)
  return seats
}

describe('resolveMatchStep', () => {
  it('resolves a single damage fire and refreshes nextReadyAt', () => {
    const matchStartedAt = 1_000
    const t = matchStartedAt + 2_000
    const seats = dualSeats(
      seat(100, 0, [{ itemKey: 'hermes_winged_needle', nextReadyAt: t }]),
      seat(100, 0, [{ itemKey: 'athena_aegis_chip', nextReadyAt: t + 10_000 }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(result.fires).toEqual([
      { seat: 0, slotIndex: 0, itemKey: 'hermes_winged_needle', effect: 'damage', potency: 5 },
    ])
    expect(result.seats[1].life).toBe(95)
    expect(result.seats[0].slots[0].nextReadyAt).toBe(t + 1_200)
    expect(result.animationHints).toEqual([{ kind: 'damage', seat: 0, slotIndex: 0 }])
    expect(result.outcome).toEqual({ type: 'continue' })
    expect(result.nextWakeAt).toBe(t + 1_200)
  })

  it('orders same-timestamp fires by seat resolve order then slot index', () => {
    const matchStartedAt = 0
    const t = 1_000
    const seats = dualSeats(
      seat(100, 0, [
        { itemKey: 'hermes_winged_needle', nextReadyAt: t },
        { itemKey: 'dynamite_fuse_bomb', nextReadyAt: t },
      ]),
      seat(100, 0, [{ itemKey: 'hygieia_soft_bandage', nextReadyAt: t }]),
    )
    const hostFirst = resolveMatchStep({
      seats: cloneDeep(seats),
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(map(hostFirst.fires, (f) => `${f.seat}:${f.slotIndex}:${f.itemKey}`)).toEqual([
      '0:0:hermes_winged_needle',
      '0:1:dynamite_fuse_bomb',
      '1:0:hygieia_soft_bandage',
    ])

    const guestFirst = resolveMatchStep({
      seats: cloneDeep(seats),
      t,
      seatResolveOrder: [1, 0],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(map(guestFirst.fires, (f) => `${f.seat}:${f.slotIndex}:${f.itemKey}`)).toEqual([
      '1:0:hygieia_soft_bandage',
      '0:0:hermes_winged_needle',
      '0:1:dynamite_fuse_bomb',
    ])
  })

  it('applies damage through shield before life', () => {
    const t = 5_000
    const seats = dualSeats(
      seat(100, 0, [{ itemKey: 'dynamite_fuse_bomb', nextReadyAt: t }]),
      seat(100, 10, [{ itemKey: 'athena_aegis_chip', nextReadyAt: t + 99_000 }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt: 0,
    })
    expect(result.seats[1].shield).toBe(0)
    expect(result.seats[1].life).toBe(88)
  })

  it('caps heal at match life cap', () => {
    const t = 2_500
    const seats = dualSeats(
      seat(MATCH_LIFE_CAP - 3, 0, [{ itemKey: 'hygieia_soft_bandage', nextReadyAt: t }]),
      seat(100, 0, [{ itemKey: 'hermes_winged_needle', nextReadyAt: t + 99_000 }]),
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
      seat(100, 5, [{ itemKey: 'athena_aegis_chip', nextReadyAt: t }]),
      seat(100, 0, [{ itemKey: 'hermes_winged_needle', nextReadyAt: t + 99_000 }]),
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
      seat(100, 0, [{ itemKey: 'dynamite_fuse_bomb', nextReadyAt: t }]),
      seat(10, 0, [{ itemKey: 'athena_aegis_chip', nextReadyAt: t + 99_000 }]),
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
      seat(10, 0, [{ itemKey: 'dynamite_fuse_bomb', nextReadyAt: t }]),
      seat(10, 0, [{ itemKey: 'dynamite_fuse_bomb', nextReadyAt: t }]),
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
      seat(100, 0, [{ itemKey: 'dynamite_fuse_bomb', nextReadyAt: t }]),
      seat(10, 0, [{ itemKey: 'hygieia_soft_bandage', nextReadyAt: t }]),
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
        { itemKey: 'dynamite_fuse_bomb', nextReadyAt: t },
        { itemKey: 'hygieia_soft_bandage', nextReadyAt: t },
      ]),
      seat(10, 0, [{ itemKey: 'dynamite_fuse_bomb', nextReadyAt: t }]),
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
      seat(100, 0, [{ itemKey: 'athena_aegis_chip', nextReadyAt: 7_000 }]),
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
      seat(80, 0, [{ itemKey: 'hermes_winged_needle', nextReadyAt: t }]),
      seat(60, 0, [{ itemKey: 'hermes_winged_needle', nextReadyAt: t }]),
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
      seat(55, 20, [{ itemKey: 'hygieia_restorative_hymn', nextReadyAt: t }]),
      seat(55, 0, [{ itemKey: 'athena_parthenon', nextReadyAt: t }]),
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
        { itemKey: 'hermes_winged_needle', nextReadyAt: t },
        { itemKey: 'dynamite_fuse_bomb', nextReadyAt: 10_000 },
      ]),
      seat(100, 0, [{ itemKey: 'athena_aegis_chip', nextReadyAt: 7_000 }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(result.seats[0].slots[0].nextReadyAt).toBe(t + 1_200)
    expect(result.nextWakeAt).toBe(t + 1_200)
  })

  it('selects time cap as next wake when it is sooner than refreshed ready times', () => {
    const matchStartedAt = 0
    const t = DEFAULT_MATCH_TIME_CAP_MS - 500
    const seats = dualSeats(
      seat(100, 0, [{ itemKey: 'hermes_winged_needle', nextReadyAt: t }]),
      seat(100, 0, [{ itemKey: 'athena_aegis_chip', nextReadyAt: t + 99_000 }]),
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
      seat(100, 0, [
        { itemKey: 'hermes_winged_needle' },
        { itemKey: 'hygieia_soft_bandage' },
        { itemKey: 'athena_aegis_chip' },
      ]),
      seat(100, 0, [
        { itemKey: 'dynamite_fuse_bomb' },
        { itemKey: 'hygieia_restorative_hymn' },
        { itemKey: 'athena_parthenon' },
      ]),
    )
    expect(seats[0].slots[0].nextReadyAt).toBe(matchStartedAt + 1_200)
    expect(seats[0].slots[1].nextReadyAt).toBe(matchStartedAt + 2_000)
    expect(seats[0].slots[2].nextReadyAt).toBe(matchStartedAt + 2_500)
    expect(earliestWakeAt(seats, matchStartedAt)).toBe(matchStartedAt + 1_200)

    const t = matchStartedAt + 1_200
    const result = resolveMatchStep({
      seats: cloneDeep(seats),
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(result.fires).toEqual([
      { seat: 0, slotIndex: 0, itemKey: 'hermes_winged_needle', effect: 'damage', potency: 5 },
    ])
    expect(result.seats[0].slots[0].nextReadyAt).toBe(t + 1_200)
    expect(result.seats[0].slots[0].lastChargeCooldownMs).toBe(1_200)
    expect(result.nextWakeAt).toBe(matchStartedAt + 2_000)
  })

  it('seeds the first damage charge with stolen seconds effective cooldown at match start', () => {
    const matchStartedAt = 0
    const seats = seededAtMatchStart(
      matchStartedAt,
      seat(100, 0, [{ itemKey: 'hermes_stolen_seconds' }, { itemKey: 'hermes_winged_needle' }]),
      seat(100, 0, [{ itemKey: 'athena_aegis_chip' }]),
      BOW_AT_SEAT_0,
    )
    expect(seats[0].slots[1].nextReadyAt).toBe(matchStartedAt + 958.8)
    expect(seats[0].slots[1].lastChargeCooldownMs).toBe(958.8)
    expect(earliestWakeAt(seats, matchStartedAt)).toBe(matchStartedAt + 958.8)

    const t = matchStartedAt + 958.8
    const result = resolveMatchStep({
      seats: cloneDeep(seats),
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
      weaponKeys: BOW_AT_SEAT_0,
    })
    expect(result.fires).toEqual([
      { seat: 0, slotIndex: 1, itemKey: 'hermes_winged_needle', effect: 'damage', potency: 5 },
    ])
    expect(result.seats[0].slots[1].nextReadyAt).toBe(t + 958.8)
    expect(result.nextWakeAt).toBe(t + 958.8)
  })

  it('shortens own-seat damage recharge when stolen seconds is present', () => {
    const matchStartedAt = 0
    const t = 1_200
    const seats = dualSeats(
      seat(100, 0, [
        { itemKey: 'hermes_stolen_seconds' },
        { itemKey: 'hermes_winged_needle', nextReadyAt: t, lastChargeCooldownMs: 1_200 },
      ]),
      seat(100, 0, [{ itemKey: 'athena_aegis_chip', nextReadyAt: t + 99_000 }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
      weaponKeys: BOW_AT_SEAT_0,
    })
    expect(result.fires).toEqual([
      { seat: 0, slotIndex: 1, itemKey: 'hermes_winged_needle', effect: 'damage', potency: 5 },
    ])
    expect(result.seats[0].slots[1].nextReadyAt).toBe(t + 958.8)
    expect(result.seats[0].slots[1].lastChargeCooldownMs).toBe(958.8)
    expect(result.nextWakeAt).toBe(t + 958.8)
  })

  it('buffs own-seat heal potency with vital bloom including self', () => {
    const matchStartedAt = 0
    const t = 2_500
    const seats = dualSeats(
      seat(90, 0, [
        { itemKey: 'hygieia_vital_bloom', nextReadyAt: t, lastChargeCooldownMs: 2_500 },
        { itemKey: 'hygieia_soft_bandage', nextReadyAt: t + 99_000 },
      ]),
      seat(100, 0, [{ itemKey: 'hermes_winged_needle', nextReadyAt: t + 99_000 }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(result.fires).toEqual([
      { seat: 0, slotIndex: 0, itemKey: 'hygieia_vital_bloom', effect: 'heal', potency: 11 },
    ])
    expect(result.seats[0].life).toBe(101)
    expect(result.seats[0].slots[0].nextReadyAt).toBe(t + 2_500)
  })

  it('applies vital bloom potency buff to other own-seat heal items', () => {
    const matchStartedAt = 0
    const t = 2_000
    const seats = dualSeats(
      seat(90, 0, [
        { itemKey: 'hygieia_vital_bloom', nextReadyAt: t + 99_000 },
        { itemKey: 'hygieia_soft_bandage', nextReadyAt: t, lastChargeCooldownMs: 2_000 },
      ]),
      seat(100, 0, [{ itemKey: 'hermes_winged_needle', nextReadyAt: t + 99_000 }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(result.fires).toEqual([
      { seat: 0, slotIndex: 1, itemKey: 'hygieia_soft_bandage', effect: 'heal', potency: 10 },
    ])
    expect(result.seats[0].life).toBe(100)
  })

  it('never fires passive-only slots or emits animation hints for them', () => {
    const matchStartedAt = 0
    const t = 5_000
    const seats = dualSeats(
      seat(100, 0, [
        { itemKey: 'hermes_stolen_seconds' },
        { itemKey: 'hermes_stolen_seconds' },
        { itemKey: 'hermes_winged_needle', nextReadyAt: t, lastChargeCooldownMs: 1_200 },
      ]),
      seat(100, 0, [{ itemKey: 'hermes_stolen_seconds' }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
      weaponKeys: BOW_AT_SEAT_0,
    })
    expect(result.fires).toEqual([
      { seat: 0, slotIndex: 2, itemKey: 'hermes_winged_needle', effect: 'damage', potency: 5 },
    ])
    expect(result.animationHints).toEqual([{ kind: 'damage', seat: 0, slotIndex: 2 }])
    expect(result.seats[0].slots[0].nextReadyAt).toBeUndefined()
    expect(result.seats[1].slots[0].nextReadyAt).toBeUndefined()
  })

  it('stacks duplicate stolen seconds on damage cooldown percent', () => {
    const matchStartedAt = 0
    const t = 1_200
    const seats = dualSeats(
      seat(100, 0, [
        { itemKey: 'hermes_stolen_seconds' },
        { itemKey: 'hermes_stolen_seconds' },
        { itemKey: 'hermes_stolen_seconds' },
        { itemKey: 'hermes_winged_needle', nextReadyAt: t, lastChargeCooldownMs: 1_200 },
      ]),
      seat(100, 0, [{ itemKey: 'athena_aegis_chip', nextReadyAt: t + 99_000 }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
      weaponKeys: BOW_AT_SEAT_0,
    })
    expect(result.seats[0].slots[3].nextReadyAt).toBe(t + 620.4)
    expect(result.seats[0].slots[3].lastChargeCooldownMs).toBeCloseTo(620.4)
  })

  it('floors stacked haste at 500ms effective cooldown', () => {
    const matchStartedAt = 0
    const t = 2_000
    const seats = dualSeats(
      seat(100, 0, [
        { itemKey: 'hermes_stolen_seconds' },
        { itemKey: 'hermes_stolen_seconds' },
        { itemKey: 'hermes_stolen_seconds' },
        { itemKey: 'hermes_stolen_seconds' },
        { itemKey: 'hermes_stolen_seconds' },
        { itemKey: 'hermes_winged_needle', nextReadyAt: t, lastChargeCooldownMs: 1_200 },
      ]),
      seat(100, 0, [{ itemKey: 'athena_aegis_chip', nextReadyAt: t + 99_000 }]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
      weaponKeys: BOW_AT_SEAT_0,
    })
    expect(result.seats[0].slots[5].lastChargeCooldownMs).toBe(MIN_EFFECTIVE_COOLDOWN_MS)
    expect(result.seats[0].slots[5].nextReadyAt).toBe(t + MIN_EFFECTIVE_COOLDOWN_MS)
  })

  it('rewrites mid-charge nextReadyAt when effective cooldown changes via re-eval', () => {
    const matchStartedAt = 0
    const tFire = 1_000
    const afterFire = resolveMatchStep({
      seats: dualSeats(
        seat(100, 0, [
          { itemKey: 'hermes_winged_needle', nextReadyAt: tFire, lastChargeCooldownMs: 1_200 },
        ]),
        seat(100, 0, [{ itemKey: 'athena_aegis_chip', nextReadyAt: tFire + 99_000 }]),
      ),
      t: tFire,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(afterFire.seats[0].slots[0].nextReadyAt).toBe(2_200)

    const tReEval = 1_500
    const seatsWithCharm = dualSeats(
      seat(100, 0, [
        { itemKey: 'hermes_stolen_seconds' },
        {
          itemKey: 'hermes_winged_needle',
          nextReadyAt: afterFire.seats[0].slots[0].nextReadyAt,
          lastChargeCooldownMs: afterFire.seats[0].slots[0].lastChargeCooldownMs,
        },
      ]),
      seat(100, 0, [{ itemKey: 'athena_aegis_chip', nextReadyAt: tReEval + 99_000 }]),
    )
    const reEvalResult = resolveMatchStep({
      seats: seatsWithCharm,
      t: tReEval,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
      weaponKeys: BOW_AT_SEAT_0,
    })
    expect(reEvalResult.fires).toEqual([])
    expect(reEvalResult.seats[0].slots[1].nextReadyAt).toBe(2_059.3)
    expect(reEvalResult.seats[0].slots[1].lastChargeCooldownMs).toBe(958.8)
  })

  it('exposes reEvalFireCapableSlotSchedules for explicit prior-effective overrides', () => {
    const now = 1_000
    const seats = dualSeats(
      seat(100, 0, [
        { itemKey: 'hermes_winged_needle', nextReadyAt: 2_000, lastChargeCooldownMs: 1_200 },
      ]),
      seat(100, 0, []),
    )
    reEvalFireCapableSlotSchedules(seats, now, ITEM_CATALOG, [
      [{ cooldownMs: 1_200, potency: 5 }],
      [],
    ])
    expect(seats[0].slots[0].nextReadyAt).toBe(2_000)

    const seatsWithCharm = dualSeats(
      seat(100, 0, [
        { itemKey: 'hermes_stolen_seconds' },
        { itemKey: 'hermes_winged_needle', nextReadyAt: 2_000, lastChargeCooldownMs: 1_200 },
      ]),
      seat(100, 0, []),
    )
    reEvalFireCapableSlotSchedules(
      seatsWithCharm,
      now,
      ITEM_CATALOG,
      [[{}, { cooldownMs: 1_200, potency: 5 }], []],
      undefined,
      BOW_AT_SEAT_0,
    )
    expect(seatsWithCharm[0].slots[1].nextReadyAt).toBe(1_799)
    expect(seatsWithCharm[0].slots[1].lastChargeCooldownMs).toBe(958.8)
  })

  it('ignores passive-only slots when scheduling next wake', () => {
    const matchStartedAt = 0
    const t = 1_000
    const seats = dualSeats(
      seat(100, 0, [
        { itemKey: 'hermes_stolen_seconds' },
        { itemKey: 'hermes_stolen_seconds' },
        { itemKey: 'hermes_stolen_seconds' },
      ]),
      seat(100, 0, [{ itemKey: 'hermes_stolen_seconds' }]),
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

  it('resolves representative god catalog boons in combat', () => {
    const matchStartedAt = 0
    const t = 5_000
    const seats = dualSeats(
      seat(100, 0, [{ itemKey: 'dynamite_fuse_bomb', nextReadyAt: t }]),
      seat(100, 0, [
        { itemKey: 'hygieia_soft_bandage', nextReadyAt: t + 99_000 },
        { itemKey: 'athena_aegis_chip', nextReadyAt: t + 99_000 },
        { itemKey: 'zeus_spark_arc', nextReadyAt: t + 99_000 },
      ]),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
    })
    expect(result.fires).toEqual([
      { seat: 0, slotIndex: 0, itemKey: 'dynamite_fuse_bomb', effect: 'damage', potency: 22 },
    ])
    expect(result.seats[1].life).toBe(78)
  })

  it('multiplies Soul Strength into damage potency after Passive stacking', () => {
    const matchStartedAt = 0
    const t = 2_000
    const souls: [SoulStats, SoulStats] = [
      { strength: 3, speed: 0, vitality: 0 },
      { strength: 0, speed: 0, vitality: 0 },
    ]
    const seats = dualSeats(
      seat(100, 0, [{ itemKey: 'hermes_winged_needle', nextReadyAt: t }]),
      seat(100, 0, []),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt,
      souls,
    })
    expect(result.fires[0]?.potency).toBeCloseTo(5.9)
    expect(result.seats[1].life).toBeCloseTo(94.1)
  })

  it('caps heal at the seat max life from Vitality', () => {
    const vitality = 8
    const startingLife = startingLifeFromVitality(vitality, MATCH_LIFE_CAP)
    const souls: [SoulStats, SoulStats] = [
      { strength: 0, speed: 0, vitality },
      { strength: 0, speed: 0, vitality: 0 },
    ]
    const t = 5_000
    const seats = dualSeats(
      seat(startingLife - 5, 0, [{ itemKey: 'hygieia_soft_bandage', nextReadyAt: t }]),
      seat(100, 0, []),
    )
    const result = resolveMatchStep({
      seats,
      t,
      seatResolveOrder: [0, 1],
      catalog: ITEM_CATALOG,
      matchStartedAt: 0,
      souls,
    })
    expect(startingLife).toBe(224)
    expect(result.seats[0].life).toBe(startingLife)
  })
})
