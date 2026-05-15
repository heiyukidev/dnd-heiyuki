import { clamp, compact, includes, map, omit, trim } from 'lodash'
import { v } from 'convex/values'

import { resolvePhbClassKey } from './characterClasses'
import { isPhbRaceKey, resolvePhbRaceKey } from './characterRaces'

export const EQUIPMENT_CATEGORY_KEYS = [
  'weapon',
  'armor',
  'shield',
  'gear',
  'consumable',
  'other',
] as const

export type EquipmentCategoryKey = (typeof EQUIPMENT_CATEGORY_KEYS)[number]

/** Categories managed as single equipped SRD slots (not the carried-items table). */
export const EQUIPMENT_EQUIP_SLOT_KEYS = ['weapon', 'armor', 'shield', 'gear'] as const

export type EquipmentEquipSlotKey = (typeof EQUIPMENT_EQUIP_SLOT_KEYS)[number]

export function isEquipmentEquipSlotKey(vv: unknown): vv is EquipmentEquipSlotKey {
  return typeof vv === 'string' && includes([...EQUIPMENT_EQUIP_SLOT_KEYS], vv)
}

export const EQUIPMENT_ITEMS_MAX = 200
export const EQUIPMENT_ITEM_ID_MAX = 128
export const EQUIPMENT_ITEM_NAME_MAX = 200
export const EQUIPMENT_ITEM_QTY_MAX = 64
export const EQUIPMENT_ITEM_WEIGHT_MAX = 64
export const EQUIPMENT_ITEM_CATALOG_INDEX_MAX = 128

const CATALOG_INDEX_SLUG_RE = /^[a-z0-9-]+$/

function isValidCatalogIndexSlug(s: string): boolean {
  return (
    s.length > 0 && s.length <= EQUIPMENT_ITEM_CATALOG_INDEX_MAX && CATALOG_INDEX_SLUG_RE.test(s)
  )
}

const equipmentCategoryValidator = v.union(
  v.literal('weapon'),
  v.literal('armor'),
  v.literal('shield'),
  v.literal('gear'),
  v.literal('consumable'),
  v.literal('other'),
)

const equipmentItemValidator = v.object({
  id: v.string(),
  name: v.string(),
  quantity: v.optional(v.string()),
  weightLb: v.optional(v.string()),
  equipped: v.optional(v.boolean()),
  category: v.optional(equipmentCategoryValidator),
  catalogIndex: v.optional(v.string()),
})

const equippedLoadoutValidator = v.object({
  weapon: v.optional(v.string()),
  armor: v.optional(v.string()),
  shield: v.optional(v.string()),
  gear: v.optional(v.string()),
})

export function isEquipmentCategoryKey(vv: unknown): vv is EquipmentCategoryKey {
  return typeof vv === 'string' && includes([...EQUIPMENT_CATEGORY_KEYS], vv)
}

const classLevelEntryValidator = v.object({
  class: v.string(),
  level: v.number(),
})

/** One ability row: typed score and modifier (paper-style; no auto math). */
const abilityRow = v.optional(
  v.object({
    score: v.optional(v.string()),
    mod: v.optional(v.string()),
  }),
)

const saveRow = v.optional(
  v.object({
    mod: v.optional(v.string()),
    prof: v.optional(v.boolean()),
  }),
)

const skillRow = v.optional(
  v.object({
    mod: v.optional(v.string()),
    prof: v.optional(v.boolean()),
  }),
)

const abilitiesShape = {
  str: abilityRow,
  dex: abilityRow,
  con: abilityRow,
  int: abilityRow,
  wis: abilityRow,
  cha: abilityRow,
} as const

const savesShape = {
  str: saveRow,
  dex: saveRow,
  con: saveRow,
  int: saveRow,
  wis: saveRow,
  cha: saveRow,
} as const

const skillsShape = {
  acrobatics: skillRow,
  animalHandling: skillRow,
  arcana: skillRow,
  athletics: skillRow,
  deception: skillRow,
  history: skillRow,
  insight: skillRow,
  intimidation: skillRow,
  investigation: skillRow,
  medicine: skillRow,
  nature: skillRow,
  perception: skillRow,
  performance: skillRow,
  persuasion: skillRow,
  religion: skillRow,
  sleightOfHand: skillRow,
  stealth: skillRow,
  survival: skillRow,
} as const

