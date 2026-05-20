import { filter, get, max as lodashMax } from 'lodash'

import type { SkillKey } from '../derived/types'
import { SKILL_KEYS } from '../derived/types'

export type EffectOpContext = {
  mundaneAc: number
  dexMod: number
  mundaneSpeed: number
  calculatedMaxHp: number | null
  saveMods: Record<string, number>
  skillMods: Record<string, number>
  initiativeMod: number
  abilityMods: Record<string, number>
}

export type EffectOpInput = {
  op: string
  value?: number
  base?: number
  addDexMod?: boolean
  multiply?: number
  add?: number
  skill?: string
  ability?: string
}

export function applyAcEffectOps(
  mundaneAc: number,
  dexMod: number,
  ops: readonly EffectOpInput[],
): number {
  const setFormulas = filter(ops, (o) => o.op === 'acSet')
  let setBest = mundaneAc
  for (const f of setFormulas) {
    const base = typeof f.base === 'number' ? Math.trunc(f.base) : 10
    const dexPart = f.addDexMod === true ? dexMod : 0
    setBest = lodashMax([setBest, base + dexPart]) ?? setBest
  }
  let ac = setBest
  for (const f of filter(ops, (o) => o.op === 'acFloor')) {
    const floorVal = typeof f.value === 'number' ? Math.trunc(f.value) : 0
    ac = lodashMax([ac, floorVal]) ?? ac
  }
  for (const b of filter(ops, (o) => o.op === 'acBonus')) {
    ac += typeof b.value === 'number' ? Math.trunc(b.value) : 0
  }
  return ac
}

export function applySpeedEffectOps(mundaneSpeed: number, ops: readonly EffectOpInput[]): number {
  let speed = mundaneSpeed
  for (const o of filter(ops, (o) => o.op === 'speedAdjust')) {
    if (typeof o.multiply === 'number' && Number.isFinite(o.multiply)) {
      speed = Math.trunc(speed * o.multiply)
    }
    if (typeof o.add === 'number' && Number.isFinite(o.add)) {
      speed += Math.trunc(o.add)
    }
  }
  return Math.max(0, speed)
}

export function applyMaxHpBonus(
  calculatedMaxHp: number | null,
  ops: readonly EffectOpInput[],
): number | null {
  if (calculatedMaxHp === null) {
    return null
  }
  let hp = calculatedMaxHp
  for (const o of filter(ops, (o) => o.op === 'maxHpBonus')) {
    hp += typeof o.value === 'number' ? Math.trunc(o.value) : 0
  }
  return hp
}

export function applySaveBonusAll(
  saveMods: Record<string, number>,
  bonus: number,
): Record<string, number> {
  const out = { ...saveMods }
  for (const k of Object.keys(out)) {
    out[k] = (out[k] ?? 0) + bonus
  }
  return out
}

export function applySkillBonus(
  skillMods: Record<string, number>,
  skill: string,
  bonus: number,
): Record<string, number> {
  if (!SKILL_KEYS.includes(skill as SkillKey)) {
    return skillMods
  }
  const out = { ...skillMods }
  out[skill] = (get(out, skill) ?? 0) + bonus
  return out
}

export function applyInitiativeBonus(initiativeMod: number, bonus: number): number {
  return initiativeMod + bonus
}

export function applyAbilityModBonus(
  abilityMods: Record<string, number>,
  ability: string,
  bonus: number,
): Record<string, number> {
  const out = { ...abilityMods }
  out[ability] = (get(out, ability) ?? 0) + bonus
  return out
}

export function applyAllEffectOpsToContext(
  ctx: EffectOpContext,
  ops: readonly EffectOpInput[],
): EffectOpContext {
  let next = { ...ctx }
  next = {
    ...next,
    mundaneAc: applyAcEffectOps(ctx.mundaneAc, ctx.dexMod, ops),
  }
  next = {
    ...next,
    mundaneSpeed: applySpeedEffectOps(ctx.mundaneSpeed, ops),
  }
  next = {
    ...next,
    calculatedMaxHp: applyMaxHpBonus(ctx.calculatedMaxHp, ops),
  }
  for (const o of filter(ops, (op) => op.op === 'saveBonusAll')) {
    const bonus = typeof o.value === 'number' ? Math.trunc(o.value) : 0
    next = { ...next, saveMods: applySaveBonusAll(next.saveMods, bonus) }
  }
  for (const o of filter(ops, (op) => op.op === 'skillBonus')) {
    const sk = String(o.skill ?? '')
    const bonus = typeof o.value === 'number' ? Math.trunc(o.value) : 0
    next = { ...next, skillMods: applySkillBonus(next.skillMods, sk, bonus) }
  }
  for (const o of filter(ops, (op) => op.op === 'initiativeBonus')) {
    const bonus = typeof o.value === 'number' ? Math.trunc(o.value) : 0
    next = {
      ...next,
      initiativeMod: applyInitiativeBonus(next.initiativeMod, bonus),
    }
  }
  return next
}

export function applyAbilityModBonusOps(
  abilityMods: Record<string, number>,
  ops: readonly EffectOpInput[],
): Record<string, number> {
  let out = { ...abilityMods }
  for (const o of filter(ops, (op) => op.op === 'abilityModBonus')) {
    const ab = String(o.ability ?? '')
    const bonus = typeof o.value === 'number' ? Math.trunc(o.value) : 0
    out = applyAbilityModBonus(out, ab, bonus)
  }
  return out
}
