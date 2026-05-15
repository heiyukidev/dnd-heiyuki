import { compact, concat, filter, get, includes, map, sortBy, trim, uniqBy } from 'lodash'

import type { EquipmentCategoryKey } from '../../convex/characterSheetValidators'
import equipmentJson from '../data/srd/5e-SRD-Equipment.json'
import magicItemsJson from '../data/srd/5e-SRD-Magic-Items.json'

type RawEquipment = (typeof equipmentJson)[number]
type RawMagicItem = (typeof magicItemsJson)[number]

export type SrdCatalogEntry = {
  index: string
  name: string
  kind: 'equipment' | 'magic-item'
  weightLb?: string
  sheetCategory: EquipmentCategoryKey
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
