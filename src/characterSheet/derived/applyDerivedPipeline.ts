import { clamp, get, sumBy, trim } from 'lodash'

import type { PhbClassKey } from '../../../convex/characterClasses'
import { resolvePhbClassKey } from '../../../convex/characterClasses'
import type { PhbRaceKey } from '../../../convex/characterRaces'

import { computeArmorClass } from '../computeArmorClass'
import { computeMaxHitPoints } from '../computeMaxHitPoints'
import { computeWalkingSpeed } from '../computeWalkingSpeed'
import type { CharacterSheetForm } from '../defaults'
import {
  collectModifiersForActiveEffects,
  tempHpGrantForEffectKey,
} from '../effects/effectDefinitions'
import { applyAllEffectOpsToContext, applyAbilityModBonusOps } from '../effects/applyEffectOps'
import {
  classProficienciesForSingleClass,
  expertiseSlotCount,
  isSingleClassKey,
} from './phbClassProficiencies'
import { phbRacialBonusesForRace } from './phbRacialBonuses'
import type {
  AbilityKey,
  AbilityScoresMap,
  ActiveEffectInstance,
  CharacterStats,
  HitDiePoolRow,
  PipelineContext,
  PipelineResult,
  SkillKey,
  StatOverrides,
} from './types'
import { ABILITY_KEYS, SKILL_KEYS } from './types'

const PHB_HIT_DIE_SIDES: Record<PhbClassKey, number> = {
  barbarian: 12,
  bard: 8,
  cleric: 8,
  druid: 8,
  fighter: 10,
  monk: 8,
  paladin: 10,
  ranger: 10,
  rogue: 8,
  sorcerer: 6,
  warlock: 8,
  wizard: 6,
}

const SKILL_ABILITY: Record<SkillKey, AbilityKey> = {
  acrobatics: 'dex',
  animalHandling: 'wis',
  arcana: 'int',
  athletics: 'str',
  deception: 'cha',
  history: 'int',
  insight: 'wis',
  intimidation: 'cha',
  investigation: 'int',
  medicine: 'wis',
  nature: 'int',
  perception: 'wis',
  performance: 'cha',
  persuasion: 'cha',
  religion: 'int',
  sleightOfHand: 'dex',
  stealth: 'dex',
  survival: 'wis',
}

export function modFromScore(score: number): number {
  return Math.floor((Math.trunc(score) - 10) / 2)
}

export function modStringFromNumber(mod: number): string {
  const m = Math.trunc(mod)
  if (m === 0) {
    return '+0'
  }
  return m > 0 ? `+${m}` : `${m}`
}

export function parseModString(raw: unknown): number | null {
  const s = trim(String(raw ?? ''))
  if (s.length === 0) {
    return null
  }
  const n = Number(s)
  if (Number.isFinite(n)) {
    return Math.trunc(n)
  }
  return null
}

function totalCharacterLevel(classLevels: CharacterSheetForm['classLevels']): number {
  return sumBy(classLevels, (row) => {
    const lv = Number(row.level)
    if (!Number.isFinite(lv) || lv < 1) {
      return 0
    }
    return Math.trunc(lv)
  })
}

export function proficiencyBonusFromLevel(totalLevel: number): number {
  const L = clamp(totalLevel, 1, 20)
  if (L <= 4) {
    return 2
  }
  if (L <= 8) {
    return 3
  }
  if (L <= 12) {
    return 4
  }
  if (L <= 16) {
    return 5
  }
  return 6
}

function singleClassInfo(classLevels: CharacterSheetForm['classLevels']): {
  classKey: PhbClassKey
  level: number
} | null {
  if (classLevels.length !== 1) {
    return null
  }
  const row = classLevels[0]
  if (row === undefined) {
    return null
  }
  const resolved = resolvePhbClassKey(String(row.class ?? ''))
  if (resolved === null) {
    return null
  }
  const lv = Number(row.level)
  if (!Number.isFinite(lv) || lv < 1) {
    return null
  }
  return { classKey: resolved, level: Math.trunc(lv) }
}

