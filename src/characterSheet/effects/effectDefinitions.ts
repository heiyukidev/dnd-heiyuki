import { filter, get, keyBy, map } from 'lodash'

import effectDefinitionsJson from '../../data/srd/effectDefinitions.json'

export type EffectModifierOp =
  | { op: 'acSet'; base: number; addDexMod?: boolean }
  | { op: 'acFloor'; value: number }
  | { op: 'acBonus'; value: number }
  | { op: 'speedAdjust'; multiply?: number; add?: number }
  | { op: 'maxHpBonus'; value: number }
  | { op: 'saveBonusAll'; value: number }
  | { op: 'skillBonus'; skill: string; value: number }
  | { op: 'initiativeBonus'; value: number }
  | { op: 'abilityModBonus'; ability: string; value: number }
  | { op: 'tempHpGrant'; value: number }

export type EffectDefinition = {
  effectKey: string
  durationRounds: number | null
  modifiers: EffectModifierOp[]
}

const DEFINITIONS = effectDefinitionsJson as EffectDefinition[]

const BY_KEY = keyBy(DEFINITIONS, (d) => d.effectKey)

export function getEffectDefinition(effectKey: string): EffectDefinition | undefined {
  return BY_KEY[effectKey]
}

export function listEffectDefinitions(): EffectDefinition[] {
  return [...DEFINITIONS]
}

export function effectKeysWithDefinitions(): string[] {
  return map(DEFINITIONS, (d) => d.effectKey)
}

export function collectModifiersForActiveEffects(
  activeEffects: readonly { effectKey: string }[],
): EffectModifierOp[] {
  return filter(
    activeEffects.flatMap((inst) => {
      const def = getEffectDefinition(inst.effectKey)
      return def?.modifiers ?? []
    }),
    (op) => get(op, 'op') !== 'tempHpGrant',
  )
}

export function tempHpGrantForEffectKey(effectKey: string): number {
  const def = getEffectDefinition(effectKey)
  if (def === undefined) {
    return 0
  }
  let total = 0
  for (const mod of def.modifiers) {
    if (mod.op === 'tempHpGrant') {
      total += mod.value
    }
  }
  return total
}

export function defaultEndsAtRound(
  startedRound: number,
  durationRounds: number | null,
): number | null {
  if (durationRounds === null || durationRounds === undefined) {
    return null
  }
  if (durationRounds < 1) {
    return startedRound
  }
  return startedRound + durationRounds - 1
}
