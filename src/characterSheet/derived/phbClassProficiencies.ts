import { includes } from 'lodash'

import type { PhbClassKey } from '../../../convex/characterClasses'

import type { SaveKey, SkillKey } from './types'

export type ClassProficiencyDerived = {
  saves: Partial<Record<SaveKey, boolean>>
  skills: Partial<Record<SkillKey, boolean>>
}

const CLASS_SAVE_PROFICIENCIES: Record<PhbClassKey, SaveKey[]> = {
  barbarian: ['str', 'con'],
  bard: ['dex', 'cha'],
  cleric: ['wis', 'cha'],
  druid: ['int', 'wis'],
  fighter: ['str', 'con'],
  monk: ['str', 'dex'],
  paladin: ['wis', 'cha'],
  ranger: ['str', 'dex'],
  rogue: ['dex', 'int'],
  sorcerer: ['con', 'cha'],
  warlock: ['wis', 'cha'],
  wizard: ['int', 'wis'],
}

/** Fixed skill proficiencies (not “choose N from” lists). */
const CLASS_FIXED_SKILL_PROFICIENCIES: Partial<Record<PhbClassKey, SkillKey[]>> = {
  rogue: ['deception', 'stealth'],
}

export function classProficienciesForSingleClass(classKey: PhbClassKey): ClassProficiencyDerived {
  const saves: Partial<Record<SaveKey, boolean>> = {}
  for (const s of CLASS_SAVE_PROFICIENCIES[classKey]) {
    saves[s] = true
  }
  const skills: Partial<Record<SkillKey, boolean>> = {}
  const fixed = CLASS_FIXED_SKILL_PROFICIENCIES[classKey] ?? []
  for (const sk of fixed) {
    skills[sk] = true
  }
  return { saves, skills }
}

export function isSingleClassKey(classKey: unknown): classKey is PhbClassKey {
  return typeof classKey === 'string' && includes(Object.keys(CLASS_SAVE_PROFICIENCIES), classKey)
}

export function expertiseSlotCount(classKey: PhbClassKey, totalLevel: number): number {
  if (classKey === 'rogue' && totalLevel >= 1) {
    return 2
  }
  if (classKey === 'bard' && totalLevel >= 3) {
    return 2
  }
  return 0
}
