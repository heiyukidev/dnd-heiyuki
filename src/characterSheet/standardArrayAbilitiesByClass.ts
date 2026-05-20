import { assign, every, find, keys, trim } from 'lodash'

import type { PhbClassKey } from '../../convex/characterClasses'
import { resolvePhbClassKey } from '../../convex/characterClasses'

import type { AbilityKey } from './derived/types'
import { ABILITY_KEYS } from './derived/types'
import type { CharacterSheetForm } from './defaults'

/**
 * v1: fixed standard-array allocation per PHB class (before racial bonuses).
 * Fills `abilityBaseScores` only; the derived pipeline applies racial bonuses to displayed scores.
 */
const STANDARD_ARRAY_BY_CLASS: Record<PhbClassKey, Record<AbilityKey, number>> = {
  barbarian: { str: 15, con: 14, dex: 13, wis: 12, cha: 10, int: 8 },
  bard: { cha: 15, dex: 14, con: 13, wis: 12, int: 10, str: 8 },
  cleric: { wis: 15, con: 14, str: 13, dex: 12, cha: 10, int: 8 },
  druid: { wis: 15, con: 14, dex: 13, int: 12, cha: 10, str: 8 },
  fighter: { str: 15, con: 14, dex: 13, wis: 12, cha: 10, int: 8 },
  monk: { dex: 15, wis: 14, con: 13, str: 12, int: 10, cha: 8 },
  paladin: { str: 15, cha: 14, con: 13, dex: 12, wis: 10, int: 8 },
  ranger: { dex: 15, wis: 14, con: 13, str: 12, int: 10, cha: 8 },
  rogue: { dex: 15, con: 14, int: 13, wis: 12, cha: 10, str: 8 },
  sorcerer: { cha: 15, con: 14, dex: 13, wis: 12, int: 10, str: 8 },
  warlock: { cha: 15, con: 14, dex: 13, wis: 12, int: 10, str: 8 },
  wizard: { int: 15, dex: 14, con: 13, wis: 12, cha: 10, str: 8 },
}

const PHB_CLASS_KEYS = keys(STANDARD_ARRAY_BY_CLASS) as PhbClassKey[]

function readBaseScores(
  sheet: Pick<CharacterSheetForm, 'abilityBaseScores'>,
): Partial<Record<AbilityKey, number>> {
  return sheet.abilityBaseScores ?? {}
}

export function baseScoresMatchStandardArrayPreset(
  baseScores: Partial<Record<AbilityKey, number>>,
  classKey: PhbClassKey,
): boolean {
  const preset = STANDARD_ARRAY_BY_CLASS[classKey]
  return every(ABILITY_KEYS, (k) => getBaseScore(baseScores, k) === preset[k])
}

function getBaseScore(
  baseScores: Partial<Record<AbilityKey, number>>,
  k: AbilityKey,
): number | undefined {
  const v = baseScores[k]
  return typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : undefined
}

export function findPhbClassKeyMatchingBaseScoresPreset(
  baseScores: Partial<Record<AbilityKey, number>>,
): PhbClassKey | null {
  const match = find(PHB_CLASS_KEYS, (classKey) =>
    baseScoresMatchStandardArrayPreset(baseScores, classKey),
  )
  return match ?? null
}

export function baseScoresLookUnsetForStandardArrayPreset(
  baseScores: Partial<Record<AbilityKey, number>>,
): boolean {
  return every(ABILITY_KEYS, (k) => getBaseScore(baseScores, k) === undefined)
}

/**
 * When there is exactly one class row with a resolvable PHB key and level ≥ 1, fill
 * `abilityBaseScores` from that class's standard-array preset if every base score is still
 * blank or still matches at least one class preset.
 */
export function maybeApplyStandardArrayAbilitiesToSheet(
  sheet: Pick<CharacterSheetForm, 'classLevels' | 'abilityBaseScores' | 'abilities'>,
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
  const baseScores = readBaseScores(sheet)
  if (baseScoresMatchStandardArrayPreset(baseScores, classKey)) {
    return false
  }
  const blank = baseScoresLookUnsetForStandardArrayPreset(baseScores)
  const matchesSomePreset = findPhbClassKeyMatchingBaseScoresPreset(baseScores) !== null
  if (!blank && !matchesSomePreset) {
    return false
  }
  const preset = STANDARD_ARRAY_BY_CLASS[classKey]
  if (sheet.abilityBaseScores === undefined) {
    sheet.abilityBaseScores = {}
  }
  for (const k of ABILITY_KEYS) {
    assign(sheet.abilityBaseScores, { [k]: preset[k] })
  }
  return true
}

/** @deprecated Use baseScoresMatchStandardArrayPreset — kept for tests migrating off combined scores. */
export function abilitiesMatchStandardArrayPreset(
  abilities: CharacterSheetForm['abilities'],
  classKey: PhbClassKey,
): boolean {
  const preset = STANDARD_ARRAY_BY_CLASS[classKey]
  return every(ABILITY_KEYS, (k) => trim(String(abilities[k]?.score ?? '')) === String(preset[k]))
}

export function abilitiesLookUnsetForStandardArrayPreset(
  abilities: CharacterSheetForm['abilities'],
): boolean {
  return every(ABILITY_KEYS, (k) => {
    const cell = abilities[k]
    return trim(String(cell?.score ?? '')) === '' && trim(String(cell?.mod ?? '')) === ''
  })
}

export function findPhbClassKeyMatchingAbilitiesPreset(
  abilities: CharacterSheetForm['abilities'],
): PhbClassKey | null {
  const match = find(PHB_CLASS_KEYS, (classKey) =>
    abilitiesMatchStandardArrayPreset(abilities, classKey),
  )
  return match ?? null
}