const abilitiesValidator = v.object(abilitiesShape)
const savesValidator = v.object(savesShape)
const skillsValidator = v.object(skillsShape)

export function sanitizeCharacterSheetForPersist(
  sheet: Record<string, unknown> | undefined | null,
): Record<string, unknown> | undefined {
  if (sheet === undefined || sheet === null) {
    return undefined
  }
  const next = omit(sheet, 'classAndLevel')
  const rawLevels = next.classLevels
  if (rawLevels !== undefined && !Array.isArray(rawLevels)) {
    delete next.classLevels
  }
  if (Array.isArray(rawLevels)) {
    next.classLevels = compact(
      rawLevels.map((entry) => {
        const obj = entry as { class?: unknown; level?: unknown }
        const n = Number(obj.level)
        const lvl = clamp(Number.isFinite(n) ? Math.trunc(n) : 1, 1, 20)
        const resolved = resolvePhbClassKey(String(obj.class ?? ''))
        if (resolved === null) {
          return undefined
        }
        return { class: resolved, level: lvl }
      }),
    )
  }
  const rawRace = next.race
  if (rawRace !== undefined && rawRace !== null) {
    const resolved = resolvePhbRaceKey(String(rawRace))
    if (resolved === null) {
      delete next.race
    } else {
      next.race = resolved
    }
  }
  const rawEquip = next.equipmentItems
  if (rawEquip !== undefined && !Array.isArray(rawEquip)) {
    delete next.equipmentItems
  }
  if (Array.isArray(rawEquip)) {
    next.equipmentItems = compact(
      map(rawEquip, (entry) => {
        if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
          return undefined
        }
        const obj = entry as Record<string, unknown>
        const idRaw = trim(String(obj.id ?? '')).slice(0, EQUIPMENT_ITEM_ID_MAX)
        if (idRaw.length === 0) {
          return undefined
        }
        const nameTrimmed = trim(String(obj.name ?? ''))
        if (nameTrimmed.length === 0) {
          return undefined
        }
        const name = nameTrimmed.slice(0, EQUIPMENT_ITEM_NAME_MAX)
        const qtyRaw = obj.quantity
        const wtRaw = obj.weightLb
        const quantity =
          qtyRaw === undefined || qtyRaw === null
            ? undefined
            : trim(String(qtyRaw)).slice(0, EQUIPMENT_ITEM_QTY_MAX) || undefined
        const weightLb =
          wtRaw === undefined || wtRaw === null
            ? undefined
            : trim(String(wtRaw)).slice(0, EQUIPMENT_ITEM_WEIGHT_MAX) || undefined
        const eq = obj.equipped
        const equipped = eq === true
        const category = isEquipmentCategoryKey(obj.category) ? obj.category : undefined
        const catIdxRaw = obj.catalogIndex
        let catalogIndex: string | undefined
        if (catIdxRaw !== undefined && catIdxRaw !== null) {
          const slug = trim(String(catIdxRaw)).slice(0, EQUIPMENT_ITEM_CATALOG_INDEX_MAX)
          if (isValidCatalogIndexSlug(slug)) {
            catalogIndex = slug
          }
        }
        const row: Record<string, unknown> = { id: idRaw, name, equipped }
        if (quantity !== undefined) {
          row.quantity = quantity
        }
        if (weightLb !== undefined) {
          row.weightLb = weightLb
        }
        if (category !== undefined) {
          row.category = category
        }
        if (catalogIndex !== undefined) {
          row.catalogIndex = catalogIndex
        }
        return row
      }),
    ).slice(0, EQUIPMENT_ITEMS_MAX)
  }
  const rawLoadout = next.equippedLoadout
  if (rawLoadout !== undefined && rawLoadout !== null && typeof rawLoadout === 'object' && !Array.isArray(rawLoadout)) {
    const outLoad: Record<string, string> = {}
    for (const slot of EQUIPMENT_EQUIP_SLOT_KEYS) {
      const slotVal = (rawLoadout as Record<string, unknown>)[slot]
      if (slotVal === undefined || slotVal === null) {
        continue
      }
      const slug = trim(String(slotVal)).slice(0, EQUIPMENT_ITEM_CATALOG_INDEX_MAX)
      if (isValidCatalogIndexSlug(slug)) {
        outLoad[slot] = slug
      }
    }
    if (Object.keys(outLoad).length > 0) {
      next.equippedLoadout = outLoad
    } else {
      delete next.equippedLoadout
    }
  } else if (rawLoadout !== undefined) {
    delete next.equippedLoadout
  }
  return next
}

