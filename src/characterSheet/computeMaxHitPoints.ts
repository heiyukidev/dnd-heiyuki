/**
 * Read-only maximum hit points hint for PHB single-class builds only.
 *
 * Uses max roll on the class hit die at 1st level, then PHB **fixed hit points** for each
 * further level: the die’s **average (rounded up)** from the PHB Hit Points by Class table,
 * plus Constitution modifier each level (not rolled HP at level-up).
 *
 * Limitations (returns null / UI shows em dash appropriately):
 * - Multiclass: per-class level order is not stored, so HP cannot be reconstructed; two or
 *   more classes with positive total levels yields null.
 * - Feats (e.g. Tough), subclasses, items, and other flat HP modifiers are not applied.
 * - Rolled HP at level-up is not modeled—only the PHB fixed-average path.
 * - Class keys outside the PHB v1 roster or invalid level rows are ignored; unusable data
 *   yields null.
 */

import { compact, filter, get, groupBy, map, sumBy, trim } from 'lodash'

import type { PhbClassKey } from '../../convex/characterClasses'
import { resolvePhbClassKey } from '../../convex/characterClasses'

import { dexModifierFromSheet } from './computeArmorClass'
import type { CharacterSheetForm } from './defaults'

const PHB_HIT_DIE_SIDES: Record<PhbClassKey, number> = {
  barbarian: 12,
  bard: 8,
  cleric: 8,
  druid: 8,
  fighter: 10,
  monk: 8,
  paladin: 10,
  ranger: 10,
  rogue: 8,
  sorcerer: 6,
  warlock: 8,
  wizard: 6,
}

type ClassLevelChunk = { classKey: PhbClassKey; level: number }

function normalizedClassLevels(
  classLevels: CharacterSheetForm['classLevels'] | undefined,
): ClassLevelChunk[] {
  if (classLevels === undefined || classLevels.length === 0) {
    return []
  }
  return compact(
    map(classLevels, (row): ClassLevelChunk | null => {
      const resolved = resolvePhbClassKey(trim(String(get(row, 'class') ?? '')))
      if (resolved === null) {
        return null
      }
      const lv = get(row, 'level')
      if (typeof lv !== 'number' || !Number.isFinite(lv)) {
        return null
      }
      const L = Math.trunc(lv)
      if (L < 1 || L > 20) {
        return null
      }
      return { classKey: resolved, level: L }
    }),
  )
}

export function computeMaxHitPoints(
  sheet: Pick<CharacterSheetForm, 'classLevels' | 'abilities'>,
): number | null {
  const normalized = normalizedClassLevels(sheet.classLevels)
  if (normalized.length === 0) {
    return null
  }

  const byClass = groupBy(normalized, 'classKey')
  const summaries = map(byClass, (rows, classKey) => ({
    classKey: classKey as PhbClassKey,
    totalLevel: sumBy(rows, (r) => r.level),
  }))
  const positive = filter(summaries, (s) => s.totalLevel > 0)
  if (positive.length !== 1) {
    return null
  }

  const only = positive[0]!
  /** Cap in case duplicate class rows sum past 20 in the UI. */
  const L = Math.min(20, Math.max(1, only.totalLevel))

  const d = PHB_HIT_DIE_SIDES[only.classKey]

  const conMod = dexModifierFromSheet(get(sheet.abilities, 'con'))
  const avg = Math.ceil((d + 1) / 2)
  const hp = d + conMod + (L - 1) * (avg + conMod)
  return Math.min(99999, Math.max(0, Math.trunc(hp)))
}
