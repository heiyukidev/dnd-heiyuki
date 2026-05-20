import { filter, get, keyBy, trim } from 'lodash'

import type { CharacterSheetForm } from './defaults'

import equipmentJson from '../data/srd/5e-SRD-Equipment.json'

/** Only mundane SRD rows have structured AC; shield bonus skips magic shields without `armor_class` in JSON (see animated-shield). */
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
    get(row, ['equipment_category', 'index']) === 'armor' && get(row, 'armor_category') !== 'Shield'
  )
}

function isShieldEquipmentRow(row: RawEquipmentRow): boolean {
  return (
    get(row, ['equipment_category', 'index']) === 'armor' && get(row, 'armor_category') === 'Shield'
  )
}

function armorClassBase(row: RawEquipmentRow): number | null {
  const b = get(row, ['armor_class', 'base'])
  if (typeof b !== 'number' || !Number.isFinite(b)) {
    return null
  }
  return Math.trunc(b)
}

function armorDexContribution(row: RawEquipmentRow, dexMod: number): number {
  if (get(row, ['armor_class', 'dex_bonus']) !== true) {
    return 0
  }
  const maxBonus = get(row, ['armor_class', 'max_bonus'])
  if (typeof maxBonus === 'number' && Number.isFinite(maxBonus)) {
    return Math.min(dexMod, Math.trunc(maxBonus))
  }
  return dexMod
}

export function dexModifierFromSheet(
  dex: CharacterSheetForm['abilities']['dex'] | undefined,
): number {
  const modStr = trim(String(get(dex, 'mod') ?? ''))
  if (modStr.length > 0) {
    const parsed = Number(modStr)
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed)
    }
  }
  const scoreStr = trim(String(get(dex, 'score') ?? ''))
  if (scoreStr.length > 0) {
    const score = Number(scoreStr)
    if (Number.isFinite(score)) {
      return Math.floor((Math.trunc(score) - 10) / 2)
    }
  }
  return 0
}

/**
 * SRD v1 AC from equipped armor/shield indices and Dex. Always returns a number (Dex mod defaults to 0).
 * Manual `armorClass` field is separate: UI shows this as a read-only hint so players can override for temp effects without auto-overwrite.
 */
export function computeArmorClass(
  sheet: Pick<CharacterSheetForm, 'equippedLoadout' | 'abilities'>,
): number {
  const dexMod = dexModifierFromSheet(get(sheet.abilities, 'dex'))
  let ac = 10 + dexMod

  const loadout = sheet.equippedLoadout ?? {}
  const armorIdx = trim(String(get(loadout, 'armor') ?? ''))
  if (armorIdx.length > 0) {
    const row = get(EQUIPMENT_BY_INDEX, armorIdx) as RawEquipmentRow | undefined
    if (row !== undefined && isNonShieldBodyArmorRow(row)) {
      const base = armorClassBase(row)
      if (base !== null) {
        ac = base + armorDexContribution(row, dexMod)
      }
    }
  }

  const shieldIdx = trim(String(get(loadout, 'shield') ?? ''))
  if (shieldIdx.length > 0) {
    const row = get(EQUIPMENT_BY_INDEX, shieldIdx) as RawEquipmentRow | undefined
    if (row !== undefined && isShieldEquipmentRow(row)) {
      const bonus = armorClassBase(row)
      if (bonus !== null) {
        ac += bonus
      }
    }
  }

  return ac
}
