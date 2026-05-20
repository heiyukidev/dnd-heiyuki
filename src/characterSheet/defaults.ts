import { clamp, compact, filter, get, includes, isEmpty, map, merge, omit, trim } from 'lodash'
import type { PhbClassKey } from '../../convex/characterClasses'
import { resolvePhbClassKey } from '../../convex/characterClasses'
import type { PhbRaceKey } from '../../convex/characterRaces'
import { resolvePhbRaceKey } from '../../convex/characterRaces'
import type { Doc } from '../../convex/_generated/dataModel'
import { createDefaultConvexSheetPayload } from '../../convex/defaultCharacterSheet'
import {
  type EquipmentCategoryKey,
  type EquipmentEquipSlotKey,
  EQUIPMENT_EQUIP_SLOT_KEYS,
  EQUIPMENT_ITEM_CATALOG_INDEX_MAX,
  isEquipmentCategoryKey,
} from '../../convex/characterSheetValidators'
import { getSrdCatalogEntryByIndex } from '../catalog/srdCatalog'
import { maybeApplyStandardArrayAbilitiesToSheet } from './standardArrayAbilitiesByClass'
import type { AbilityKey } from './derived/types'
import { ABILITY_KEYS } from './derived/types'

type ServerSheet = NonNullable<Doc<'sessionCharacters'>['sheet']>

type ClassLevelRow = { class: PhbClassKey | ''; level: number }

export type CharacterEquipmentRow = {
  id: string
  name: string
  quantity?: string
  weightLb?: string
  equipped?: boolean
  category?: EquipmentCategoryKey
  catalogIndex?: string
}

export type EquippedLoadout = Partial<Record<EquipmentEquipSlotKey, string>>

export type ActiveEffectRow = {
  id: string
  effectKey: string
  catalogIndex?: string
  startedRound?: number
  endsAtRound?: number | null
}

export type HitDiePoolFormRow = {
  dieSides: number
  total: number
  spent: number
  poolPin?: boolean
}

export type StatOverridesForm = NonNullable<ServerSheet['statOverrides']>

export type CharacterSheetForm = Omit<
  ServerSheet,
  'abilities' | 'saves' | 'skills' | 'classLevels' | 'race' | 'equipmentItems'
> & {
  abilities: NonNullable<ServerSheet['abilities']>
  saves: NonNullable<ServerSheet['saves']>
  skills: NonNullable<ServerSheet['skills']>
  classLevels: ClassLevelRow[]
  race: PhbRaceKey | ''
  equipmentItems: CharacterEquipmentRow[]
  equippedLoadout: EquippedLoadout
  armorClass?: number
  speed?: number
  speedNotes?: string
  statOverrides?: StatOverridesForm
  abilityBaseScores?: Partial<Record<AbilityKey, number>>
  racialBonuses?: Partial<Record<AbilityKey, number>>
  activeEffects?: ActiveEffectRow[]
  hitDiePool?: HitDiePoolFormRow[]
}

const LEGACY_CLASS_AND_LEVEL = 'classAndLevel' as const

export function createDefaultSheet(): CharacterSheetForm {
  return merge({}, createDefaultConvexSheetPayload()) as CharacterSheetForm
}

function normalizeLevelsFromServer(raw: ServerSheet['classLevels']): ClassLevelRow[] {
  if (!raw || !Array.isArray(raw)) {
    return []
  }
  return compact(
    map(raw, (row) => {
      const n = Number(row.level)
      const lvl = clamp(Number.isFinite(n) ? Math.trunc(n) : 1, 1, 20)
      const resolved = resolvePhbClassKey(String(row.class ?? ''))
      if (resolved === null) {
        return undefined
      }
      return { class: resolved, level: lvl }
    }),
  )
}

function normalizeCatalogIndex(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) {
    return undefined
  }
  const s = trim(String(raw)).slice(0, EQUIPMENT_ITEM_CATALOG_INDEX_MAX)
  if (s.length === 0 || !/^[a-z0-9-]+$/.test(s)) {
    return undefined
  }
  return s
}

function normalizeEquipmentItemsFromServer(raw: unknown): CharacterEquipmentRow[] {
  if (!raw || !Array.isArray(raw)) {
    return []
  }
  return compact(
    map(raw, (row) => {
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        return undefined
      }
      const id = trim(String(get(row as object, 'id') ?? ''))
      if (!id) {
        return undefined
      }
      const quantityVal = get(row as object, 'quantity')
      const weightVal = get(row as object, 'weightLb')
      const categoryVal = get(row as object, 'category')
      const catalogIdx = normalizeCatalogIndex(get(row as object, 'catalogIndex'))
      const out: CharacterEquipmentRow = {
        id,
        name: String(get(row as object, 'name') ?? ''),
        equipped: get(row as object, 'equipped') === true,
      }
      if (quantityVal !== undefined && quantityVal !== null) {
        out.quantity = String(quantityVal)
      }
      if (weightVal !== undefined && weightVal !== null) {
        out.weightLb = String(weightVal)
      }
      if (isEquipmentCategoryKey(categoryVal)) {
        out.category = categoryVal
      }
      if (catalogIdx !== undefined) {
        out.catalogIndex = catalogIdx
      }
      return out
    }),
  )
}

function pruneInvalidEquippedIndices(loadout: EquippedLoadout): EquippedLoadout {
  const next: EquippedLoadout = {}
  for (const slot of EQUIPMENT_EQUIP_SLOT_KEYS) {
    const idx = loadout[slot]
    if (idx === undefined) {
      continue
    }
    const ent = getSrdCatalogEntryByIndex(idx)
    if (ent !== undefined && ent.sheetCategory === slot) {
      next[slot] = idx
    }
  }
  return next
}

