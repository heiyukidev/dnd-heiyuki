import { get, includes } from 'lodash'

import { createDraftRngFromRandom, sampleWithoutReplacement, type DraftRng } from './draftEngine'
import { startingLifeFromVitality } from './soul'
import type { SoulStats, WeaponType } from './types'
import { WEAPON_CATALOG, WEAPON_KEYS, WEAPON_TYPES } from './weaponCatalog'

export const WEAPON_OFFER_COUNT = 3

export function generateWeaponOffers(rng: DraftRng): string[] {
  return sampleWithoutReplacement(WEAPON_KEYS, WEAPON_OFFER_COUNT, rng)
}

export function generateWeaponOffersFromRandom(random: () => number): string[] {
  return generateWeaponOffers(createDraftRngFromRandom(random))
}

export function isValidWeaponPick(offers: readonly string[], weaponKey: string): boolean {
  return (
    includes(offers, weaponKey) &&
    WEAPON_CATALOG[weaponKey as keyof typeof WEAPON_CATALOG] !== undefined
  )
}

function resolveWeaponType(weaponTypeOrKey: WeaponType | string): WeaponType | undefined {
  const fromCatalog = get(WEAPON_CATALOG, [weaponTypeOrKey, 'weaponType']) as WeaponType | undefined
  if (fromCatalog !== undefined) {
    return fromCatalog
  }
  if (includes(WEAPON_TYPES, weaponTypeOrKey)) {
    return weaponTypeOrKey as WeaponType
  }
  return undefined
}

export function weaponFavorLine(weaponTypeOrKey: WeaponType | string): string | null {
  const weaponType = resolveWeaponType(weaponTypeOrKey)
  if (weaponType === undefined) {
    return null
  }

  switch (weaponType) {
    case 'Sword':
      return 'Favors damage kits'
    case 'Axe':
      return 'Favors high-damage kits'
    case 'Wand':
      return 'Favors sustain / hybrid'
    case 'Bow':
      return 'Favors Hermes tempo'
    default:
      return null
  }
}

export function maxLifeForSeat(
  soul: SoulStats | undefined,
  weaponKey: string | undefined,
  baseLife = 100,
): number {
  const vitalityLife =
    soul === undefined ? baseLife : startingLifeFromVitality(soul.vitality, baseLife)
  const weapon =
    weaponKey === undefined ? undefined : WEAPON_CATALOG[weaponKey as keyof typeof WEAPON_CATALOG]
  const lifeBonus = weapon?.nudges?.lifeBonus ?? 0
  return vitalityLife + lifeBonus
}