export function validateCharacterSheetForPersist(sheet: Record<string, unknown> | undefined): void {
  if (sheet === undefined) {
    return
  }
  const levels = sheet.classLevels
  if (levels !== undefined) {
    if (!Array.isArray(levels)) {
      throw new Error('Invalid character sheet')
    }
    for (const row of levels) {
      if (
        row === null ||
        typeof row !== 'object' ||
        typeof row.class !== 'string' ||
        typeof row.level !== 'number' ||
        !Number.isInteger(row.level) ||
        row.level < 1 ||
        row.level > 20
      ) {
        throw new Error('Invalid character sheet')
      }
    }
  }
  const r = sheet.race
  if (r !== undefined && r !== null && String(r).length > 0 && !isPhbRaceKey(String(r))) {
    throw new Error('Invalid character sheet')
  }
  const equip = sheet.equipmentItems
  if (equip !== undefined) {
    if (!Array.isArray(equip)) {
      throw new Error('Invalid character sheet')
    }
    if (equip.length > EQUIPMENT_ITEMS_MAX) {
      throw new Error('Invalid character sheet')
    }
    for (const row of equip) {
      if (row === null || typeof row !== 'object' || Array.isArray(row)) {
        throw new Error('Invalid character sheet')
      }
      const o = row as Record<string, unknown>
      if (typeof o.id !== 'string' || o.id.length === 0 || o.id.length > EQUIPMENT_ITEM_ID_MAX) {
        throw new Error('Invalid character sheet')
      }
      if (
        typeof o.name !== 'string' ||
        o.name.length === 0 ||
        o.name.length > EQUIPMENT_ITEM_NAME_MAX
      ) {
        throw new Error('Invalid character sheet')
      }
      if (o.quantity !== undefined) {
        if (typeof o.quantity !== 'string' || o.quantity.length > EQUIPMENT_ITEM_QTY_MAX) {
          throw new Error('Invalid character sheet')
        }
      }
      if (o.weightLb !== undefined) {
        if (typeof o.weightLb !== 'string' || o.weightLb.length > EQUIPMENT_ITEM_WEIGHT_MAX) {
          throw new Error('Invalid character sheet')
        }
      }
      if (o.equipped !== undefined && typeof o.equipped !== 'boolean') {
        throw new Error('Invalid character sheet')
      }
      if (o.category !== undefined && !isEquipmentCategoryKey(o.category)) {
        throw new Error('Invalid character sheet')
      }
      if (o.catalogIndex !== undefined) {
        if (typeof o.catalogIndex !== 'string' || !isValidCatalogIndexSlug(o.catalogIndex)) {
          throw new Error('Invalid character sheet')
        }
      }
      for (const val of Object.values(o)) {
        if (val !== null && typeof val === 'object') {
          throw new Error('Invalid character sheet')
        }
      }
    }
  }
  const loadout = sheet.equippedLoadout
  if (loadout !== undefined) {
    if (loadout === null || typeof loadout !== 'object' || Array.isArray(loadout)) {
      throw new Error('Invalid character sheet')
    }
    const lo = loadout as Record<string, unknown>
    for (const k of Object.keys(lo)) {
      if (!isEquipmentEquipSlotKey(k)) {
        throw new Error('Invalid character sheet')
      }
    }
    for (const slot of EQUIPMENT_EQUIP_SLOT_KEYS) {
      const slotVal = lo[slot]
      if (slotVal === undefined || slotVal === null) {
        continue
      }
      if (typeof slotVal !== 'string' || !isValidCatalogIndexSlug(slotVal)) {
        throw new Error('Invalid character sheet')
      }
    }
    for (const val of Object.values(lo)) {
      if (val !== null && val !== undefined && typeof val !== 'string') {
        throw new Error('Invalid character sheet')
      }
    }
  }
}

