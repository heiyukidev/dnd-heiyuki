import { clamp, get, isEmpty, merge, omit, trim } from 'lodash'
import type { Doc } from '../../convex/_generated/dataModel'

type ServerSheet = NonNullable<Doc<'sessionCharacters'>['sheet']>

type ClassLevelRow = { class: string; level: number }

export type CharacterSheetForm = Omit<
  ServerSheet,
  'abilities' | 'saves' | 'skills' | 'classLevels'
> & {
  abilities: NonNullable<ServerSheet['abilities']>
  saves: NonNullable<ServerSheet['saves']>
  skills: NonNullable<ServerSheet['skills']>
  classLevels: ClassLevelRow[]
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
  return raw.map((row) => {
    const n = Number(row.level)
    const lvl = clamp(Number.isFinite(n) ? Math.trunc(n) : 1, 1, 20)
    return { class: trim(row.class ?? ''), level: lvl }
  })
}

export function hydrateSheetFromServer(sheet: ServerSheet | null | undefined): CharacterSheetForm {
  const base = createDefaultSheet()
  const merged = merge({}, base, sheet ?? {})
  const rawLegacy = get(sheet, LEGACY_CLASS_AND_LEVEL)
  const legacyTrimmed = typeof rawLegacy === 'string' ? trim(rawLegacy) : ''
  const levelsNorm = normalizeLevelsFromServer(merged.classLevels)
  let classLevels = levelsNorm
  if (isEmpty(classLevels) && legacyTrimmed.length > 0) {
    classLevels = [{ class: legacyTrimmed, level: 1 }]
  }
  return {
    ...omit(merged, [LEGACY_CLASS_AND_LEVEL]),
    classLevels,
  } as CharacterSheetForm
}
