import { filter, flatMap, forEach, get, map, sum } from 'lodash'

import type {
  God,
  ItemCatalog,
  ItemEffect,
  MatchSeatState,
  PassiveFilter,
  PassiveSeatTarget,
  PassiveStat,
  PassiveStatChange,
  SeatIndex,
  SoulStats,
  WeaponType,
} from './types'
import { isFireCapableItem } from './types'
import { WEAPON_CATALOG } from './weaponCatalog'

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

function filterEffectKind(passiveFilter: PassiveFilter): ItemEffect | undefined {
  if (passiveFilter === 'all') {
    return undefined
  }
  if (typeof passiveFilter === 'string') {
    return passiveFilter
  }
  return passiveFilter.effectKind
}

function filterGod(passiveFilter: PassiveFilter): God | undefined {
  if (passiveFilter === 'all' || typeof passiveFilter === 'string') {
    return undefined
  }
  return passiveFilter.god
}

function filterWeaponType(passiveFilter: PassiveFilter): WeaponType | undefined {
  if (passiveFilter === 'all' || typeof passiveFilter === 'string') {
    return undefined
  }
  return passiveFilter.weaponType
}

function carrierWeaponType(
  carrierSeat: SeatIndex,
  weaponKeys?: [string, string],
): WeaponType | undefined {
  const weaponKey = weaponKeys?.[carrierSeat]
  if (weaponKey === undefined) {
    return undefined
  }
  return WEAPON_CATALOG[weaponKey]?.weaponType
}

function recipientMatchesFilter(
  recipientDef: ItemCatalog[string],
  passiveFilter: PassiveFilter,
): boolean {
  if (passiveFilter === 'all') {
    return true
  }
  const effectKind = filterEffectKind(passiveFilter)
  if (effectKind !== undefined && recipientDef.effect !== effectKind) {
    return false
  }
  const god = filterGod(passiveFilter)
  if (god !== undefined && recipientDef.god !== god) {
    return false
  }
  return true
}

function collectPassiveChangesForStat(
  seats: [MatchSeatState, MatchSeatState],
  recipient: SlotAddress,
  stat: PassiveStat,
  catalog: ItemCatalog,
  weaponKeys?: [string, string],
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
      if (!carrierAffectsRecipientSeat(carrierSeat, recipient.seat, passive.seatTarget)) {
        return []
      }
      const requiredWeaponType = filterWeaponType(passive.filter)
      if (requiredWeaponType !== undefined) {
        const equippedType = carrierWeaponType(carrierSeat, weaponKeys)
        if (equippedType !== requiredWeaponType) {
          return []
        }
      }
      if (!recipientMatchesFilter(recipientDef, passive.filter)) {
        return []
      }
      return filter(passive.changes, (change) => change.stat === stat)
    }),
  )
}

function applyStatChanges(base: number, changes: PassiveStatChange[], floor: number): number {
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

function applySoulToEffectiveStats(
  stats: EffectiveSlotStats,
  soul: SoulStats,
  effect: ItemEffect,
): EffectiveSlotStats {
  const result: EffectiveSlotStats = { ...stats }

  if (result.cooldownMs !== undefined) {
    const speedReduction = soul.speed * 0.02
    result.cooldownMs = Math.max(
      MIN_EFFECTIVE_COOLDOWN_MS,
      result.cooldownMs * (1 - speedReduction),
    )
  }

  if (effect === 'damage' && result.potency !== undefined) {
    const strengthMultiplier = 1 + soul.strength * 0.1
    result.potency = Math.max(MIN_EFFECTIVE_POTENCY, result.potency * strengthMultiplier)
  }

  return result
}

function applyWeaponToEffectiveStats(
  stats: EffectiveSlotStats,
  weaponKey: string | undefined,
  effect: ItemEffect,
): EffectiveSlotStats {
  if (weaponKey === undefined) {
    return stats
  }
  const weapon = WEAPON_CATALOG[weaponKey]
  const nudges = weapon?.nudges
  if (nudges === undefined) {
    return stats
  }

  const result: EffectiveSlotStats = { ...stats }

  if (nudges.cooldownPercent !== undefined && result.cooldownMs !== undefined) {
    result.cooldownMs = Math.max(
      MIN_EFFECTIVE_COOLDOWN_MS,
      result.cooldownMs * (1 + nudges.cooldownPercent),
    )
  }

  if (
    nudges.damagePotencyPercent !== undefined &&
    effect === 'damage' &&
    result.potency !== undefined
  ) {
    result.potency = Math.max(
      MIN_EFFECTIVE_POTENCY,
      result.potency * (1 + nudges.damagePotencyPercent),
    )
  }

  return result
}

export function resolveSlotEffectiveStats(
  seats: [MatchSeatState, MatchSeatState],
  recipient: SlotAddress,
  catalog: ItemCatalog,
  souls?: [SoulStats, SoulStats],
  weaponKeys?: [string, string],
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
    weaponKeys,
  )
  const potencyChanges = collectPassiveChangesForStat(
    seats,
    recipient,
    'potency',
    catalog,
    weaponKeys,
  )

  const afterPassive: EffectiveSlotStats = {
    cooldownMs: applyStatChanges(
      recipientDef.cooldownMs,
      cooldownChanges,
      MIN_EFFECTIVE_COOLDOWN_MS,
    ),
    potency: applyStatChanges(recipientDef.potency, potencyChanges, MIN_EFFECTIVE_POTENCY),
  }

  const soul = souls?.[recipient.seat]
  if (soul === undefined) {
    return applyWeaponToEffectiveStats(
      afterPassive,
      weaponKeys?.[recipient.seat],
      recipientDef.effect,
    )
  }

  const afterSoul = applySoulToEffectiveStats(afterPassive, soul, recipientDef.effect)
  return applyWeaponToEffectiveStats(afterSoul, weaponKeys?.[recipient.seat], recipientDef.effect)
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
  souls?: [SoulStats, SoulStats],
  weaponKeys?: [string, string],
): EffectiveSlotStats[][] {
  const statsBySeat: EffectiveSlotStats[][] = [[], []]
  forEach([0, 1] as SeatIndex[], (seat) => {
    forEach(seats[seat].slots, (_slot, slotIndex) => {
      statsBySeat[seat][slotIndex] = resolveSlotEffectiveStats(
        seats,
        { seat, slotIndex },
        catalog,
        souls,
        weaponKeys,
      )
    })
  })
  return statsBySeat
}
