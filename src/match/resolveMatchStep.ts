import {
  cloneDeep,
  filter,
  flatMap,
  forEach,
  get,
  map,
  min,
  range,
  some,
} from 'lodash'

import {
  resolveAllFireCapableEffectiveStats,
  rewriteNextReadyAtForEffectiveCooldown,
} from './effectiveStats'
import type { EffectiveSlotStats } from './effectiveStats'
import type {
  AnimationHint,
  ItemCatalog,
  LoadoutSlot,
  MatchFire,
  MatchSeatState,
  MatchUpdate,
  ResolveMatchStepInput,
  SeatIndex,
  SoulStats,
} from './types'
import { isFireCapableItem } from './types'
import { maxLifeFromSoul } from './soul'

export const DEFAULT_MATCH_TIME_CAP_MS = 60_000
export const MATCH_LIFE_CAP = 100

function otherSeat(seat: SeatIndex): SeatIndex {
  return seat === 0 ? 1 : 0
}

function applyDamage(target: MatchSeatState, potency: number): void {
  let remaining = potency
  if (target.shield > 0) {
    const absorbed = Math.min(target.shield, remaining)
    target.shield -= absorbed
    remaining -= absorbed
  }
  if (remaining > 0) {
    target.life = Math.max(0, target.life - remaining)
  }
}

function healCapForSeat(seat: SeatIndex, souls?: [SoulStats, SoulStats]): number {
  const soul = souls?.[seat]
  if (soul === undefined) {
    return MATCH_LIFE_CAP
  }
  return maxLifeFromSoul(soul, MATCH_LIFE_CAP)
}

function applyHeal(target: MatchSeatState, potency: number, healCap: number): void {
  target.life = Math.min(healCap, target.life + potency)
}

function applyShield(target: MatchSeatState, potency: number): void {
  target.shield += potency
}

function applyEffect(
  seats: [MatchSeatState, MatchSeatState],
  seat: SeatIndex,
  effect: MatchFire['effect'],
  potency: number,
  souls?: [SoulStats, SoulStats],
): void {
  if (effect === 'damage') {
    applyDamage(seats[otherSeat(seat)], potency)
    return
  }
  if (seats[seat].life <= 0) {
    return
  }
  if (effect === 'heal') {
    applyHeal(seats[seat], potency, healCapForSeat(seat, souls))
    return
  }
  applyShield(seats[seat], potency)
}

function advanceUnknownReadySlots(
  seats: [MatchSeatState, MatchSeatState],
  t: number,
  timeCapAt: number,
  catalog: ItemCatalog,
): void {
  forEach(seats, (seat) => {
    forEach(seat.slots, (slot) => {
      if (
        slot.nextReadyAt !== undefined &&
        slot.nextReadyAt <= t &&
        catalog[slot.itemKey] === undefined
      ) {
        slot.nextReadyAt = timeCapAt
      }
    })
  })
}

function priorEffectiveCooldownMsForSlot(
  slot: LoadoutSlot,
  catalog: ItemCatalog,
  priorEffectiveStats: EffectiveSlotStats[][] | undefined,
  seat: SeatIndex,
  slotIndex: number,
): number | undefined {
  const fromPriorStats = get(priorEffectiveStats, [seat, slotIndex, 'cooldownMs'])
  if (typeof fromPriorStats === 'number') {
    return fromPriorStats
  }
  if (slot.lastChargeCooldownMs !== undefined) {
    return slot.lastChargeCooldownMs
  }
  const baseCooldownMs = catalog[slot.itemKey]?.cooldownMs
  return typeof baseCooldownMs === 'number' ? baseCooldownMs : undefined
}

