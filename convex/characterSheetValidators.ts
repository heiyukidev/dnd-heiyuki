import { clamp, omit } from 'lodash'
import { v } from 'convex/values'

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
    return next
  }
  if (Array.isArray(rawLevels)) {
    next.classLevels = rawLevels.map((entry) => {
      const obj = entry as { class?: unknown; level?: unknown }
      const n = Number(obj.level)
      const lvl = clamp(Number.isFinite(n) ? Math.trunc(n) : 1, 1, 20)
      return { class: String(obj.class ?? '').trim(), level: lvl }
    })
  }
  return next
}

export function validateCharacterSheetForPersist(sheet: Record<string, unknown> | undefined): void {
  if (sheet === undefined) {
    return
  }
  const levels = sheet.classLevels
  if (levels === undefined) {
    return
  }
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