/** Full D&D 5e PHB-style **Character sheet** payload (v1 hybrid: structured header + plain text blocks). */
export const characterSheetValidator = v.object({
  classLevels: v.optional(v.array(classLevelEntryValidator)),
  classAndLevel: v.optional(v.string()),
  background: v.optional(v.string()),
  playerName: v.optional(v.string()),
  race: v.optional(v.string()),
  alignment: v.optional(v.string()),
  experiencePoints: v.optional(v.string()),

  inspiration: v.optional(v.boolean()),
  proficiencyBonus: v.optional(v.string()),
  passivePerception: v.optional(v.string()),

  armorClass: v.optional(v.string()),
  initiative: v.optional(v.string()),
  speed: v.optional(v.string()),

  hitDice: v.optional(v.string()),
  deathSaveSuccess1: v.optional(v.boolean()),
  deathSaveSuccess2: v.optional(v.boolean()),
  deathSaveSuccess3: v.optional(v.boolean()),
  deathSaveFail1: v.optional(v.boolean()),
  deathSaveFail2: v.optional(v.boolean()),
  deathSaveFail3: v.optional(v.boolean()),

  abilities: v.optional(abilitiesValidator),
  saves: v.optional(savesValidator),
  skills: v.optional(skillsValidator),

  proficienciesLanguages: v.optional(v.string()),

  attacksSpellcasting: v.optional(v.string()),
  equipment: v.optional(v.string()),
  equipmentItems: v.optional(v.array(equipmentItemValidator)),
  equippedLoadout: v.optional(equippedLoadoutValidator),
  currencyCp: v.optional(v.string()),
  currencySp: v.optional(v.string()),
  currencyEp: v.optional(v.string()),
  currencyGp: v.optional(v.string()),
  currencyPp: v.optional(v.string()),

  personalityTraits: v.optional(v.string()),
  ideals: v.optional(v.string()),
  bonds: v.optional(v.string()),
  flaws: v.optional(v.string()),

  featuresAndTraits: v.optional(v.string()),

  spellcastingClass: v.optional(v.string()),
  spellSaveDc: v.optional(v.string()),
  spellAttackBonus: v.optional(v.string()),
  cantrips: v.optional(v.string()),
  spellsPrepared: v.optional(v.string()),
  spellSlots: v.optional(v.string()),
})

export const characterSheetPatchValidator = v.object({
  classLevels: v.optional(v.array(classLevelEntryValidator)),
  background: v.optional(v.string()),
  playerName: v.optional(v.string()),
  race: v.optional(v.string()),
  alignment: v.optional(v.string()),
  experiencePoints: v.optional(v.string()),

  inspiration: v.optional(v.boolean()),
  proficiencyBonus: v.optional(v.string()),
  passivePerception: v.optional(v.string()),

  armorClass: v.optional(v.string()),
  initiative: v.optional(v.string()),
  speed: v.optional(v.string()),

  hitDice: v.optional(v.string()),
  deathSaveSuccess1: v.optional(v.boolean()),
  deathSaveSuccess2: v.optional(v.boolean()),
  deathSaveSuccess3: v.optional(v.boolean()),
  deathSaveFail1: v.optional(v.boolean()),
  deathSaveFail2: v.optional(v.boolean()),
  deathSaveFail3: v.optional(v.boolean()),

  abilities: v.optional(abilitiesValidator),
  saves: v.optional(savesValidator),
  skills: v.optional(skillsValidator),

  proficienciesLanguages: v.optional(v.string()),

  attacksSpellcasting: v.optional(v.string()),
  equipment: v.optional(v.string()),
  equipmentItems: v.optional(v.array(equipmentItemValidator)),
  equippedLoadout: v.optional(equippedLoadoutValidator),
  currencyCp: v.optional(v.string()),
  currencySp: v.optional(v.string()),
  currencyEp: v.optional(v.string()),
  currencyGp: v.optional(v.string()),
  currencyPp: v.optional(v.string()),

  personalityTraits: v.optional(v.string()),
  ideals: v.optional(v.string()),
  bonds: v.optional(v.string()),
  flaws: v.optional(v.string()),

  featuresAndTraits: v.optional(v.string()),

  spellcastingClass: v.optional(v.string()),
  spellSaveDc: v.optional(v.string()),
  spellAttackBonus: v.optional(v.string()),
  cantrips: v.optional(v.string()),
  spellsPrepared: v.optional(v.string()),
  spellSlots: v.optional(v.string()),
})