export function reEvalFireCapableSlotSchedules(
  seats: [MatchSeatState, MatchSeatState],
  now: number,
  catalog: ItemCatalog,
  priorEffectiveStats?: EffectiveSlotStats[][],
  souls?: [SoulStats, SoulStats],
): EffectiveSlotStats[][] {
  const newEffectiveStats = resolveAllFireCapableEffectiveStats(seats, catalog, souls)

  forEach([0, 1] as SeatIndex[], (seat) => {
    forEach(seats[seat].slots, (slot, slotIndex) => {
      if (slot.nextReadyAt === undefined || slot.nextReadyAt <= now) {
        return
      }
      const def = catalog[slot.itemKey]
      if (!isFireCapableItem(def)) {
        return
      }

      const newEffectiveCooldownMs = get(newEffectiveStats, [seat, slotIndex, 'cooldownMs'])
      if (newEffectiveCooldownMs === undefined) {
        return
      }

      const priorEffectiveCooldownMs = priorEffectiveCooldownMsForSlot(
        slot,
        catalog,
        priorEffectiveStats,
        seat,
        slotIndex,
      )
      if (
        priorEffectiveCooldownMs === undefined ||
        priorEffectiveCooldownMs === newEffectiveCooldownMs
      ) {
        return
      }

      slot.nextReadyAt = rewriteNextReadyAtForEffectiveCooldown({
        now,
        priorEffectiveCooldownMs,
        newEffectiveCooldownMs,
        nextReadyAt: slot.nextReadyAt,
      })
      slot.lastChargeCooldownMs = newEffectiveCooldownMs
    })
  })

  return newEffectiveStats
}

export function seedFireCapableSlotSchedulesAtMatchStart(
  seats: [MatchSeatState, MatchSeatState],
  matchStartedAt: number,
  catalog: ItemCatalog,
  souls?: [SoulStats, SoulStats],
): void {
  const effectiveStats = resolveAllFireCapableEffectiveStats(seats, catalog, souls)

  forEach([0, 1] as SeatIndex[], (seat) => {
    forEach(seats[seat].slots, (slot, slotIndex) => {
      const def = catalog[slot.itemKey]
      if (!isFireCapableItem(def)) {
        return
      }
      const effectiveCooldownMs =
        get(effectiveStats, [seat, slotIndex, 'cooldownMs']) ?? def.cooldownMs
      slot.nextReadyAt = matchStartedAt + effectiveCooldownMs
      slot.lastChargeCooldownMs = effectiveCooldownMs
    })
  })
}

function collectReadyFires(
  seats: [MatchSeatState, MatchSeatState],
  t: number,
  seatResolveOrder: [SeatIndex, SeatIndex],
  catalog: ItemCatalog,
  effectiveStats: EffectiveSlotStats[][],
): MatchFire[] {
  return flatMap(seatResolveOrder, (seat) => {
    const slots = get(seats[seat], 'slots', []) as LoadoutSlot[]
    return filter(
      map(range(slots.length), (slotIndex) => {
        const slot = slots[slotIndex]
        if (slot === undefined || slot.nextReadyAt === undefined || slot.nextReadyAt > t) {
          return null
        }
        const def = catalog[slot.itemKey]
        if (!isFireCapableItem(def)) {
          return null
        }
        const effectivePotency =
          get(effectiveStats, [seat, slotIndex, 'potency']) ?? def.potency
        return {
          seat,
          slotIndex,
          itemKey: slot.itemKey,
          effect: def.effect,
          potency: effectivePotency,
        } satisfies MatchFire
      }),
      (fire): fire is MatchFire => fire !== null,
    )
  })
}

function outcomeAfterSeats(seats: [MatchSeatState, MatchSeatState]): MatchUpdate['outcome'] {
  const seat0Dead = seats[0].life <= 0
  const seat1Dead = seats[1].life <= 0
  if (seat0Dead && seat1Dead) {
    return { type: 'draw' }
  }
  if (seat0Dead) {
    return { type: 'winner', seat: 1 }
  }
  if (seat1Dead) {
    return { type: 'winner', seat: 0 }
  }
  return { type: 'continue' }
}

