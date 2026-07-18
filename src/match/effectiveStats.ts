import { filter, flatMap, forEach, get, map, sum } from 'lodash'

import type {
  ItemCatalog,
  MatchSeatState,
  PassiveFilter,
  PassiveSeatTarget,
  PassiveStat,
  PassiveStatChange,
  SeatIndex,
} from './types'
import { isFireCapableItem } from './types'

export const MIN_EFFECTIVE_COOLDOWN_MS = 500
export const MIN_EFFECTIVE_POTENCY = 0

export type SlotAddress = {
  seat: SeatIndex
  slotIndex: number
}

export type EffectiveSlotStats = {
  cooldownMs?: number
  potency?: number
}

function carrierAffectsRecipientSeat(
  carrierSeat: SeatIndex,
  recipientSeat: SeatIndex,
  seatTarget: PassiveSeatTarget,
): boolean {
  if (seatTarget === 'own') {
    return carrierSeat === recipientSeat
  }
  if (seatTarget === 'enemy') {
    return carrierSeat !== recipientSeat
  }
  return true
}

function recipientMatchesFilter(
  recipientEffect: NonNullable<ItemCatalog[string]['effect']>,
  passiveFilter: PassiveFilter,
): boolean {
  if (passiveFilter === 'all') {
    return true
  }
  return recipientEffect === passiveFilter
}

function collectPassiveChangesForStat(
  seats: [MatchSeatState, MatchSeatState],
  recipient: SlotAddress,
  stat: PassiveStat,
  catalog: ItemCatalog,
): PassiveStatChange[] {
  const recipientSlot = get(seats[recipient.seat], ['slots', recipient.slotIndex])
  if (recipientSlot === undefined) {
    return []
  }
  const recipientDef = catalog[recipientSlot.itemKey]
  if (!isFireCapableItem(recipientDef)) {
    return []
  }

  return flatMap([0, 1] as SeatIndex[], (carrierSeat) =>
    flatMap(seats[carrierSeat].slots, (carrierSlot) => {
      const carrierDef = catalog[carrierSlot.itemKey]
      const passive = carrierDef?.passive
      if (passive === undefined) {
        return []
      }
      if (
        !carrierAffectsRecipientSeat(carrierSeat, recipient.seat, passive.seatTarget)
      ) {
        return []
      }
      if (!recipientMatchesFilter(recipientDef.effect, passive.filter)) {
        return []
      }
      return filter(passive.changes, (change) => change.stat === stat)
    }),
  )
}

function applyStatChanges(
  base: number,
  changes: PassiveStatChange[],
  floor: number,
): number {
  const percentSum = sum(
    map(
      filter(changes, (change) => change.mode === 'percent'),
      (change) => change.value,
    ),
  )
  const flatSum = sum(
    map(
      filter(changes, (change) => change.mode === 'flat'),
      (change) => change.value,
    ),
  )
  return Math.max(floor, base * (1 + percentSum) + flatSum)
}

export function resolveSlotEffectiveStats(
  seats: [MatchSeatState, MatchSeatState],
  recipient: SlotAddress,
  catalog: ItemCatalog,
): EffectiveSlotStats {
  const recipientSlot = get(seats[recipient.seat], ['slots', recipient.slotIndex])
  if (recipientSlot === undefined) {
    return {}
  }
  const recipientDef = catalog[recipientSlot.itemKey]
  if (!isFireCapableItem(recipientDef)) {
    return {}
  }

  const cooldownChanges = collectPassiveChangesForStat(
    seats,
    recipient,
    'cooldown',
    catalog,
  )
  const potencyChanges = collectPassiveChangesForStat(
    seats,
    recipient,
    'potency',
    catalog,
  )

  return {
    cooldownMs: applyStatChanges(
      recipientDef.cooldownMs,
      cooldownChanges,
      MIN_EFFECTIVE_COOLDOWN_MS,
    ),
    potency: applyStatChanges(
      recipientDef.potency,
      potencyChanges,
      MIN_EFFECTIVE_POTENCY,
    ),
  }
}

export function rewriteNextReadyAtForEffectiveCooldown(input: {
  now: number
  priorEffectiveCooldownMs: number
  newEffectiveCooldownMs: number
  nextReadyAt: number
}): number {
  const { now, priorEffectiveCooldownMs, newEffectiveCooldownMs, nextReadyAt } = input
  if (priorEffectiveCooldownMs <= 0) {
    return now + newEffectiveCooldownMs
  }
  const remaining = nextReadyAt - now
  const progress = Math.min(1, Math.max(0, 1 - remaining / priorEffectiveCooldownMs))
  return now + (1 - progress) * newEffectiveCooldownMs
}

export function resolveAllFireCapableEffectiveStats(
  seats: [MatchSeatState, MatchSeatState],
  catalog: ItemCatalog,
): EffectiveSlotStats[][] {
  const statsBySeat: EffectiveSlotStats[][] = [[], []]
  forEach([0, 1] as SeatIndex[], (seat) => {
    forEach(seats[seat].slots, (_slot, slotIndex) => {
      statsBySeat[seat][slotIndex] = resolveSlotEffectiveStats(
        seats,
        { seat, slotIndex },
        catalog,
      )
    })
  })
  return statsBySeat
}
