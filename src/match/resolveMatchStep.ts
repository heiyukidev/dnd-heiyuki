import { cloneDeep, filter, flatMap, forEach, get, map, min, range, some } from 'lodash'

import type {
  AnimationHint,
  ItemCatalog,
  LoadoutSlot,
  MatchFire,
  MatchSeatState,
  MatchUpdate,
  ResolveMatchStepInput,
  SeatIndex,
} from './types'

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

function applyHeal(target: MatchSeatState, potency: number): void {
  target.life = Math.min(MATCH_LIFE_CAP, target.life + potency)
}

function applyShield(target: MatchSeatState, potency: number): void {
  target.shield += potency
}

function applyEffect(
  seats: [MatchSeatState, MatchSeatState],
  seat: SeatIndex,
  effect: MatchFire['effect'],
  potency: number,
): void {
  if (effect === 'damage') {
    applyDamage(seats[otherSeat(seat)], potency)
    return
  }
  if (seats[seat].life <= 0) {
    return
  }
  if (effect === 'heal') {
    applyHeal(seats[seat], potency)
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
      if (slot.nextReadyAt <= t && catalog[slot.itemKey] === undefined) {
        slot.nextReadyAt = timeCapAt
      }
    })
  })
}

function collectReadyFires(
  seats: [MatchSeatState, MatchSeatState],
  t: number,
  seatResolveOrder: [SeatIndex, SeatIndex],
  catalog: ItemCatalog,
): MatchFire[] {
  return flatMap(seatResolveOrder, (seat) => {
    const slots = get(seats[seat], 'slots', []) as LoadoutSlot[]
    return filter(
      map(range(slots.length), (slotIndex) => {
        const slot = slots[slotIndex]
        if (slot === undefined || slot.nextReadyAt > t) {
          return null
        }
        const def = catalog[slot.itemKey]
        if (def === undefined) {
          return null
        }
        return {
          seat,
          slotIndex,
          itemKey: slot.itemKey,
          effect: def.effect,
          potency: def.potency,
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
  const readyTimes = flatMap(seats, (seat) => map(seat.slots, (slot) => slot.nextReadyAt))
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

  const fires = collectReadyFires(seats, t, input.seatResolveOrder, input.catalog)
  const animationHints: AnimationHint[] = map(fires, (fire) => ({
    kind: fire.effect,
    seat: fire.seat,
    slotIndex: fire.slotIndex,
  }))

  for (const fire of fires) {
    applyEffect(seats, fire.seat, fire.effect, fire.potency)
    const def = input.catalog[fire.itemKey]
    const cooldownMs = def?.cooldownMs ?? 0
    seats[fire.seat].slots[fire.slotIndex] = {
      itemKey: fire.itemKey,
      nextReadyAt: t + cooldownMs,
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
  const readyTimes = flatMap(seats, (seat) => map(seat.slots, (slot) => slot.nextReadyAt))
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
  return some(seats, (seat) => some(seat.slots, (slot) => slot.nextReadyAt <= t))
}