function timeCapOutcome(seats: [MatchSeatState, MatchSeatState]): MatchUpdate['outcome'] {
  if (seats[0].life > seats[1].life) {
    return { type: 'winner', seat: 0 }
  }
  if (seats[1].life > seats[0].life) {
    return { type: 'winner', seat: 1 }
  }
  return { type: 'draw' }
}

function nextWakeAtForContinue(
  seats: [MatchSeatState, MatchSeatState],
  timeCapAt: number,
): number {
  const readyTimes = flatMap(seats, (seat) =>
    filter(
      map(seat.slots, (slot) => slot.nextReadyAt),
      (value): value is number => value !== undefined,
    ),
  )
  const soonestReady = min(readyTimes)
  const candidates = filter(
    [soonestReady, timeCapAt],
    (value): value is number => typeof value === 'number' && Number.isFinite(value),
  )
  return min(candidates) ?? timeCapAt
}

export function resolveMatchStep(input: ResolveMatchStepInput): MatchUpdate {
  const timeCapMs = input.timeCapMs ?? DEFAULT_MATCH_TIME_CAP_MS
  const timeCapAt = input.matchStartedAt + timeCapMs
  const seats = cloneDeep(input.seats) as [MatchSeatState, MatchSeatState]
  const t = input.t

  if (t >= timeCapAt) {
    return {
      atMs: t,
      fires: [],
      seats,
      animationHints: [],
      outcome: timeCapOutcome(seats),
    }
  }

  advanceUnknownReadySlots(seats, t, timeCapAt, input.catalog)

  const effectiveStats = reEvalFireCapableSlotSchedules(
    seats,
    t,
    input.catalog,
    undefined,
    input.souls,
  )

  const fires = collectReadyFires(seats, t, input.seatResolveOrder, input.catalog, effectiveStats)
  const animationHints: AnimationHint[] = map(fires, (fire) => ({
    kind: fire.effect,
    seat: fire.seat,
    slotIndex: fire.slotIndex,
  }))

  for (const fire of fires) {
    applyEffect(seats, fire.seat, fire.effect, fire.potency, input.souls)
    const def = input.catalog[fire.itemKey]
    const effectiveCooldownMs =
      get(effectiveStats, [fire.seat, fire.slotIndex, 'cooldownMs']) ?? def?.cooldownMs ?? 0
    seats[fire.seat].slots[fire.slotIndex] = {
      itemKey: fire.itemKey,
      nextReadyAt: t + effectiveCooldownMs,
      lastChargeCooldownMs: effectiveCooldownMs,
    }
  }

  const outcome = outcomeAfterSeats(seats)
  if (outcome.type !== 'continue') {
    return {
      atMs: t,
      fires,
      seats,
      animationHints,
      outcome,
    }
  }

  const nextWakeAt = nextWakeAtForContinue(seats, timeCapAt)
  return {
    atMs: t,
    fires,
    seats,
    animationHints,
    outcome,
    nextWakeAt,
  }
}

export function earliestWakeAt(
  seats: [MatchSeatState, MatchSeatState],
  matchStartedAt: number,
  timeCapMs: number = DEFAULT_MATCH_TIME_CAP_MS,
): number {
  const timeCapAt = matchStartedAt + timeCapMs
  const readyTimes = flatMap(seats, (seat) =>
    filter(
      map(seat.slots, (slot) => slot.nextReadyAt),
      (value): value is number => value !== undefined,
    ),
  )
  const soonestReady = min(readyTimes)
  if (soonestReady === undefined) {
    return timeCapAt
  }
  return Math.min(soonestReady, timeCapAt)
}

export function seatsHaveReadyAt(
  seats: [MatchSeatState, MatchSeatState],
  t: number,
): boolean {
  return some(
    seats,
    (seat) =>
      some(seat.slots, (slot) => slot.nextReadyAt !== undefined && slot.nextReadyAt <= t),
  )
}
