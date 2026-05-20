import { assign, every, trim } from 'lodash'

import type { PhbClassKey } from '../../convex/characterClasses'
import { resolvePhbClassKey } from '../../convex/characterClasses'

import type { CharacterSheetForm } from './defaults'

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const

type AbilityKey = (typeof ABILITY_KEYS)[number]

function modStringFromScore(score: number): string {
  const m = Math.floor((Math.trunc(score) - 10) / 2)
  if (m === 0) {
    return '+0'
  }
  return m > 0 ? `+${m}` : `${m}`
}

function abilityCells(score: number): { score: string; mod: string } {
  return { score: String(score), mod: modStringFromScore(score) }
}

/**
 * v1: fixed standard-array allocation per PHB class (before racial bonuses).
 * Table may edit scores afterward; see `abilitiesLookUnsetForStandardArrayPreset`.
 */
const STANDARD_ARRAY_BY_CLASS: Record<
  PhbClassKey,
  Record<AbilityKey, { score: string; mod: string }>
> = {
  barbarian: {
    str: abilityCells(15),
    con: abilityCells(14),
    dex: abilityCells(13),
    wis: abilityCells(12),
    cha: abilityCells(10),
    int: abilityCells(8),
  },
  bard: {
    cha: abilityCells(15),
    dex: abilityCells(14),
    con: abilityCells(13),
    wis: abilityCells(12),
    int: abilityCells(10),
    str: abilityCells(8),
  },
  cleric: {
    wis: abilityCells(15),
    con: abilityCells(14),
    str: abilityCells(13),
    dex: abilityCells(12),
    cha: abilityCells(10),
    int: abilityCells(8),
  },
  druid: {
    wis: abilityCells(15),
    con: abilityCells(14),
    dex: abilityCells(13),
    int: abilityCells(12),
    cha: abilityCells(10),
    str: abilityCells(8),
  },
  fighter: {
    str: abilityCells(15),
    con: abilityCells(14),
    dex: abilityCells(13),
    wis: abilityCells(12),
    cha: abilityCells(10),
    int: abilityCells(8),
  },
  monk: {
    dex: abilityCells(15),
    wis: abilityCells(14),
    con: abilityCells(13),
    str: abilityCells(12),
    int: abilityCells(10),
    cha: abilityCells(8),
  },
  paladin: {
    str: abilityCells(15),
    cha: abilityCells(14),
    con: abilityCells(13),
    dex: abilityCells(12),
    wis: abilityCells(10),
    int: abilityCells(8),
  },
  ranger: {
    dex: abilityCells(15),
    wis: abilityCells(14),
    con: abilityCells(13),
    str: abilityCells(12),
    int: abilityCells(10),
    cha: abilityCells(8),
  },
  rogue: {
    dex: abilityCells(15),
    con: abilityCells(14),
    int: abilityCells(13),
    wis: abilityCells(12),
    cha: abilityCells(10),
    str: abilityCells(8),
  },
  sorcerer: {
    cha: abilityCells(15),
    con: abilityCells(14),
    dex: abilityCells(13),
    wis: abilityCells(12),
    int: abilityCells(10),
    str: abilityCells(8),
  },
  warlock: {
    cha: abilityCells(15),
    con: abilityCells(14),
    dex: abilityCells(13),
    wis: abilityCells(12),
    int: abilityCells(10),
    str: abilityCells(8),
  },
  wizard: {
    int: abilityCells(15),
    dex: abilityCells(14),
    con: abilityCells(13),
    wis: abilityCells(12),
    cha: abilityCells(10),
    str: abilityCells(8),
  },
}

export function abilitiesLookUnsetForStandardArrayPreset(
  abilities: CharacterSheetForm['abilities'],
): boolean {
  return every(ABILITY_KEYS, (k) => {
    const cell = abilities[k]
    return trim(String(cell?.score ?? '')) === '' && trim(String(cell?.mod ?? '')) === ''
  })
}

/**
 * When there is exactly one class row with a resolvable PHB key and level ≥ 1, and every
 * ability score/mod cell is still blank, fill abilities from the class standard-array preset.
 * @returns whether the sheet was mutated
 */
export function maybeApplyStandardArrayAbilitiesToSheet(
  sheet: Pick<CharacterSheetForm, 'classLevels' | 'abilities'>,
): boolean {
  if (sheet.classLevels.length !== 1) {
    return false
  }
  const row = sheet.classLevels[0]
  if (row === undefined) {
    return false
  }
  const level = Number(row.level)
  if (!Number.isFinite(level) || level < 1) {
    return false
  }
  const classKey = resolvePhbClassKey(String(row.class ?? ''))
  if (classKey === null) {
    return false
  }
  if (!abilitiesLookUnsetForStandardArrayPreset(sheet.abilities)) {
    return false
  }
  const preset = STANDARD_ARRAY_BY_CLASS[classKey]
  for (const k of ABILITY_KEYS) {
    assign(sheet.abilities[k], preset[k])
  }
  return true
}
