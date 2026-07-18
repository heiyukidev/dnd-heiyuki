import type { ItemCatalog } from './types'

export const ITEM_CATALOG = {
  spark: {
    key: 'spark',
    name: 'Spark',
    effect: 'damage',
    potency: 8,
    cooldownMs: 2_000,
  },
  cannon: {
    key: 'cannon',
    name: 'Cannon',
    effect: 'damage',
    potency: 18,
    cooldownMs: 4_500,
  },
  salve: {
    key: 'salve',
    name: 'Salve',
    effect: 'heal',
    potency: 6,
    cooldownMs: 2_500,
  },
  mend: {
    key: 'mend',
    name: 'Mend',
    effect: 'heal',
    potency: 14,
    cooldownMs: 5_000,
  },
  ward: {
    key: 'ward',
    name: 'Ward',
    effect: 'shield',
    potency: 8,
    cooldownMs: 3_000,
  },
  bulwark: {
    key: 'bulwark',
    name: 'Bulwark',
    effect: 'shield',
    potency: 16,
    cooldownMs: 5_500,
  },
  haste_charm: {
    key: 'haste_charm',
    name: 'Haste Charm',
    passive: {
      seatTarget: 'own',
      filter: 'damage',
      changes: [{ stat: 'cooldown', mode: 'percent', value: -0.2 }],
    },
  },
  vital_spark: {
    key: 'vital_spark',
    name: 'Vital Spark',
    effect: 'heal',
    potency: 5,
    cooldownMs: 3_000,
    passive: {
      seatTarget: 'own',
      filter: 'heal',
      changes: [{ stat: 'potency', mode: 'flat', value: 2 }],
    },
  },
} as const satisfies ItemCatalog

export type ItemKey = keyof typeof ITEM_CATALOG

export const ITEM_KEYS = [
  'spark',
  'cannon',
  'salve',
  'mend',
  'ward',
  'bulwark',
  'haste_charm',
  'vital_spark',
] as const satisfies readonly ItemKey[]
