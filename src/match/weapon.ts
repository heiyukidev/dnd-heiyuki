import { get, includes } from 'lodash'

import { createDraftRngFromRandom, sampleWeightedWithoutReplacement, type DraftRng } from './draftEngine'
import { godsAffiliatedWithWeaponType } from './itemCatalog'
import { MATCH_LIFE_CAP, startingLifeFromVitality } from './soul'
import type { SoulStats, WeaponType } from './types'
import {
  isWeaponKey,
  resolveWeaponNudges,
  weaponDefinition,
  weaponOfferWeight,
  WEAPON_KEYS,
  WEAPON_TYPES,
} from './weaponCatalog'

export const WEAPON_OFFER_COUNT = 3

export function generateWeaponOffers(rng: DraftRng): string[] {
  return sampleWeightedWithoutReplacement(WEAPON_KEYS, WEAPON_OFFER_COUNT, weaponOfferWeight, rng)
}

export function generateWeaponOffersFromRandom(random: () => number): string[] {
  return generateWeaponOffers(createDraftRngFromRandom(random))
}

export function isValidWeaponPick(offers: readonly string[], weaponKey: string): boolean {
  return includes(offers, weaponKey) && isWeaponKey(weaponKey)
}

function resolveWeaponType(weaponTypeOrKey: WeaponType | string): WeaponType | undefined {
  const fromCatalog = weaponDefinition(weaponTypeOrKey)?.weaponType
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

  const affiliatedGods = godsAffiliatedWithWeaponType(weaponType)
  if (affiliatedGods.length === 0) {
    return null
  }
  return `Favors ${affiliatedGods.join(', ')}`
}

export function maxLifeForSeat(
  soul: SoulStats | undefined,
  weaponKey: string | undefined,
  baseLife = MATCH_LIFE_CAP,
): number {
  const vitalityLife =
    soul === undefined ? baseLife : startingLifeFromVitality(soul.vitality, baseLife)
  const lifeBonus = get(resolveWeaponNudges(weaponKey ?? ''), 'lifeBonus', 0)
  return vitalityLife + lifeBonus
}
