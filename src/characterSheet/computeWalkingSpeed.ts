/**
 * SRD / PHB-style v1 **walking speed** hint in feet (integer). The manual `speed` field stays
 * independent so tables can record swim/fly, magic, or temp effects without auto-overwrite.
 *
 * Limitations: SRD equipment JSON only (no homebrew or non-catalog magic armor quirks), no
 * encumbrance, spells, conditions, or item-based speed; no swim/fly/climb breakdown; class
 * features beyond monk Unarmored Movement and barbarian Fast Movement are omitted; strength
 * for the heavy-armor rule reads `abilities.str.score` only (invalid/missing → 0); unknown or
 * empty `race` defaults to 30 ft base like other sheet defaults; shield/armor slots use the
 * same resolve rules as AC (invalid indices behave as empty).
 */
import { filter, get, keyBy, sumBy, trim } from 'lodash'

import type { CharacterSheetForm } from './defaults'

import equipmentJson from '../data/srd/5e-SRD-Equipment.json'

type RawEquipmentRow = (typeof equipmentJson)[number]

function equipmentIndexKey(entry: RawEquipmentRow): string {
  return trim(String(get(entry, 'index') ?? ''))
}

const EQUIPMENT_BY_INDEX = keyBy(
  filter(equipmentJson as RawEquipmentRow[], (entry) => equipmentIndexKey(entry).length > 0),
  equipmentIndexKey,
)

function isNonShieldBodyArmorRow(row: RawEquipmentRow): boolean {
  return (
    get(row, ['equipment_category', 'index']) === 'armor' &&
    get(row, 'armor_category') !== 'Shield'
  )
}

function isShieldEquipmentRow(row: RawEquipmentRow): boolean {
  return (
    get(row, ['equipment_category', 'index']) === 'armor' &&
    get(row, 'armor_category') === 'Shield'
  )
}

function strengthScoreFromSheet(
  str: CharacterSheetForm['abilities']['str'] | undefined,
): number {
  const scoreStr = trim(String(get(str, 'score') ?? ''))
  if (scoreStr.length > 0) {
    const score = Number(scoreStr)
    if (Number.isFinite(score)) {
      return Math.trunc(score)
    }
  }
  return 0
}

function baseWalkingSpeedFtFromRace(race: CharacterSheetForm['race']): number {
  const r = trim(String(race ?? ''))
  if (r === 'dwarf' || r === 'halfling' || r === 'gnome') {
    return 25
  }
  if (
    r === 'dragonborn' ||
    r === 'elf' ||
    r === 'half_elf' ||
    r === 'half_orc' ||
    r === 'human' ||
    r === 'tiefling'
  ) {
    return 30
  }
  return 30
}

function resolvedBodyArmorRow(
  equippedLoadout: CharacterSheetForm['equippedLoadout'] | undefined,
): RawEquipmentRow | undefined {
  const loadout = equippedLoadout ?? {}
  const armorIdx = trim(String(get(loadout, 'armor') ?? ''))
  if (armorIdx.length === 0) {
    return undefined
  }
  const row = get(EQUIPMENT_BY_INDEX, armorIdx) as RawEquipmentRow | undefined
  if (row === undefined || !isNonShieldBodyArmorRow(row)) {
    return undefined
  }
  return row
}

function hasResolvedShield(
  equippedLoadout: CharacterSheetForm['equippedLoadout'] | undefined,
): boolean {
  const loadout = equippedLoadout ?? {}
  const shieldIdx = trim(String(get(loadout, 'shield') ?? ''))
  if (shieldIdx.length === 0) {
    return false
  }
  const row = get(EQUIPMENT_BY_INDEX, shieldIdx) as RawEquipmentRow | undefined
  return row !== undefined && isShieldEquipmentRow(row)
}

function totalClassLevels(
  classLevels: CharacterSheetForm['classLevels'],
  classKey: string,
): number {
  const k = trim(classKey)
  return sumBy(
    filter(classLevels, (row) => trim(String(get(row, 'class') ?? '')) === k),
    (row) => {
      const lv = Number(get(row, 'level'))
      if (!Number.isFinite(lv) || lv <= 0) {
        return 0
      }
      return Math.trunc(lv)
    },
  )
}

function monkUnarmoredMovementBonusFt(totalMonkLevel: number): number {
  if (totalMonkLevel < 2) {
    return 0
  }
  if (totalMonkLevel <= 5) {
    return 10
  }
  if (totalMonkLevel <= 9) {
    return 15
  }
  if (totalMonkLevel <= 13) {
    return 20
  }
  if (totalMonkLevel <= 17) {
    return 25
  }
  return 30
}

export function computeWalkingSpeed(
  sheet: Pick<
    CharacterSheetForm,
    'race' | 'abilities' | 'equippedLoadout' | 'classLevels'
  >,
): number {
  let speed = baseWalkingSpeedFtFromRace(sheet.race)

  const bodyArmor = resolvedBodyArmorRow(sheet.equippedLoadout)
  const strScore = strengthScoreFromSheet(get(sheet.abilities, 'str'))
  const raceKey = trim(String(sheet.race ?? ''))

  if (raceKey !== 'dwarf' && bodyArmor !== undefined) {
    const category = get(bodyArmor, 'armor_category')
    const strMin = get(bodyArmor, 'str_minimum')
    if (
      category === 'Heavy' &&
      typeof strMin === 'number' &&
      Number.isFinite(strMin) &&
      strMin > 0 &&
      strScore < Math.trunc(strMin)
    ) {
      speed -= 10
    }
  }

  const monkLevels = totalClassLevels(sheet.classLevels, 'monk')
  const hasBodyArmorEquipped = bodyArmor !== undefined
  const shieldEquipped = hasResolvedShield(sheet.equippedLoadout)
  if (!hasBodyArmorEquipped && !shieldEquipped) {
    speed += monkUnarmoredMovementBonusFt(monkLevels)
  }

  const barbarianLevels = totalClassLevels(sheet.classLevels, 'barbarian')
  const wearingHeavyBodyArmor =
    bodyArmor !== undefined && get(bodyArmor, 'armor_category') === 'Heavy'
  if (barbarianLevels >= 5 && !wearingHeavyBodyArmor) {
    speed += 10
  }

  return Math.max(0, Math.trunc(speed))
}