function readAbilityBaseScores(sheet: Record<string, unknown>): AbilityScoresMap {
  const raw = get(sheet, 'abilityBaseScores') as AbilityScoresMap | undefined
  const out: AbilityScoresMap = {}
  for (const k of ABILITY_KEYS) {
    const v = get(raw, k)
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[k] = Math.trunc(v)
    }
  }
  return out
}

function readRacialBonuses(
  sheet: Record<string, unknown>,
  race: PhbRaceKey | '',
): AbilityScoresMap {
  const derived = phbRacialBonusesForRace(race)
  const raw = get(sheet, 'racialBonuses') as AbilityScoresMap | undefined
  const out: AbilityScoresMap = { ...derived }
  for (const k of ABILITY_KEYS) {
    const v = get(raw, k)
    if (typeof v === 'number' && Number.isFinite(v)) {
      out[k] = Math.trunc(v)
    }
  }
  return out
}

function readStatOverrides(sheet: Record<string, unknown>): StatOverrides {
  const raw = get(sheet, 'statOverrides')
  if (raw === null || raw === undefined || typeof raw !== 'object' || Array.isArray(raw)) {
    return {}
  }
  return raw as StatOverrides
}

function isOverride(overrides: StatOverrides, ...keys: string[]): boolean {
  let cur: unknown = overrides
  for (const k of keys) {
    if (cur === null || cur === undefined || typeof cur !== 'object') {
      return false
    }
    cur = get(cur as object, k)
  }
  return cur === true
}

function readActiveEffects(sheet: Record<string, unknown>): ActiveEffectInstance[] {
  const raw = get(sheet, 'activeEffects')
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.filter(
    (row): row is ActiveEffectInstance =>
      row !== null &&
      typeof row === 'object' &&
      typeof get(row, 'id') === 'string' &&
      typeof get(row, 'effectKey') === 'string',
  )
}

function readHitDiePool(sheet: Record<string, unknown>): HitDiePoolRow[] {
  const raw = get(sheet, 'hitDiePool')
  if (!Array.isArray(raw)) {
    return []
  }
  return raw.filter(
    (row): row is HitDiePoolRow =>
      row !== null &&
      typeof row === 'object' &&
      typeof get(row, 'dieSides') === 'number' &&
      typeof get(row, 'total') === 'number' &&
      typeof get(row, 'spent') === 'number',
  )
}

function syncRacialBonusesOnSheet(sheet: Record<string, unknown>, race: PhbRaceKey | ''): void {
  sheet.racialBonuses = phbRacialBonusesForRace(race)
}

function applyClassProficiencies(sheet: Record<string, unknown>, classKey: PhbClassKey): void {
  const derived = classProficienciesForSingleClass(classKey)
  const saves = get(sheet, 'saves') as Record<
    string,
    { mod?: string; prof?: boolean; profPin?: boolean }
  >
  const skills = get(sheet, 'skills') as Record<
    string,
    { mod?: string; prof?: boolean; profPin?: boolean; expertise?: boolean }
  >
  for (const k of ABILITY_KEYS) {
    const row = get(saves, k)
    if (row === undefined) {
      continue
    }
    if (row.profPin === true) {
      continue
    }
    row.prof = derived.saves[k] === true
  }
  for (const sk of SKILL_KEYS) {
    const row = get(skills, sk)
    if (row === undefined) {
      continue
    }
    if (row.profPin === true) {
      continue
    }
    row.prof = derived.skills[sk] === true
  }
}

function updateHitDiePoolSingleClass(
  sheet: Record<string, unknown>,
  classKey: PhbClassKey,
  level: number,
): void {
  const dieSides = PHB_HIT_DIE_SIDES[classKey]
  const pool = readHitDiePool(sheet)
  const existing = pool.find((r) => r.dieSides === dieSides)
  if (existing !== undefined && existing.poolPin === true) {
    existing.spent = Math.min(existing.spent, existing.total)
    sheet.hitDiePool = pool
    return
  }
  const spent = existing?.spent ?? 0
  sheet.hitDiePool = [{ dieSides, total: level, spent: Math.min(spent, level), poolPin: false }]
}

