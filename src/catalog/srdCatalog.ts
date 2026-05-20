import { compact, concat, filter, get, includes, keyBy, map, sortBy, trim, uniqBy } from 'lodash'

import type { EquipmentCategoryKey } from '../../convex/characterSheetValidators'
import { effectKeysWithDefinitions } from '../characterSheet/effects/effectDefinitions'
import equipmentJson from '../data/srd/5e-SRD-Equipment.json'
import magicItemsJson from '../data/srd/5e-SRD-Magic-Items.json'
import spellsJson from '../data/srd/5e-SRD-Spells.json'

type RawEquipment = (typeof equipmentJson)[number]
type RawMagicItem = (typeof magicItemsJson)[number]
type RawSpell = (typeof spellsJson)[number]

export type SrdCatalogEntry = {
  index: string
  name: string
  kind: 'equipment' | 'magic-item'
  weightLb?: string
  sheetCategory: EquipmentCategoryKey
}

export type SrdSpellCatalogEntry = {
  index: string
  name: string
  level: number
  school: string
  hasEffectDefinition: boolean
}

function formatWeightLb(raw: unknown): string | undefined {
  if (raw === undefined || raw === null) {
    return undefined
  }
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return String(raw)
  }
  const s = trim(String(raw))
  return s.length > 0 ? s : undefined
}

function equipmentSheetCategory(entry: RawEquipment): EquipmentCategoryKey {
  const catIdx = String(get(entry, ['equipment_category', 'index']) ?? '')
  if (catIdx === 'weapon') {
    return 'weapon'
  }
  if (catIdx === 'ammunition') {
    return 'consumable'
  }
  if (catIdx === 'armor') {
    return get(entry, 'armor_category') === 'Shield' ? 'shield' : 'armor'
  }
  return 'gear'
}

function magicFirstDescLine(entry: RawMagicItem): string {
  const d = get(entry, 'desc')
  if (!Array.isArray(d) || d.length === 0) {
    return ''
  }
  return String(d[0] ?? '')
}

function magicSheetCategory(entry: RawMagicItem): EquipmentCategoryKey {
  const catIdx = String(get(entry, ['equipment_category', 'index']) ?? '')
  const catName = String(get(entry, ['equipment_category', 'name']) ?? '').toLowerCase()
  if (
    catIdx === 'ammunition' ||
    catIdx === 'potion' ||
    catIdx === 'scroll' ||
    includes(catIdx, 'consumable') ||
    includes(catName, 'consumable')
  ) {
    return 'consumable'
  }
  if (catIdx === 'weapon') {
    return 'weapon'
  }
  if (catIdx === 'armor') {
    return /\(shield\)/i.test(magicFirstDescLine(entry)) ? 'shield' : 'armor'
  }
  return 'gear'
}

function rawEquipmentEntries(): SrdCatalogEntry[] {
  return compact(
    map(equipmentJson as RawEquipment[], (entry) => {
      const index = trim(String(get(entry, 'index') ?? ''))
      const name = trim(String(get(entry, 'name') ?? ''))
      if (index.length === 0 || name.length === 0) {
        return undefined
      }
      const weightLb = formatWeightLb(get(entry, 'weight'))
      const sheetCategory = equipmentSheetCategory(entry)
      const base: SrdCatalogEntry = {
        index,
        name,
        kind: 'equipment',
        sheetCategory,
      }
      if (weightLb !== undefined) {
        base.weightLb = weightLb
      }
      return base
    }),
  )
}

function rawMagicItemEntries(): SrdCatalogEntry[] {
  return compact(
    map(magicItemsJson as RawMagicItem[], (entry) => {
      const index = trim(String(get(entry, 'index') ?? ''))
      const name = trim(String(get(entry, 'name') ?? ''))
      if (index.length === 0 || name.length === 0) {
        return undefined
      }
      return {
        index,
        name,
        kind: 'magic-item' as const,
        sheetCategory: magicSheetCategory(entry),
      }
    }),
  )
}

