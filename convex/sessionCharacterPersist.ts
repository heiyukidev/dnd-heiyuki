import { omit } from 'lodash'
import type { Doc, Id } from './_generated/dataModel'
import type { MutationCtx } from './_generated/server'
import {
  sanitizeCharacterSheetForPersist,
  validateCharacterSheetForPersist,
} from './characterSheetValidators'

export function sessionCharacterIsPlayable(
  c: Pick<Doc<'sessionCharacters'>, 'isPlayable' | 'isNpc'>,
): boolean {
  if (c.isPlayable !== undefined) {
    return c.isPlayable
  }
  if (c.isNpc !== undefined) {
    return !c.isNpc
  }
  return false
}

export function canonicalSessionCharacterDocument(
  c: Doc<'sessionCharacters'>,
): Omit<Doc<'sessionCharacters'>, '_id' | '_creationTime'> {
  let sheetOut: Doc<'sessionCharacters'>['sheet'] | undefined
  if (c.sheet !== undefined) {
    const sanitized = sanitizeCharacterSheetForPersist(c.sheet as Record<string, unknown>)
    validateCharacterSheetForPersist(sanitized)
    sheetOut = sanitized as Doc<'sessionCharacters'>['sheet']
  }
  return {
    sessionId: c.sessionId,
    name: c.name,
    isPlayable: sessionCharacterIsPlayable(c),
    stats: c.stats,
    ...(c.sheetRevision !== undefined ? { sheetRevision: c.sheetRevision } : {}),
    ...(c.boundClerkUserId !== undefined ? { boundClerkUserId: c.boundClerkUserId } : {}),
    ...(isPlacedCharacter(c) ? { mapCol: c.mapCol, mapRow: c.mapRow } : {}),
    ...(sheetOut !== undefined ? { sheet: sheetOut } : {}),
  }
}

export function isPlacedCharacter(c: Pick<Doc<'sessionCharacters'>, 'mapCol' | 'mapRow'>): boolean {
  return c.mapCol !== undefined && c.mapRow !== undefined
}

/** Full replace so legacy fields (`characterClassKey`, `isNpc`) are removed from storage. */
export async function canonicalSessionCharacterReplace(
  ctx: MutationCtx,
  c: Doc<'sessionCharacters'>,
): Promise<void> {
  await ctx.db.replace(c._id, canonicalSessionCharacterDocument(c))
}

/** Merge partial updates then replace with a canonical document (no stray legacy keys). */
export async function patchSessionCharacterCanonical(
  ctx: MutationCtx,
  characterId: Id<'sessionCharacters'>,
  updates: Partial<
    Pick<
      Doc<'sessionCharacters'>,
      | 'name'
      | 'stats'
      | 'sheet'
      | 'boundClerkUserId'
      | 'mapCol'
      | 'mapRow'
      | 'isPlayable'
      | 'sheetRevision'
    >
  >,
): Promise<void> {
  const character = await ctx.db.get(characterId)
  if (character === null) {
    throw new Error('Character not found')
  }
  const merged = { ...character, ...omit(updates, ['isPlayable']) } as Doc<'sessionCharacters'>
  if (updates.isPlayable !== undefined) {
    merged.isPlayable = updates.isPlayable
  }
  await canonicalSessionCharacterReplace(ctx, merged)
}