function migrateEquipmentLoadoutAndItems(
  rawLoadout: unknown,
  items: CharacterEquipmentRow[],
): { items: CharacterEquipmentRow[]; equippedLoadout: EquippedLoadout } {
  let working = [...items]
  let loadout: EquippedLoadout = {}

  if (rawLoadout && typeof rawLoadout === 'object' && !Array.isArray(rawLoadout)) {
    for (const slot of EQUIPMENT_EQUIP_SLOT_KEYS) {
      const idx = normalizeCatalogIndex(get(rawLoadout as object, slot))
      if (idx !== undefined) {
        loadout[slot] = idx
      }
    }
  }
  loadout = pruneInvalidEquippedIndices(loadout)

  for (const slot of EQUIPMENT_EQUIP_SLOT_KEYS) {
    if (loadout[slot] !== undefined) {
      continue
    }
    const foundIdx = working.findIndex(
      (r) =>
        r.category === slot &&
        r.catalogIndex !== undefined &&
        trim(String(r.catalogIndex)).length > 0,
    )
    if (foundIdx >= 0) {
      const row = working[foundIdx]!
      loadout[slot] = row.catalogIndex!
      working = filter(working, (_, i) => i !== foundIdx)
    }
  }
  loadout = pruneInvalidEquippedIndices(loadout)

  working = map(working, (row) => {
    if (row.category !== undefined && includes([...EQUIPMENT_EQUIP_SLOT_KEYS], row.category)) {
      return { ...row, category: 'other' as EquipmentCategoryKey }
    }
    return row
  })

  return { items: working, equippedLoadout: loadout }
}

function parseLegacyIntField(raw: unknown): number | undefined {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Math.trunc(raw)
  }
  if (typeof raw === 'string') {
    const s = trim(raw)
    if (s.length === 0) {
      return undefined
    }
    const n = Number(s)
    if (Number.isFinite(n)) {
      return Math.trunc(n)
    }
  }
  return undefined
}

function initAbilityBaseScoresFromCells(form: CharacterSheetForm): void {
  if (form.abilityBaseScores === undefined) {
    form.abilityBaseScores = {}
  }
  for (const k of ABILITY_KEYS) {
    if (form.abilityBaseScores[k] !== undefined) {
      continue
    }
    const scoreStr = trim(String(form.abilities[k]?.score ?? ''))
    if (scoreStr.length === 0) {
      continue
    }
    const n = Number(scoreStr)
    if (Number.isFinite(n)) {
      form.abilityBaseScores[k] = Math.trunc(n)
    }
  }
}

export function hydrateSheetFromServer(sheet: ServerSheet | null | undefined): CharacterSheetForm {
  const base = createDefaultSheet()
  const merged = merge({}, base, sheet ?? {})
  const rawLegacy = get(sheet, LEGACY_CLASS_AND_LEVEL)
  const legacyTrimmed = typeof rawLegacy === 'string' ? trim(rawLegacy) : ''
  const levelsNorm = normalizeLevelsFromServer(merged.classLevels)
  let classLevels = levelsNorm
  if (isEmpty(classLevels) && legacyTrimmed.length > 0) {
    const legacyResolved = resolvePhbClassKey(legacyTrimmed)
    if (legacyResolved !== null) {
      classLevels = [{ class: legacyResolved, level: 1 }]
    }
  }
  const rawItems = normalizeEquipmentItemsFromServer(get(merged, 'equipmentItems'))
  const { items, equippedLoadout } = migrateEquipmentLoadoutAndItems(
    get(merged, 'equippedLoadout'),
    rawItems,
  )
  const form = {
    ...omit(merged, [LEGACY_CLASS_AND_LEVEL]),
    classLevels,
    race: resolvePhbRaceKey(trim(String(merged.race ?? ''))) ?? '',
    equipmentItems: items,
    equippedLoadout,
    armorClass: parseLegacyIntField(get(sheet, 'armorClass') ?? get(merged, 'armorClass')),
    speed: parseLegacyIntField(get(sheet, 'speed') ?? get(merged, 'speed')),
    speedNotes: trim(String(get(merged, 'speedNotes') ?? '')),
    statOverrides: (get(merged, 'statOverrides') ?? {}) as StatOverridesForm,
    abilityBaseScores: (get(merged, 'abilityBaseScores') ?? {}) as Partial<
      Record<AbilityKey, number>
    >,
    racialBonuses: (get(merged, 'racialBonuses') ?? {}) as Partial<Record<AbilityKey, number>>,
    activeEffects: Array.isArray(get(merged, 'activeEffects'))
      ? (get(merged, 'activeEffects') as ActiveEffectRow[])
      : [],
    hitDiePool: Array.isArray(get(merged, 'hitDiePool'))
      ? (get(merged, 'hitDiePool') as HitDiePoolFormRow[])
      : [],
  } as CharacterSheetForm
  initAbilityBaseScoresFromCells(form)
  maybeApplyStandardArrayAbilitiesToSheet(form)
  return form
}

/** Truncate enrolled integer sheet fields before Convex patch (avoids 10.0 float validation quirks). */
export function prepareSheetPatchForConvex(sheet: CharacterSheetForm): CharacterSheetForm {
  const patch = merge({}, sheet)
  if (typeof patch.armorClass === 'number' && Number.isFinite(patch.armorClass)) {
    patch.armorClass = Math.trunc(patch.armorClass)
  }
  if (typeof patch.speed === 'number' && Number.isFinite(patch.speed)) {
    patch.speed = Math.trunc(patch.speed)
  }
  return patch
}