export const SRD_CATALOG: SrdCatalogEntry[] = sortBy(
  uniqBy(concat(rawEquipmentEntries(), rawMagicItemEntries()), (e) => e.index),
  [(e) => e.name.toLowerCase(), 'index'],
)

const SRD_CATALOG_BY_INDEX = keyBy(SRD_CATALOG, (e) => e.index)

export function getSrdCatalogEntryByIndex(index: string): SrdCatalogEntry | undefined {
  return SRD_CATALOG_BY_INDEX[index]
}

export function listSrdCatalogForSheetCategory(
  category: EquipmentCategoryKey | undefined,
): SrdCatalogEntry[] {
  if (category === undefined) {
    return SRD_CATALOG
  }
  const list = filter(SRD_CATALOG, (entry) => entry.sheetCategory === category)
  if (list.length === 0) {
    return SRD_CATALOG
  }
  return list
}

/** SRD options for a single equipped slot (strict category match; no fallback). */
export function listSrdCatalogForEquipSlot(
  slot: 'weapon' | 'armor' | 'shield' | 'gear',
): SrdCatalogEntry[] {
  return filter(SRD_CATALOG, (entry) => entry.sheetCategory === slot)
}

/** Carried-table item picker: consumables when that category; otherwise all SRD rows except equip-slot categories. */
export function listSrdCatalogForCarriedItemSelect(
  category: EquipmentCategoryKey | undefined,
): SrdCatalogEntry[] {
  if (category === 'consumable') {
    return filter(SRD_CATALOG, (entry) => entry.sheetCategory === 'consumable')
  }
  return filter(
    SRD_CATALOG,
    (entry) =>
      entry.sheetCategory !== 'weapon' &&
      entry.sheetCategory !== 'armor' &&
      entry.sheetCategory !== 'shield' &&
      entry.sheetCategory !== 'gear',
  )
}

export function searchSrdCatalog(query: string, limit = 20): SrdCatalogEntry[] {
  const q = trim(query).toLowerCase()
  if (q.length === 0) {
    return []
  }
  const capped = limit > 0 ? limit : 20
  return filter(SRD_CATALOG, (entry) => {
    const n = entry.name.toLowerCase()
    const i = entry.index.toLowerCase()
    return includes(n, q) || includes(i, q)
  }).slice(0, capped)
}

const EFFECT_SPELL_KEYS = new Set(effectKeysWithDefinitions())

function rawSpellEntries(): SrdSpellCatalogEntry[] {
  return compact(
    map(spellsJson as RawSpell[], (entry) => {
      const index = trim(String(get(entry, 'index') ?? ''))
      const name = trim(String(get(entry, 'name') ?? ''))
      if (index.length === 0 || name.length === 0) {
        return undefined
      }
      const levelRaw = get(entry, 'level')
      const level =
        typeof levelRaw === 'number' && Number.isFinite(levelRaw) ? Math.trunc(levelRaw) : 0
      const school = trim(
        String(get(entry, ['school', 'name']) ?? get(entry, ['school', 'index']) ?? ''),
      )
      return {
        index,
        name,
        level,
        school,
        hasEffectDefinition: EFFECT_SPELL_KEYS.has(index),
      }
    }),
  )
}

export const SRD_SPELL_CATALOG: SrdSpellCatalogEntry[] = sortBy(rawSpellEntries(), [
  (e) => e.level,
  (e) => e.name.toLowerCase(),
])

const SRD_SPELL_BY_INDEX = keyBy(SRD_SPELL_CATALOG, (e) => e.index)

export function getSrdSpellCatalogEntryByIndex(index: string): SrdSpellCatalogEntry | undefined {
  return SRD_SPELL_BY_INDEX[index]
}

export function listSrdSpellCatalog(): SrdSpellCatalogEntry[] {
  return SRD_SPELL_CATALOG
}

export function listSrdSpellsWithEffectDefinitions(): SrdSpellCatalogEntry[] {
  return filter(SRD_SPELL_CATALOG, (e) => e.hasEffectDefinition)
}
