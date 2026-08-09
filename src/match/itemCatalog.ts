import { filter, map } from 'lodash'

import type { God, ItemCatalog } from './types'

export const GODS = [
  'Hermes',
  'Dynamite',
  'Hygieia',
  'Athena',
  'Zeus',
] as const satisfies readonly God[]

export const ITEM_CATALOG = {
  hermes_winged_needle: {
    key: 'hermes_winged_needle',
    name: 'Winged Needle',
    god: 'Hermes',
    effect: 'damage',
    potency: 5,
    cooldownMs: 1_200,
  },
  hermes_dash_cut: {
    key: 'hermes_dash_cut',
    name: 'Dash Cut',
    god: 'Hermes',
    effect: 'damage',
    potency: 7,
    cooldownMs: 1_600,
  },
  hermes_quicksilver_jab: {
    key: 'hermes_quicksilver_jab',
    name: 'Quicksilver Jab',
    god: 'Hermes',
    effect: 'damage',
    potency: 4,
    cooldownMs: 1_000,
  },
  hermes_messengers_sting: {
    key: 'hermes_messengers_sting',
    name: "Messenger's Sting",
    god: 'Hermes',
    effect: 'damage',
    potency: 9,
    cooldownMs: 2_000,
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
      filter: { effectKind: 'damage', weaponType: 'Bow' },
      changes: [{ stat: 'cooldown', mode: 'percent', value: -0.15 }],
    },
  },
  dynamite_fuse_bomb: {
    key: 'dynamite_fuse_bomb',
    name: 'Fuse Bomb',
    god: 'Dynamite',
    effect: 'damage',
    potency: 22,
    cooldownMs: 5_000,
  },
  dynamite_demolition_charge: {
    key: 'dynamite_demolition_charge',
    name: 'Demolition Charge',
    god: 'Dynamite',
    effect: 'damage',
    potency: 28,
    cooldownMs: 6_500,
  },
  dynamite_crater: {
    key: 'dynamite_crater',
    name: 'Crater',
    god: 'Dynamite',
    effect: 'damage',
    potency: 36,
    cooldownMs: 8_000,
  },
  dynamite_ruin: {
    key: 'dynamite_ruin',
    name: 'Ruin',
    god: 'Dynamite',
    effect: 'damage',
    potency: 42,
    cooldownMs: 9_000,
  },
  dynamite_aftershock: {
    key: 'dynamite_aftershock',
    name: 'Aftershock',
    god: 'Dynamite',
    effect: 'damage',
    potency: 20,
    cooldownMs: 5_500,
    passive: {
      seatTarget: 'own',
      filter: { god: 'Dynamite', effectKind: 'damage' },
      changes: [{ stat: 'potency', mode: 'flat', value: 4 }],
    },
  },
  dynamite_scorched_earth: {
    key: 'dynamite_scorched_earth',
    name: 'Scorched Earth',
    god: 'Dynamite',
    passive: {
      seatTarget: 'own',
      filter: { god: 'Dynamite', weaponType: 'Axe' },
      changes: [{ stat: 'potency', mode: 'percent', value: 0.15 }],
    },
  },
  dynamite_slow_burn: {
    key: 'dynamite_slow_burn',
    name: 'Slow Burn',
    god: 'Dynamite',
    passive: {
      seatTarget: 'own',
      filter: 'damage',
      changes: [{ stat: 'potency', mode: 'flat', value: 3 }],
    },
  },
  hygieia_soft_bandage: {
    key: 'hygieia_soft_bandage',
    name: 'Soft Bandage',
    god: 'Hygieia',
    effect: 'heal',
    potency: 7,
    cooldownMs: 2_000,
  },
  hygieia_cleanse_draught: {
    key: 'hygieia_cleanse_draught',
    name: 'Cleanse Draught',
    god: 'Hygieia',
    effect: 'heal',
    potency: 11,
    cooldownMs: 3_000,
  },
  hygieia_field_surgery: {
    key: 'hygieia_field_surgery',
    name: 'Field Surgery',
    god: 'Hygieia',
    effect: 'heal',
    potency: 16,
    cooldownMs: 4_500,
  },
  hygieia_restorative_hymn: {
    key: 'hygieia_restorative_hymn',
    name: 'Restorative Hymn',
    god: 'Hygieia',
    effect: 'heal',
    potency: 22,
    cooldownMs: 6_000,
  },
  hygieia_vital_bloom: {
    key: 'hygieia_vital_bloom',
    name: 'Vital Bloom',
    god: 'Hygieia',
    effect: 'heal',
    potency: 8,
    cooldownMs: 2_500,
    passive: {
      seatTarget: 'own',
      filter: 'heal',
      changes: [{ stat: 'potency', mode: 'flat', value: 3 }],
    },
  },
  hygieia_caduceus_whisper: {
    key: 'hygieia_caduceus_whisper',
    name: 'Caduceus Whisper',
    god: 'Hygieia',
    passive: {
      seatTarget: 'own',
      filter: { god: 'Hygieia' },
      changes: [{ stat: 'cooldown', mode: 'percent', value: -0.25 }],
    },
  },
  hygieia_overflow: {
    key: 'hygieia_overflow',
    name: 'Overflow',
    god: 'Hygieia',
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
  },
  athena_bronze_guard: {
    key: 'athena_bronze_guard',
    name: 'Bronze Guard',
    god: 'Athena',
    effect: 'shield',
    potency: 14,
    cooldownMs: 3_500,
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
    effect: 'shield',
    potency: 27,
    cooldownMs: 7_000,
  },
  athena_reflective_plate: {
    key: 'athena_reflective_plate',
    name: 'Reflective Plate',
    god: 'Athena',
    effect: 'shield',
    potency: 11,
    cooldownMs: 3_500,
    passive: {
      seatTarget: 'own',
      filter: { god: 'Athena', effectKind: 'shield' },
      changes: [{ stat: 'potency', mode: 'flat', value: 3 }],
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
  },
  zeus_chain_bolt: {
    key: 'zeus_chain_bolt',
    name: 'Chain Bolt',
    god: 'Zeus',
    effect: 'damage',
    potency: 12,
    cooldownMs: 3_000,
  },
  zeus_thunderclap: {
    key: 'zeus_thunderclap',
    name: 'Thunderclap',
    god: 'Zeus',
    effect: 'damage',
    potency: 14,
    cooldownMs: 3_500,
  },
  zeus_skyfall: {
    key: 'zeus_skyfall',
    name: 'Skyfall',
    god: 'Zeus',
    effect: 'damage',
    potency: 18,
    cooldownMs: 4_500,
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
      filter: { god: 'Zeus', effectKind: 'damage' },
      changes: [{ stat: 'potency', mode: 'percent', value: 0.1 }],
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
