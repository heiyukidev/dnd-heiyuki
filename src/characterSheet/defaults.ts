import { clamp, compact, get, isEmpty, map, merge, omit, trim } from 'lodash'
import type { PhbClassKey } from '../../convex/characterClasses'
import { resolvePhbClassKey } from '../../convex/characterClasses'
import type { PhbRaceKey } from '../../convex/characterRaces'
import { resolvePhbRaceKey } from '../../convex/characterRaces'
import type { Doc } from '../../convex/_generated/dataModel'
import {
  type EquipmentCategoryKey,
  EQUIPMENT_ITEM_CATALOG_INDEX_MAX,
  isEquipmentCategoryKey,
} from '../../convex/characterSheetValidators'

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
}

const LEGACY_CLASS_AND_LEVEL = 'classAndLevel' as const

function blankAbility(): NonNullable<CharacterSheetForm['abilities']>['str'] {
  return { score: '', mod: '' }
}

function blankSave(): NonNullable<CharacterSheetForm['saves']>['str'] {
  return { mod: '', prof: false }
}

function blankSkill(): NonNullable<CharacterSheetForm['skills']>['acrobatics'] {
  return { mod: '', prof: false }
}

export function createDefaultSheet(): CharacterSheetForm {
  return merge({}, {
    classLevels: [],
    background: '',
    playerName: '',
    race: '',
    alignment: '',
    experiencePoints: '',
    inspiration: false,
    proficiencyBonus: '',
    passivePerception: '',
    armorClass: '',
    initiative: '',
    speed: '',
    hitDice: '',
    deathSaveSuccess1: false,
    deathSaveSuccess2: false,
    deathSaveSuccess3: false,
    deathSaveFail1: false,
    deathSaveFail2: false,
    deathSaveFail3: false,
    abilities: {
      str: blankAbility(),
      dex: blankAbility(),
      con: blankAbility(),
      int: blankAbility(),
      wis: blankAbility(),
      cha: blankAbility(),
    },
    saves: {
      str: blankSave(),
      dex: blankSave(),
      con: blankSave(),
      int: blankSave(),
      wis: blankSave(),
      cha: blankSave(),
    },
    skills: {
      acrobatics: blankSkill(),
      animalHandling: blankSkill(),
      arcana: blankSkill(),
      athletics: blankSkill(),
      deception: blankSkill(),
      history: blankSkill(),
      insight: blankSkill(),
      intimidation: blankSkill(),
      investigation: blankSkill(),
      medicine: blankSkill(),
      nature: blankSkill(),
      perception: blankSkill(),
      performance: blankSkill(),
      persuasion: blankSkill(),
      religion: blankSkill(),
      sleightOfHand: blankSkill(),
      stealth: blankSkill(),
      survival: blankSkill(),
    },
    proficienciesLanguages: '',
    attacksSpellcasting: '',
    equipment: '',
    equipmentItems: [],
    currencyCp: '',
    currencySp: '',
    currencyEp: '',
    currencyGp: '',
    currencyPp: '',
    personalityTraits: '',
    ideals: '',
    bonds: '',
    flaws: '',
    featuresAndTraits: '',
    spellcastingClass: '',
    spellSaveDc: '',
    spellAttackBonus: '',
    cantrips: '',
    spellsPrepared: '',
    spellSlots: '',
  } satisfies CharacterSheetForm)
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
  return {
    ...omit(merged, [LEGACY_CLASS_AND_LEVEL]),
    classLevels,
    race: resolvePhbRaceKey(trim(String(merged.race ?? ''))) ?? '',
    equipmentItems: normalizeEquipmentItemsFromServer(get(merged, 'equipmentItems')),
  } as CharacterSheetForm
}
