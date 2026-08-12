import { filter, map, mapValues } from 'lodash'

import type { WeaponCatalog, WeaponDefinition, WeaponNudges, WeaponRarity, WeaponType } from './types'

export const WEAPON_TYPES = ['Sword', 'Axe', 'Wand', 'Bow', 'Spear'] as const satisfies readonly WeaponType[]

export const WEAPON_RARITIES = [
  'Common',
  'Uncommon',
  'Rare',
  'Epic',
  'Legendary',
] as const satisfies readonly WeaponRarity[]

export const WEAPON_RARITY_OFFER_WEIGHT: Record<WeaponRarity, number> = {
  Common: 40,
  Uncommon: 25,
  Rare: 15,
  Epic: 10,
  Legendary: 5,
}

export const WEAPON_RARITY_STRENGTH: Record<WeaponRarity, number> = {
  Common: 1,
  Uncommon: 1.25,
  Rare: 1.5,
  Epic: 1.75,
  Legendary: 2,
}

export const WEAPON_TYPE_EMOJI: Record<WeaponType, string> = {
  Sword: '⚔️',
  Axe: '🪓',
  Wand: '🪄',
  Bow: '🏹',
  Spear: '🔱',
}

export function weaponTypeEmoji(weaponType: WeaponType): string {
  return WEAPON_TYPE_EMOJI[weaponType]
}

export function weaponEmojiForKey(weaponKey: string): string | undefined {
  const weapon = weaponDefinition(weaponKey)
  if (weapon === undefined) {
    return undefined
  }
  return weaponTypeEmoji(weapon.weaponType)
}

export function formatWeaponTypeLabel(weaponType: WeaponType): string {
  return weaponType
}

export function formatWeaponRarityLabel(rarity: WeaponRarity): string {
  return rarity
}

export const WEAPON_CATALOG = {
  steel_longsword: {
    key: 'steel_longsword',
    name: 'Steel Longsword',
    weaponType: 'Sword',
    rarity: 'Common',
    nudges: { damagePotencyPercent: 0.04 },
  },
  knight_blade: {
    key: 'knight_blade',
    name: 'Knight Blade',
    weaponType: 'Sword',
    rarity: 'Rare',
    nudges: { cooldownPercent: -0.04 },
  },
  war_axe: {
    key: 'war_axe',
    name: 'War Axe',
    weaponType: 'Axe',
    rarity: 'Epic',
    nudges: { damagePotencyPercent: 0.06, cooldownPercent: 0.03 },
  },
  stone_maul: {
    key: 'stone_maul',
    name: 'Stone Maul',
    weaponType: 'Axe',
    rarity: 'Uncommon',
    nudges: { damagePotencyPercent: 0.06, cooldownPercent: 0.03 },
  },
  elder_wand: {
    key: 'elder_wand',
    name: 'Elder Wand',
    weaponType: 'Wand',
    rarity: 'Legendary',
    nudges: { cooldownPercent: -0.04, lifeBonus: 2 },
  },
  crystal_staff: {
    key: 'crystal_staff',
    name: 'Crystal Staff',
    weaponType: 'Wand',
    rarity: 'Rare',
    nudges: { cooldownPercent: -0.04, damagePotencyPercent: 0.04 },
  },
  hunters_bow: {
    key: 'hunters_bow',
    name: "Hunter's Bow",
    weaponType: 'Bow',
    rarity: 'Uncommon',
    nudges: { cooldownPercent: -0.04 },
  },
  swift_shortbow: {
    key: 'swift_shortbow',
    name: 'Swift Shortbow',
    weaponType: 'Bow',
    rarity: 'Epic',
    nudges: { cooldownPercent: -0.04, damagePotencyPercent: 0.04 },
  },
  bronze_spear: {
    key: 'bronze_spear',
    name: 'Bronze Spear',
    weaponType: 'Spear',
    rarity: 'Common',
    nudges: { cooldownPercent: -0.04, damagePotencyPercent: 0.03 },
  },
  hoplite_lance: {
    key: 'hoplite_lance',
    name: 'Hoplite Lance',
    weaponType: 'Spear',
    rarity: 'Legendary',
    nudges: { cooldownPercent: -0.04, damagePotencyPercent: 0.03 },
  },
} as const satisfies WeaponCatalog

export type WeaponKey = keyof typeof WEAPON_CATALOG

export const WEAPON_KEYS = map(Object.keys(WEAPON_CATALOG), (key) => key) as WeaponKey[]

export function isWeaponKey(key: string): key is WeaponKey {
  return key in WEAPON_CATALOG
}

export function weaponDefinition(key: string): WeaponDefinition | undefined {
  if (!isWeaponKey(key)) {
    return undefined
  }
  return WEAPON_CATALOG[key]
}

export function weaponsOfType(weaponType: WeaponType): WeaponKey[] {
  return filter(WEAPON_KEYS, (key) => WEAPON_CATALOG[key].weaponType === weaponType)
}

export function weaponsOfRarity(rarity: WeaponRarity): WeaponKey[] {
  return filter(WEAPON_KEYS, (key) => WEAPON_CATALOG[key].rarity === rarity)
}

export function weaponOfferWeight(key: string): number {
  const weapon = weaponDefinition(key)
  if (weapon === undefined) {
    return 0
  }
  return WEAPON_RARITY_OFFER_WEIGHT[weapon.rarity]
}

export function resolveWeaponNudges(key: string): WeaponNudges | undefined {
  const weapon = weaponDefinition(key)
  if (weapon?.nudges === undefined) {
    return undefined
  }
  const strength = WEAPON_RARITY_STRENGTH[weapon.rarity]
  return mapValues(weapon.nudges, (value) => value * strength)
}