export function computeTempHpGrantForNewEffects(
  previousIds: readonly string[] | undefined,
  activeEffects: readonly ActiveEffectInstance[],
): number {
  const prev = new Set(previousIds ?? [])
  let grant = 0
  for (const inst of activeEffects) {
    if (prev.has(inst.id)) {
      continue
    }
    grant += tempHpGrantForEffectKey(inst.effectKey)
  }
  return grant
}

export function applyDerivedPipeline(
  sheetInput: CharacterSheetForm | Record<string, unknown>,
  statsInput: CharacterStats,
  context: PipelineContext = {},
): PipelineResult {
  const sheet = { ...(sheetInput as Record<string, unknown>) }
  const stats: CharacterStats = {
    hp: statsInput.hp,
    maxHp: statsInput.maxHp,
    tempHp: statsInput.tempHp ?? 0,
  }
  const overrides = readStatOverrides(sheet)
  const race = trim(String(sheet.race ?? '')) as PhbRaceKey | ''
  syncRacialBonusesOnSheet(sheet, race)

  const baseScores = readAbilityBaseScores(sheet)
  const racial = readRacialBonuses(sheet, race)
  const abilities = get(sheet, 'abilities') as Record<string, { score?: string; mod?: string }>

  let abilityMods: Record<string, number> = {}
  for (const k of ABILITY_KEYS) {
    const base = get(baseScores, k) ?? 0
    const racialBonus = get(racial, k) ?? 0
    const effectiveScore = base + racialBonus
    const calculatedMod = modFromScore(effectiveScore)
    abilityMods[k] = calculatedMod
    const row = get(abilities, k) ?? {}
    if (!isOverride(overrides, 'abilities', k, 'score')) {
      row.score = String(effectiveScore)
    }
    if (!isOverride(overrides, 'abilities', k, 'mod')) {
      row.mod = modStringFromNumber(calculatedMod)
    }
    abilities[k] = row
  }
  sheet.abilities = abilities

  const classLevels = (sheet.classLevels ?? []) as CharacterSheetForm['classLevels']
  const single = singleClassInfo(classLevels)
  const totalLevel = totalCharacterLevel(classLevels)
  const profBonus = proficiencyBonusFromLevel(Math.max(1, totalLevel))

  if (single !== null && isSingleClassKey(single.classKey)) {
    applyClassProficiencies(sheet, single.classKey)
    updateHitDiePoolSingleClass(sheet, single.classKey, single.level)
  }

  if (!overrides.proficiencyBonus) {
    sheet.proficiencyBonus = modStringFromNumber(profBonus)
  }

  const activeEffects = readActiveEffects(sheet)
  const effectOps = collectModifiersForActiveEffects(activeEffects)
  abilityMods = applyAbilityModBonusOps(abilityMods, effectOps)
  for (const k of ABILITY_KEYS) {
    const row = get(abilities, k) ?? {}
    if (!isOverride(overrides, 'abilities', k, 'mod')) {
      row.mod = modStringFromNumber(abilityMods[k] ?? 0)
    }
    abilities[k] = row
  }
  sheet.abilities = abilities

  const dexMod = abilityMods.dex ?? 0
  const saves = get(sheet, 'saves') as Record<
    string,
    { mod?: string; prof?: boolean; profPin?: boolean }
  >
  const saveMods: Record<string, number> = {}
  for (const k of ABILITY_KEYS) {
    const row = get(saves, k) ?? {}
    const abMod = abilityMods[k] ?? 0
    let mod = abMod
    if (row.prof === true) {
      mod += profBonus
    }
    saveMods[k] = mod
    if (!isOverride(overrides, 'saves', k, 'mod')) {
      row.mod = modStringFromNumber(mod)
    }
    saves[k] = row
  }
  sheet.saves = saves

  const skills = get(sheet, 'skills') as Record<
    string,
    { mod?: string; prof?: boolean; profPin?: boolean; expertise?: boolean }
  >
  const skillMods: Record<string, number> = {}
  for (const sk of SKILL_KEYS) {
    const row = get(skills, sk) ?? {}
    const abKey = SKILL_ABILITY[sk]
    let mod = abilityMods[abKey] ?? 0
    if (row.prof === true) {
      mod += profBonus
    }
    if (row.expertise === true && row.prof === true) {
      mod += profBonus
    }
    skillMods[sk] = mod
    if (!isOverride(overrides, 'skills', sk, 'mod')) {
      row.mod = modStringFromNumber(mod)
    }
    skills[sk] = row
  }
  sheet.skills = skills

  let initiativeMod = dexMod
  if (!overrides.initiative) {
    sheet.initiative = modStringFromNumber(initiativeMod)
  } else {
    const parsed = parseModString(sheet.initiative)
    if (parsed !== null) {
      initiativeMod = parsed
    }
  }

  const formLike = sheet as unknown as CharacterSheetForm
  const mundaneAc = computeArmorClass(formLike)
  const mundaneSpeed = computeWalkingSpeed(formLike)
  const calculatedMaxHp = computeMaxHitPoints(formLike)

  const effectCtx = applyAllEffectOpsToContext(
    {
      mundaneAc,
      dexMod,
      mundaneSpeed,
      calculatedMaxHp,
      saveMods,
      skillMods,
      initiativeMod,
      abilityMods,
    },
    effectOps,
  )

  if (!overrides.armorClass) {
    sheet.armorClass = effectCtx.mundaneAc
  }
  if (!overrides.speed) {
    sheet.speed = effectCtx.mundaneSpeed
  }

  for (const k of ABILITY_KEYS) {
    const row = get(saves, k)
    if (row !== undefined && !isOverride(overrides, 'saves', k, 'mod')) {
      row.mod = modStringFromNumber(effectCtx.saveMods[k] ?? 0)
    }
  }
  for (const sk of SKILL_KEYS) {
    const row = get(skills, sk)
    if (row !== undefined && !isOverride(overrides, 'skills', sk, 'mod')) {
      row.mod = modStringFromNumber(effectCtx.skillMods[sk] ?? 0)
    }
  }
  if (!overrides.initiative) {
    sheet.initiative = modStringFromNumber(effectCtx.initiativeMod)
  }

  let passiveMod = effectCtx.skillMods.perception ?? 0
  if (isOverride(overrides, 'skills', 'perception', 'mod')) {
    const pinned = parseModString(get(skills, 'perception')?.mod)
    if (pinned !== null) {
      passiveMod = pinned
    }
  }
  const passiveAfter = 10 + passiveMod
  if (!overrides.passivePerception) {
    sheet.passivePerception = String(passiveAfter)
  }

  if (effectCtx.calculatedMaxHp !== null && !overrides.maxHp) {
    stats.maxHp = effectCtx.calculatedMaxHp
  }
  if (stats.hp > stats.maxHp) {
    stats.hp = stats.maxHp
  }

  const tempHpGrant = computeTempHpGrantForNewEffects(
    context.previousActiveEffectIds,
    activeEffects,
  )
  if (tempHpGrant > 0) {
    stats.tempHp = (stats.tempHp ?? 0) + tempHpGrant
  }

  return { sheet, stats, tempHpGrant }
}

export function expertiseSlotsForSheet(
  sheet: CharacterSheetForm | Record<string, unknown>,
): number {
  const single = singleClassInfo(
    (get(sheet, 'classLevels') ?? []) as CharacterSheetForm['classLevels'],
  )
  if (single === null) {
    return 0
  }
  return expertiseSlotCount(single.classKey, single.level)
}

export function expireActiveEffectsForRound(
  activeEffects: ActiveEffectInstance[],
  newRound: number,
): ActiveEffectInstance[] {
  return activeEffects.filter((inst) => {
    if (inst.endsAtRound === undefined || inst.endsAtRound === null) {
      return true
    }
    return inst.endsAtRound >= newRound
  })
}

export { defaultEndsAtRound, getEffectDefinition } from '../effects/effectDefinitions'
