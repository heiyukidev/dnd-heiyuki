import { filter } from 'lodash'

import type { WeaponCatalog, WeaponDefinition, WeaponKey, WeaponType } from './types'

export const WEAPON_TYPES = ['Sword', 'Axe', 'Wand', 'Bow'] as const satisfies readonly WeaponType[]

export const WEAPON_CATALOG = {
  steel_longsword: {
    key: 'steel_longsword',
    name: 'Steel Longsword',
    weaponType: 'Sword',
    nudges: { damagePotencyPercent: 0.05 },
  },
  knight_blade: {
    key: 'knight_blade',
    name: 'Knight Blade',
    weaponType: 'Sword',
    nudges: { cooldownPercent: -0.05 },
  },
  war_axe: {
    key: 'war_axe',
    name: 'War Axe',
    weaponType: 'Axe',
    nudges: { damagePotencyPercent: 0.1, cooldownPercent: 0.08 },
  },
  stone_maul: {
    key: 'stone_maul',
    name: 'Stone Maul',
    weaponType: 'Axe',
    nudges: { damagePotencyPercent: 0.08, cooldownPercent: 0.1 },
  },
  elder_wand: {
    key: 'elder_wand',
    name: 'Elder Wand',
    weaponType: 'Wand',
    nudges: { cooldownPercent: -0.08, lifeBonus: 3 },
  },
  crystal_staff: {
    key: 'crystal_staff',
    name: 'Crystal Staff',
    weaponType: 'Wand',
    nudges: { cooldownPercent: -0.05, damagePotencyPercent: 0.05 },
  },
  hunters_bow: {
    key: 'hunters_bow',
    name: "Hunter's Bow",
    weaponType: 'Bow',
    nudges: { cooldownPercent: -0.1 },
  },
  swift_shortbow: {
    key: 'swift_shortbow',
    name: 'Swift Shortbow',
    weaponType: 'Bow',
    nudges: { cooldownPercent: -0.08, damagePotencyPercent: 0.05 },
  },
} as const satisfies WeaponCatalog

export const WEAPON_KEYS = Object.keys(WEAPON_CATALOG) as WeaponKey[]

export function weaponDefinition(key: string): WeaponDefinition | undefined {
  return WEAPON_CATALOG[key as WeaponKey]
}

export function weaponsOfType(weaponType: WeaponType): WeaponKey[] {
  return filter(WEAPON_KEYS, (key) => WEAPON_CATALOG[key].weaponType === weaponType)
}
