export const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const
export type AbilityKey = (typeof ABILITY_KEYS)[number]

export const SAVE_KEYS = ABILITY_KEYS
export type SaveKey = AbilityKey

export const SKILL_KEYS = [
  'acrobatics',
  'animalHandling',
  'arcana',
  'athletics',
  'deception',
  'history',
  'insight',
  'intimidation',
  'investigation',
  'medicine',
  'nature',
  'perception',
  'performance',
  'persuasion',
  'religion',
  'sleightOfHand',
  'stealth',
  'survival',
] as const
export type SkillKey = (typeof SKILL_KEYS)[number]

export type AbilityScoresMap = Partial<Record<AbilityKey, number>>
export type AbilityOverrideFlags = Partial<Record<AbilityKey, { score?: boolean; mod?: boolean }>>
export type SaveOverrideFlags = Partial<Record<SaveKey, { mod?: boolean }>>
export type SkillOverrideFlags = Partial<Record<SkillKey, { mod?: boolean }>>

export type StatOverrides = {
  armorClass?: boolean
  speed?: boolean
  maxHp?: boolean
  proficiencyBonus?: boolean
  passivePerception?: boolean
  initiative?: boolean
  abilities?: AbilityOverrideFlags
  saves?: SaveOverrideFlags
  skills?: SkillOverrideFlags
}

export type ActiveEffectInstance = {
  id: string
  effectKey: string
  catalogIndex?: string
  startedRound?: number
  endsAtRound?: number | null
}

export type HitDiePoolRow = {
  dieSides: number
  total: number
  spent: number
  poolPin?: boolean
}

export type CharacterStats = {
  hp: number
  maxHp: number
  tempHp?: number
}

export type PipelineContext = {
  previousActiveEffectIds?: readonly string[]
  sessionRound?: number
}

export type PipelineResult = {
  sheet: Record<string, unknown>
  stats: CharacterStats
  tempHpGrant: number
}
