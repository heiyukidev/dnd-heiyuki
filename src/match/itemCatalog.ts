import { filter, includes, map } from 'lodash'

import type { God, ItemCatalog, WeaponType } from './types'

export const GODS = [
  'Hermes',
  'Ares',
  'Apollo',
  'Athena',
  'Zeus',
] as const satisfies readonly God[]

export const GOD_WEAPON_AFFILIATIONS = {
  Hermes: ['Spear', 'Sword'],
  Ares: ['Axe', 'Sword'],
  Apollo: ['Wand', 'Bow'],
  Athena: ['Axe', 'Spear'],
  Zeus: ['Wand', 'Bow'],
} as const satisfies Readonly<Record<God, readonly [WeaponType, WeaponType]>>

export function isGodAffiliatedWithWeaponType(god: God, weaponType: WeaponType): boolean {
  return includes(GOD_WEAPON_AFFILIATIONS[god], weaponType)
}

export function godsAffiliatedWithWeaponType(weaponType: WeaponType): God[] {
  return filter(GODS, (god) => isGodAffiliatedWithWeaponType(god, weaponType))
}

export const ITEM_CATALOG = {
  hermes_winged_needle: {
    key: 'hermes_winged_needle',
    name: 'Winged Needle',
    god: 'Hermes',
    effect: 'damage',
    potency: 4,
    cooldownMs: 1_000,
    requiredWeaponType: 'Spear',
  },
  hermes_dash_cut: {
    key: 'hermes_dash_cut',
    name: 'Dash Cut',
    god: 'Hermes',
    effect: 'damage',
    potency: 7,
    cooldownMs: 1_600,
    requiredWeaponType: 'Sword',
  },
  hermes_quicksilver_jab: {
    key: 'hermes_quicksilver_jab',
    name: 'Quicksilver Jab',
    god: 'Hermes',
    effect: 'damage',
    potency: 4,
    cooldownMs: 1_200,
  },
  hermes_messengers_sting: {
    key: 'hermes_messengers_sting',
    name: "Messenger's Sting",
    god: 'Hermes',
    passive: {
      seatTarget: 'own',
      filter: 'damage',
      changes: [{ stat: 'cooldown', mode: 'percent', value: -0.1 }],
    },
  },
  hermes_fleet_foot: {
    key: 'hermes_fleet_foot',
    name: 'Fleet Foot',
    god: 'Hermes',
    effect: 'damage',
    potency: 5,
    cooldownMs: 1_500,
    passive: {
      seatTarget: 'own',
      filter: { god: 'Hermes', effectKind: 'damage', weaponType: 'Sword' },
      changes: [{ stat: 'cooldown', mode: 'percent', value: -0.1 }],
    },
  },
  hermes_slipstream: {
    key: 'hermes_slipstream',
    name: 'Slipstream',
    god: 'Hermes',
    passive: {
      seatTarget: 'own',
      filter: { god: 'Hermes' },
      changes: [{ stat: 'cooldown', mode: 'percent', value: -0.18 }],
    },
  },
  hermes_stolen_seconds: {
    key: 'hermes_stolen_seconds',
    name: 'Stolen Seconds',
    god: 'Hermes',
    passive: {
      seatTarget: 'own',
      filter: { effectKind: 'damage', weaponType: 'Spear' },
      changes: [{ stat: 'cooldown', mode: 'percent', value: -0.15 }],
    },
  },
  ares_blood_surge: {
    key: 'ares_blood_surge',
    name: 'Blood Surge',
    god: 'Ares',
    effect: 'damage',
    potency: 22,
    cooldownMs: 5_000,
    requiredWeaponType: 'Axe',
  },
  ares_siege_break: {
    key: 'ares_siege_break',
    name: 'Siege Break',
    god: 'Ares',
    effect: 'damage',
    potency: 28,
    cooldownMs: 6_500,
    requiredWeaponType: 'Sword',
  },
  ares_crushing_blow: {
    key: 'ares_crushing_blow',
    name: 'Crushing Blow',
    god: 'Ares',
    effect: 'damage',
    potency: 30,
    cooldownMs: 8_000,
  },
  ares_war_crush: {
    key: 'ares_war_crush',
    name: 'War Crush',
    god: 'Ares',
    passive: {
      seatTarget: 'own',
      filter: { god: 'Ares' },
      changes: [{ stat: 'cooldown', mode: 'percent', value: -0.15 }],
    },
  },
  ares_bloodlust: {
    key: 'ares_bloodlust',
    name: 'Bloodlust',
    god: 'Ares',
    effect: 'damage',
    potency: 20,
    cooldownMs: 5_500,
    passive: {
      seatTarget: 'own',
      filter: 'damage',
      changes: [{ stat: 'potency', mode: 'percent', value: 0.12 }],
    },
  },
  ares_war_ground: {
    key: 'ares_war_ground',
    name: 'War Ground',
    god: 'Ares',
    passive: {
      seatTarget: 'own',
      filter: { effectKind: 'damage', weaponType: 'Axe' },
      changes: [{ stat: 'cooldown', mode: 'percent', value: -0.12 }],
    },
  },
  ares_rising_fury: {
    key: 'ares_rising_fury',
    name: 'Rising Fury',
    god: 'Ares',
    passive: {
      seatTarget: 'own',
      filter: 'damage',
      changes: [{ stat: 'potency', mode: 'flat', value: 3 }],
    },
  },
  apollo_sun_balm: {
    key: 'apollo_sun_balm',
    name: 'Sun Balm',
    god: 'Apollo',
    effect: 'heal',
    potency: 7,
    cooldownMs: 2_000,
    requiredWeaponType: 'Wand',
  },
  apollo_purifying_light: {
    key: 'apollo_purifying_light',
    name: 'Purifying Light',
    god: 'Apollo',
    effect: 'heal',
    potency: 11,
    cooldownMs: 3_000,
    requiredWeaponType: 'Bow',
  },
  apollo_healers_hand: {
    key: 'apollo_healers_hand',
    name: "Healer's Hand",
    god: 'Apollo',
    effect: 'heal',
    potency: 16,
    cooldownMs: 4_500,
  },
  apollo_paean: {
    key: 'apollo_paean',
    name: 'Paean',
    god: 'Apollo',
    passive: {
      seatTarget: 'own',
      filter: 'heal',
      changes: [{ stat: 'cooldown', mode: 'percent', value: -0.12 }],
    },
  },
  apollo_vital_bloom: {
    key: 'apollo_vital_bloom',
    name: 'Vital Bloom',
    god: 'Apollo',
    effect: 'heal',
    potency: 8,
    cooldownMs: 2_500,
    passive: {
      seatTarget: 'own',
      filter: 'heal',
      changes: [{ stat: 'potency', mode: 'flat', value: 3 }],
    },
  },
  apollo_solar_grace: {
    key: 'apollo_solar_grace',
    name: 'Solar Grace',
    god: 'Apollo',
    passive: {
      seatTarget: 'own',
      filter: { god: 'Apollo' },
      changes: [{ stat: 'cooldown', mode: 'percent', value: -0.25 }],
    },
  },
  apollo_radiant_overflow: {
    key: 'apollo_radiant_overflow',
    name: 'Radiant Overflow',
    god: 'Apollo',
    passive: {
      seatTarget: 'own',
      filter: { effectKind: 'heal', weaponType: 'Wand' },
      changes: [{ stat: 'potency', mode: 'flat', value: 5 }],
    },
  },
  athena_aegis_chip: {
    key: 'athena_aegis_chip',
    name: 'Aegis Chip',
    god: 'Athena',
    effect: 'shield',
    potency: 8,
    cooldownMs: 2_500,
    requiredWeaponType: 'Spear',
  },
  athena_bronze_guard: {
    key: 'athena_bronze_guard',
    name: 'Bronze Guard',
    god: 'Athena',
    effect: 'shield',
    potency: 14,
    cooldownMs: 3_500,
    requiredWeaponType: 'Axe',
  },
  athena_tower_ward: {
    key: 'athena_tower_ward',
    name: 'Tower Ward',
    god: 'Athena',
    effect: 'shield',
    potency: 19,
    cooldownMs: 5_000,
  },
  athena_parthenon: {
    key: 'athena_parthenon',
    name: 'Parthenon',
    god: 'Athena',
    passive: {
      seatTarget: 'own',
      filter: 'shield',
      changes: [{ stat: 'cooldown', mode: 'percent', value: -0.12 }],
    },
  },
  athena_reflective_plate: {
    key: 'athena_reflective_plate',
    name: 'Reflective Plate',
    god: 'Athena',
    effect: 'shield',
    potency: 11,
    cooldownMs: 3_500,
    passive: {
      seatTarget: 'enemy',
      filter: 'damage',
      changes: [{ stat: 'cooldown', mode: 'percent', value: 0.12 }],
    },
  },
  athena_phalanx: {
    key: 'athena_phalanx',
    name: 'Phalanx',
    god: 'Athena',
    passive: {
      seatTarget: 'own',
      filter: { god: 'Athena' },
      changes: [{ stat: 'cooldown', mode: 'percent', value: -0.25 }],
    },
  },
  athena_bastion_doctrine: {
    key: 'athena_bastion_doctrine',
    name: 'Bastion Doctrine',
    god: 'Athena',
    passive: {
      seatTarget: 'own',
      filter: 'shield',
      changes: [{ stat: 'potency', mode: 'flat', value: 5 }],
    },
  },
  zeus_spark_arc: {
    key: 'zeus_spark_arc',
    name: 'Spark Arc',
    god: 'Zeus',
    effect: 'damage',
    potency: 10,
    cooldownMs: 2_500,
    requiredWeaponType: 'Wand',
  },
  zeus_chain_bolt: {
    key: 'zeus_chain_bolt',
    name: 'Chain Bolt',
    god: 'Zeus',
    effect: 'damage',
    potency: 12,
    cooldownMs: 3_000,
    requiredWeaponType: 'Bow',
  },
  zeus_thunderclap: {
    key: 'zeus_thunderclap',
    name: 'Thunderclap',
    god: 'Zeus',
    effect: 'damage',
    potency: 12,
    cooldownMs: 3_500,
  },
  zeus_skyfall: {
    key: 'zeus_skyfall',
    name: 'Skyfall',
    god: 'Zeus',
    passive: {
      seatTarget: 'own',
      filter: 'damage',
      changes: [{ stat: 'potency', mode: 'percent', value: 0.12 }],
    },
  },
  zeus_storm_crown: {
    key: 'zeus_storm_crown',
    name: 'Storm Crown',
    god: 'Zeus',
    effect: 'damage',
    potency: 11,
    cooldownMs: 3_000,
    passive: {
      seatTarget: 'own',
      filter: 'damage',
      changes: [{ stat: 'cooldown', mode: 'percent', value: -0.1 }],
    },
  },
  zeus_olympian_tempo: {
    key: 'zeus_olympian_tempo',
    name: 'Olympian Tempo',
    god: 'Zeus',
    passive: {
      seatTarget: 'own',
      filter: { god: 'Zeus' },
      changes: [{ stat: 'cooldown', mode: 'percent', value: -0.2 }],
    },
  },
  zeus_thunder_tyrant: {
    key: 'zeus_thunder_tyrant',
    name: 'Thunder Tyrant',
    god: 'Zeus',
    passive: {
      seatTarget: 'enemy',
      filter: 'damage',
      changes: [{ stat: 'cooldown', mode: 'percent', value: 0.15 }],
    },
  },
} as const satisfies ItemCatalog

export type ItemKey = keyof typeof ITEM_CATALOG

export const ITEM_KEYS = map(Object.keys(ITEM_CATALOG), (key) => key) as ItemKey[]

export const BOON_CATALOG = ITEM_CATALOG
export type BoonKey = ItemKey
export const BOON_KEYS = ITEM_KEYS

export function boonsForGod(god: God): ItemKey[] {
  return filter(ITEM_KEYS, (key) => ITEM_CATALOG[key].god === god)
}
