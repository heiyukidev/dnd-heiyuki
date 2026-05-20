import { filter, find, flatten, includes, map, merge, omit, orderBy, sortBy, times } from 'lodash'
import { v } from 'convex/values'
import { CHARACTER_CLASS_OPTIONS, resolvePhbClassKey } from './characterClasses'
import {
  characterSheetPatchValidator,
  sanitizeCharacterSheetForPersist,
  validateCharacterSheetForPersist,
} from './characterSheetValidators'
import { createDefaultConvexSheetPayload } from './defaultCharacterSheet'
import {
  canonicalSessionCharacterDocument,
  canonicalSessionCharacterReplace,
  isPlacedCharacter,
  patchSessionCharacterCanonical,
  sessionCharacterIsPlayable,
} from './sessionCharacterPersist'
import type { Doc, Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx, type QueryCtx } from './_generated/server'

export { sessionCharacterIsPlayable } from './sessionCharacterPersist'

type SessionReadCtx = QueryCtx | MutationCtx

export const DEFAULT_MAP_COLS = 8
export const DEFAULT_MAP_ROWS = 6
export const MAP_COL_MIN = 1
export const MAP_COL_MAX = 24
export const MAP_ROW_MIN = 1
export const MAP_ROW_MAX = 24

function randomJoinTokenHex(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

async function requireIdentitySubject(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> }
}): Promise<string> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error('Unauthorized')
  }
  return identity.subject
}

function sessionFootprint(session: Pick<Doc<'sessions'>, 'mapCols' | 'mapRows'>) {
  return {
    cols: session.mapCols ?? DEFAULT_MAP_COLS,
    rows: session.mapRows ?? DEFAULT_MAP_ROWS,
  }
}

export function findFirstEmptyHex(
  mapCols: number,
  mapRows: number,
  placedCharacters: readonly Pick<Doc<'sessionCharacters'>, 'mapCol' | 'mapRow'>[],
): { col: number; row: number } | null {
  const coords = filter(
    placedCharacters,
    (p): p is Doc<'sessionCharacters'> & { mapCol: number; mapRow: number } =>
      p.mapCol !== undefined && p.mapRow !== undefined,
  )
  const occupied = new Set(map(coords, (p) => `${p.mapCol},${p.mapRow}`))
  const order = flatten(times(mapRows, (row) => times(mapCols, (col) => ({ col, row }))))
  return find(order, (cell) => !occupied.has(`${cell.col},${cell.row}`)) ?? null
}

function classSummaryFromSheet(sheet: Doc<'sessionCharacters'>['sheet']): string | undefined {
  const row = sheet?.classLevels?.[0]
  if (row === undefined) {
    return undefined
  }
  const resolved = resolvePhbClassKey(String(row.class ?? ''))
  if (resolved === null) {
    return undefined
  }
  const hit = find(CHARACTER_CLASS_OPTIONS, (o) => o.key === resolved)
  return hit?.label
}

async function bindSessionCharacterEffects(
  ctx: MutationCtx,
  session: Doc<'sessions'>,
  characterId: Id<'sessionCharacters'>,
) {
  const character = await ctx.db.get(characterId)
  if (character === null || character.sessionId !== session._id) {
    return
  }
  const patch: Partial<Doc<'sessionCharacters'>> = {}
  if (!sessionCharacterIsPlayable(character)) {
    patch.isPlayable = true
  }
  if (!isPlacedCharacter(character)) {
    const chars = await ctx.db
      .query('sessionCharacters')
      .withIndex('by_session', (q) => q.eq('sessionId', session._id))
      .collect()
    const { cols, rows } = sessionFootprint(session)
    const spot = findFirstEmptyHex(cols, rows, chars)
    if (spot !== null) {
      patch.mapCol = spot.col
      patch.mapRow = spot.row
    }
  }
  if (Object.keys(patch).length > 0) {
    const merged = { ...character, ...patch } as Doc<'sessionCharacters'>
    await canonicalSessionCharacterReplace(ctx, merged)
  }
}

async function writeCharacterWithoutPlacement(ctx: MutationCtx, c: Doc<'sessionCharacters'>) {
  const doc = canonicalSessionCharacterDocument(c)
  await ctx.db.replace(c._id, {
    sessionId: doc.sessionId,
    name: doc.name,
    isPlayable: doc.isPlayable,
    stats: doc.stats,
    ...(doc.boundClerkUserId !== undefined ? { boundClerkUserId: doc.boundClerkUserId } : {}),
    ...(doc.sheet !== undefined ? { sheet: doc.sheet } : {}),
  })
}

async function requireMemberForSession(ctx: SessionReadCtx, sessionId: Id<'sessions'>) {
  const identity = await ctx.auth.getUserIdentity()
  if (identity === null) {
    return null
  }
  const membership = await ctx.db
    .query('sessionMembers')
    .withIndex('by_session_and_clerkUserId', (q) =>
      q.eq('sessionId', sessionId).eq('clerkUserId', identity.subject),
    )
    .unique()
  if (membership === null) {
    return null
  }
  const session = await ctx.db.get(sessionId)
  if (session === null) {
    return null
  }
  return { membership, session }
}

async function requireDmLiveSession(
  ctx: MutationCtx,
  sessionId: Id<'sessions'>,
): Promise<{ session: Doc<'sessions'> }> {
  const clerkUserId = await requireIdentitySubject(ctx)
  const session = await ctx.db.get(sessionId)
  if (session === null || session.dmClerkUserId !== clerkUserId) {
    throw new Error('Forbidden')
  }
  if (session.status !== 'live') {
    throw new Error('Session is not live')
  }
  return { session }
}

async function consolidatePendingJoinRequestsForUser(
  ctx: MutationCtx,
  sessionId: Id<'sessions'>,
  clerkUserId: string,
): Promise<Id<'joinRequests'> | null> {
  const rows = await ctx.db
    .query('joinRequests')
    .withIndex('by_session_and_clerkUserId', (q) =>
      q.eq('sessionId', sessionId).eq('clerkUserId', clerkUserId),
    )
    .collect()
  const pending = filter(rows, (r) => r.status === 'pending')
  if (pending.length === 0) {
    return null
  }
  if (pending.length === 1) {
    return pending[0]._id
  }
  const sorted = sortBy(pending, [(p) => p._creationTime, (p) => String(p._id)])
  const [, ...duplicates] = sorted
  for (const doc of duplicates) {
    const latest = await ctx.db.get(doc._id)
    if (latest !== null) {
      await ctx.db.delete(doc._id)
    }
  }
  return sorted[0]._id
}

export const createSession = mutation({
  args: { title: v.string() },
  handler: async (ctx, { title }) => {
    const clerkUserId = await requireIdentitySubject(ctx)
    const createdAt = Date.now()
    const joinToken = randomJoinTokenHex()
    const sessionId = await ctx.db.insert('sessions', {
      title,
      status: 'live',
      dmClerkUserId: clerkUserId,
      joinToken,
      createdAt,
      mapCols: DEFAULT_MAP_COLS,
      mapRows: DEFAULT_MAP_ROWS,
    })
    await ctx.db.insert('sessionMembers', {
      sessionId,
      clerkUserId,
      role: 'dm',
    })
    return { sessionId, joinToken }
  },
})

export const getSessionByJoinToken = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_joinToken', (q) => q.eq('joinToken', token))
      .unique()
    if (!session) {
      return null
    }
    return {
      _id: session._id,
      title: session.title,
      status: session.status,
    }
  },
})

/** Join link page: session preview plus viewer-specific join/membership state (reactive). */
export const getJoinPageState = query({
  args: { joinToken: v.string() },
  handler: async (ctx, { joinToken }) => {
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_joinToken', (q) => q.eq('joinToken', joinToken))
      .unique()
    if (!session) {
      return { session: null }
    }
    const sessionOut = {
      _id: session._id,
      title: session.title,
      status: session.status,
    }
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) {
      return { session: sessionOut, viewer: { kind: 'signed-out' as const } }
    }
    const membership = await ctx.db
      .query('sessionMembers')
      .withIndex('by_session_and_clerkUserId', (q) =>
        q.eq('sessionId', session._id).eq('clerkUserId', identity.subject),
      )
      .unique()
    if (membership !== null) {
      return {
        session: sessionOut,
        viewer: { kind: 'member' as const, role: membership.role },
      }
    }
    const joinRows = await ctx.db
      .query('joinRequests')
      .withIndex('by_session_and_clerkUserId', (q) =>
        q.eq('sessionId', session._id).eq('clerkUserId', identity.subject),
      )
      .collect()
    const sorted = orderBy(joinRows, [(r) => r.createdAt, (r) => r._creationTime], ['desc', 'desc'])
    const pending = find(sorted, (r) => r.status === 'pending')
    if (pending !== undefined) {
      return {
        session: sessionOut,
        viewer: {
          kind: 'non-member' as const,
          pendingJoin: true,
          rejectedJoin: false,
        },
      }
    }
    const latest = sorted[0]
    const rejectedJoin = latest !== undefined && latest.status === 'rejected'
    return {
      session: sessionOut,
      viewer: {
        kind: 'non-member' as const,
        pendingJoin: false,
        rejectedJoin,
      },
    }
  },
})

export const requestJoin = mutation({
  args: { joinToken: v.string() },
  handler: async (ctx, { joinToken }) => {
    const clerkUserId = await requireIdentitySubject(ctx)
    const session = await ctx.db
      .query('sessions')
      .withIndex('by_joinToken', (q) => q.eq('joinToken', joinToken))
      .unique()
    if (!session) {
      throw new Error('Session not found')
    }
    if (session.status !== 'live') {
      throw new Error('Session is not accepting join requests')
    }

    const existingMember = await ctx.db
      .query('sessionMembers')
      .withIndex('by_session_and_clerkUserId', (q) =>
        q.eq('sessionId', session._id).eq('clerkUserId', clerkUserId),
      )
      .unique()
    if (existingMember) {
      return { status: 'already_member' as const }
    }

    const existingPendingId = await consolidatePendingJoinRequestsForUser(
      ctx,
      session._id,
      clerkUserId,
    )
    if (existingPendingId !== null) {
      return { status: 'already_pending' as const, requestId: existingPendingId }
    }

    await ctx.db.insert('joinRequests', {
      sessionId: session._id,
      clerkUserId,
      status: 'pending',
      createdAt: Date.now(),
    })
    const requestId = await consolidatePendingJoinRequestsForUser(ctx, session._id, clerkUserId)
    if (requestId === null) {
      throw new Error('Failed to create join request')
    }
    return { status: 'created' as const, requestId }
  },
})

export const listJoinRequests = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, { sessionId }) => {
    const clerkUserId = await requireIdentitySubject(ctx)
    const session = await ctx.db.get(sessionId)
    if (!session || session.dmClerkUserId !== clerkUserId) {
      throw new Error('Forbidden')
    }
    return await ctx.db
      .query('joinRequests')
      .withIndex('by_session_and_status', (q) =>
        q.eq('sessionId', sessionId).eq('status', 'pending'),
      )
      .collect()
  },
})

export const approveJoinRequest = mutation({
  args: {
    requestId: v.id('joinRequests'),
    characterId: v.optional(v.id('sessionCharacters')),
  },
  handler: async (ctx, { requestId, characterId }) => {
    const dmClerkUserId = await requireIdentitySubject(ctx)
    const joinRequest = await ctx.db.get(requestId)
    if (!joinRequest || joinRequest.status !== 'pending') {
      throw new Error('Invalid join request')
    }
    const session = await ctx.db.get(joinRequest.sessionId)
    if (!session || session.dmClerkUserId !== dmClerkUserId) {
      throw new Error('Forbidden')
    }
    if (session.status !== 'live') {
      throw new Error('Session is not live')
    }

    if (characterId !== undefined) {
      const character = await ctx.db.get(characterId)
      if (!character || character.sessionId !== session._id) {
        throw new Error('Character does not belong to this session')
      }
      if (
        character.boundClerkUserId !== undefined &&
        character.boundClerkUserId !== joinRequest.clerkUserId
      ) {
        throw new Error('Character is already bound to another user')
      }
      const membersInSession = await ctx.db
        .query('sessionMembers')
        .withIndex('by_session', (q) => q.eq('sessionId', session._id))
        .collect()
      const otherMemberWithCharacter = find(
        membersInSession,
        (m) => m.boundCharacterId === characterId && m.clerkUserId !== joinRequest.clerkUserId,
      )
      if (otherMemberWithCharacter !== undefined) {
        throw new Error('Character is already assigned to another member')
      }
      if (!sessionCharacterIsPlayable(character)) {
        throw new Error('Character is not playable')
      }
    }

    const existingMember = await ctx.db
      .query('sessionMembers')
      .withIndex('by_session_and_clerkUserId', (q) =>
        q.eq('sessionId', session._id).eq('clerkUserId', joinRequest.clerkUserId),
      )
      .unique()
    if (existingMember) {
      throw new Error('User is already a member')
    }

    await ctx.db.patch(requestId, { status: 'approved' })
    await ctx.db.insert('sessionMembers', {
      sessionId: session._id,
      clerkUserId: joinRequest.clerkUserId,
      role: 'player',
      ...(characterId !== undefined ? { boundCharacterId: characterId } : {}),
    })
    if (characterId !== undefined) {
      const boundCharacter = await ctx.db.get(characterId)
      if (boundCharacter !== null) {
        await canonicalSessionCharacterReplace(ctx, {
          ...boundCharacter,
          boundClerkUserId: joinRequest.clerkUserId,
        })
      }
      await bindSessionCharacterEffects(ctx, session, characterId)
    }
    return { ok: true as const }
  },
})

export const rejectJoinRequest = mutation({
  args: { requestId: v.id('joinRequests') },
  handler: async (ctx, { requestId }) => {
    const dmClerkUserId = await requireIdentitySubject(ctx)
    const joinRequest = await ctx.db.get(requestId)
    if (!joinRequest || joinRequest.status !== 'pending') {
      throw new Error('Invalid join request')
    }
    const session = await ctx.db.get(joinRequest.sessionId)
    if (!session || session.dmClerkUserId !== dmClerkUserId) {
      throw new Error('Forbidden')
    }
    if (session.status !== 'live') {
      throw new Error('Session is not live')
    }
    await ctx.db.patch(requestId, { status: 'rejected' })
    return { ok: true as const }
  },
})

export const getMyMembership = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, { sessionId }) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) {
      return { membership: null, session: null }
    }
    const membership = await ctx.db
      .query('sessionMembers')
      .withIndex('by_session_and_clerkUserId', (q) =>
        q.eq('sessionId', sessionId).eq('clerkUserId', identity.subject),
      )
      .unique()
    if (membership === null) {
      return { membership: null, session: null }
    }
    const session = await ctx.db.get(sessionId)
    if (session === null) {
      return { membership: null, session: null }
    }
    const sessionOut = {
      _id: session._id,
      title: session.title,
      status: session.status,
      ...(membership.role === 'dm' ? { joinToken: session.joinToken } : {}),
    }
    return { membership, session: sessionOut }
  },
})

export const listSessionPlayersForDm = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, { sessionId }) => {
    const clerkUserId = await requireIdentitySubject(ctx)
    const session = await ctx.db.get(sessionId)
    if (!session || session.dmClerkUserId !== clerkUserId) {
      throw new Error('Forbidden')
    }
    const members = await ctx.db
      .query('sessionMembers')
      .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
      .collect()
    const players = filter(members, (m) => m.role === 'player')
    const ordered = sortBy(players, [(p) => p._creationTime, (p) => String(p._id)])
    return await Promise.all(
      map(ordered, async (m) => {
        let characterName: string | undefined
        if (m.boundCharacterId !== undefined) {
          const c = await ctx.db.get(m.boundCharacterId)
          characterName = c?.name
        }
        return {
          memberId: m._id,
          clerkUserId: m.clerkUserId,
          sessionNickname: m.sessionNickname,
          boundCharacterId: m.boundCharacterId,
          characterName,
        }
      }),
    )
  },
})

export const listSessionCharactersForDm = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, { sessionId }) => {
    const clerkUserId = await requireIdentitySubject(ctx)
    const session = await ctx.db.get(sessionId)
    if (!session || session.dmClerkUserId !== clerkUserId) {
      throw new Error('Forbidden')
    }
    const chars = await ctx.db
      .query('sessionCharacters')
      .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
      .collect()
    return sortBy(
      map(chars, (c) => ({
        _id: c._id,
        name: c.name,
        isPlayable: sessionCharacterIsPlayable(c),
        classSummary: classSummaryFromSheet(c.sheet),
        boundClerkUserId: c.boundClerkUserId,
        mapCol: c.mapCol,
        mapRow: c.mapRow,
      })),
      [(c) => c.name.toLowerCase(), (c) => String(c._id)],
    )
  },
})

export const setPlayerSessionNickname = mutation({
  args: {
    sessionId: v.id('sessions'),
    playerClerkUserId: v.string(),
    sessionNickname: v.union(v.string(), v.null()),
  },
  handler: async (ctx, { sessionId, playerClerkUserId, sessionNickname }) => {
    const dmClerkUserId = await requireIdentitySubject(ctx)
    const session = await ctx.db.get(sessionId)
    if (!session || session.dmClerkUserId !== dmClerkUserId) {
      throw new Error('Forbidden')
    }
    if (session.status !== 'live') {
      throw new Error('Session is not live')
    }
    const member = await ctx.db
      .query('sessionMembers')
      .withIndex('by_session_and_clerkUserId', (q) =>
        q.eq('sessionId', sessionId).eq('clerkUserId', playerClerkUserId),
      )
      .unique()
    if (!member || member.role !== 'player') {
      throw new Error('Invalid player')
    }
    const trimmed = sessionNickname === null ? '' : sessionNickname.trim()
    if (trimmed.length > 48) {
      throw new Error('Nickname too long')
    }
    if (trimmed === '') {
      await ctx.db.patch(member._id, { sessionNickname: undefined })
    } else {
      await ctx.db.patch(member._id, { sessionNickname: trimmed })
    }
    return { ok: true as const }
  },
})

export const assignPlayerCharacter = mutation({
  args: {
    sessionId: v.id('sessions'),
    playerClerkUserId: v.string(),
    characterId: v.union(v.id('sessionCharacters'), v.null()),
  },
  handler: async (ctx, { sessionId, playerClerkUserId, characterId }) => {
    const dmClerkUserId = await requireIdentitySubject(ctx)
    const session = await ctx.db.get(sessionId)
    if (!session || session.dmClerkUserId !== dmClerkUserId) {
      throw new Error('Forbidden')
    }
    if (session.status !== 'live') {
      throw new Error('Session is not live')
    }
    const member = await ctx.db
      .query('sessionMembers')
      .withIndex('by_session_and_clerkUserId', (q) =>
        q.eq('sessionId', sessionId).eq('clerkUserId', playerClerkUserId),
      )
      .unique()
    if (!member || member.role !== 'player') {
      throw new Error('Invalid player')
    }

    if (characterId === null) {
      if (member.boundCharacterId !== undefined) {
        const oldChar = await ctx.db.get(member.boundCharacterId)
        if (oldChar && oldChar.boundClerkUserId === playerClerkUserId) {
          await ctx.db.patch(member.boundCharacterId, { boundClerkUserId: undefined })
        }
        await ctx.db.patch(member._id, { boundCharacterId: undefined })
      }
      return { ok: true as const }
    }

    const character = await ctx.db.get(characterId)
    if (!character || character.sessionId !== session._id) {
      throw new Error('Character does not belong to this session')
    }
    if (
      character.boundClerkUserId !== undefined &&
      character.boundClerkUserId !== playerClerkUserId
    ) {
      throw new Error('Character is already bound to another user')
    }
    const membersInSession = await ctx.db
      .query('sessionMembers')
      .withIndex('by_session', (q) => q.eq('sessionId', session._id))
      .collect()
    const otherMemberWithCharacter = find(
      membersInSession,
      (m) => m.boundCharacterId === characterId && m.clerkUserId !== playerClerkUserId,
    )
    if (otherMemberWithCharacter !== undefined) {
      throw new Error('Character is already assigned to another member')
    }

    if (member.boundCharacterId !== undefined && member.boundCharacterId !== characterId) {
      const prev = await ctx.db.get(member.boundCharacterId)
      if (prev !== null && prev.boundClerkUserId === playerClerkUserId) {
        await canonicalSessionCharacterReplace(ctx, { ...prev, boundClerkUserId: undefined })
      }
    }

    await ctx.db.patch(member._id, { boundCharacterId: characterId })
    await canonicalSessionCharacterReplace(ctx, {
      ...character,
      boundClerkUserId: playerClerkUserId,
    })
    await bindSessionCharacterEffects(ctx, session, characterId)
    return { ok: true as const }
  },
})

export const createSessionCharacter = mutation({
  args: {
    sessionId: v.id('sessions'),
    name: v.string(),
    isPlayable: v.boolean(),
  },
  handler: async (ctx, { sessionId, name, isPlayable }) => {
    await requireDmLiveSession(ctx, sessionId)
    const trimmed = name.trim()
    if (trimmed.length === 0 || trimmed.length > 64) {
      throw new Error('Invalid name')
    }
    const rawPayload = createDefaultConvexSheetPayload()
    const sheetPersist = sanitizeCharacterSheetForPersist(rawPayload)
    validateCharacterSheetForPersist(sheetPersist)
    const characterId = await ctx.db.insert('sessionCharacters', {
      sessionId,
      name: trimmed,
      isPlayable,
      stats: { hp: 10, maxHp: 10 },
      sheet: sheetPersist as Doc<'sessionCharacters'>['sheet'],
    })
    return { characterId }
  },
})

export const removeSessionCharacter = mutation({
  args: {
    sessionId: v.id('sessions'),
    characterId: v.id('sessionCharacters'),
  },
  handler: async (ctx, { sessionId, characterId }) => {
    await requireDmLiveSession(ctx, sessionId)
    const character = await ctx.db.get(characterId)
    if (!character || character.sessionId !== sessionId) {
      throw new Error('Character not found')
    }
    const members = await ctx.db
      .query('sessionMembers')
      .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
      .collect()
    for (const m of filter(members, (mem) => mem.boundCharacterId === characterId)) {
      await ctx.db.patch(m._id, { boundCharacterId: undefined })
    }
    const session = await ctx.db.get(sessionId)
    if (session !== null) {
      const cur = session.turnOrderCharacterIds ?? []
      if (includes(cur, characterId)) {
        await ctx.db.patch(sessionId, {
          turnOrderCharacterIds: filter(cur, (id) => id !== characterId),
        })
      }
    }
    await ctx.db.delete(characterId)
    return { ok: true as const }
  },
})

export const listMySessions = query({
  args: v.object({}),
  handler: async (ctx) => {
    const clerkUserId = await requireIdentitySubject(ctx)
    const memberships = await ctx.db
      .query('sessionMembers')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', clerkUserId))
      .collect()
    const sessions = await Promise.all(memberships.map((m) => ctx.db.get(m.sessionId)))
    return memberships
      .map((m, i) => {
        const session = sessions[i]
        if (!session) {
          return null
        }
        return {
          membership: m,
          session: {
            _id: session._id,
            title: session.title,
            status: session.status,
            createdAt: session.createdAt,
            joinToken: session.dmClerkUserId === clerkUserId ? session.joinToken : undefined,
          },
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)
  },
})

export const getSessionTurnOrder = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, { sessionId }) => {
    const res = await requireMemberForSession(ctx, sessionId)
    if (res === null) {
      return null
    }
    const { session } = res
    const orderedIds = session.turnOrderCharacterIds ?? []
    const chars = await ctx.db
      .query('sessionCharacters')
      .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
      .collect()
    const byId = new Map(map(chars, (c) => [c._id, c]))
    const entries = filter(
      map(orderedIds, (id) => {
        const c = byId.get(id)
        if (c === undefined) {
          return null
        }
        return { characterId: c._id, name: c.name, isPlayable: sessionCharacterIsPlayable(c) }
      }),
      (e) => e !== null,
    ) as Array<{ characterId: Id<'sessionCharacters'>; name: string; isPlayable: boolean }>
    return { entries }
  },
})

export const setSessionTurnOrder = mutation({
  args: {
    sessionId: v.id('sessions'),
    characterIds: v.array(v.id('sessionCharacters')),
  },
  handler: async (ctx, { sessionId, characterIds }) => {
    await requireDmLiveSession(ctx, sessionId)
    const chars = await ctx.db
      .query('sessionCharacters')
      .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
      .collect()
    const valid = new Set(map(chars, (c) => c._id))
    const seen = new Set<string>()
    const deduped: Id<'sessionCharacters'>[] = []
    for (const id of characterIds) {
      if (!valid.has(id) || seen.has(String(id))) {
        continue
      }
      seen.add(String(id))
      deduped.push(id)
    }
    await ctx.db.patch(sessionId, { turnOrderCharacterIds: deduped })
    return { ok: true as const }
  },
})

export const getPlayerBoundCharacterPreview = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, { sessionId }) => {
    const res = await requireMemberForSession(ctx, sessionId)
    if (res === null) {
      return null
    }
    const { membership } = res
    if (membership.role !== 'player') {
      return null
    }
    if (membership.boundCharacterId === undefined) {
      return { kind: 'unbound' as const }
    }
    const c = await ctx.db.get(membership.boundCharacterId)
    if (c === null) {
      return { kind: 'unbound' as const }
    }
    return {
      kind: 'bound' as const,
      characterId: c._id,
      name: c.name,
      isPlayable: sessionCharacterIsPlayable(c),
      stats: c.stats,
    }
  },
})

export const getSessionCharacterSheetForViewer = query({
  args: {
    sessionId: v.id('sessions'),
    characterId: v.id('sessionCharacters'),
  },
  handler: async (ctx, { sessionId, characterId }) => {
    const res = await requireMemberForSession(ctx, sessionId)
    if (res === null) {
      return null
    }
    const { membership, session } = res
    const character = await ctx.db.get(characterId)
    if (character === null || character.sessionId !== sessionId) {
      return null
    }
    const live = session.status === 'live'
    const viewerRole = membership.role
    const payload = {
      character: {
        _id: character._id,
        name: character.name,
        isPlayable: sessionCharacterIsPlayable(character),
        stats: character.stats,
        sheet: character.sheet,
      },
      sessionStatus: session.status,
      canEdit: live,
      viewerRole,
    }
    if (membership.role === 'dm') {
      return payload
    }
    if (membership.role === 'player' && membership.boundCharacterId === character._id) {
      return payload
    }
    return null
  },
})

export const getSessionBattleMap = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, { sessionId }) => {
    const res = await requireMemberForSession(ctx, sessionId)
    if (res === null) {
      return null
    }
    const { membership, session } = res
    const { cols, rows } = sessionFootprint(session)
    const chars = await ctx.db
      .query('sessionCharacters')
      .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
      .collect()
    const placed = filter(chars, (c) => isPlacedCharacter(c))
    const tokens = map(placed, (c) => ({
      characterId: c._id,
      name: c.name,
      col: c.mapCol as number,
      row: c.mapRow as number,
    }))
    const isDm = membership.role === 'dm'
    const unplaced = isDm
      ? map(
          filter(chars, (c) => !isPlacedCharacter(c)),
          (c) => ({
            characterId: c._id,
            name: c.name,
            isPlayable: sessionCharacterIsPlayable(c),
          }),
        )
      : null
    return {
      role: membership.role,
      sessionStatus: session.status,
      mapCols: cols,
      mapRows: rows,
      tokens,
      unplaced,
    }
  },
})

export const setBattleMapFootprint = mutation({
  args: {
    sessionId: v.id('sessions'),
    mapCols: v.number(),
    mapRows: v.number(),
  },
  handler: async (ctx, { sessionId, mapCols, mapRows }) => {
    await requireDmLiveSession(ctx, sessionId)
    if (
      !Number.isInteger(mapCols) ||
      !Number.isInteger(mapRows) ||
      mapCols < MAP_COL_MIN ||
      mapCols > MAP_COL_MAX ||
      mapRows < MAP_ROW_MIN ||
      mapRows > MAP_ROW_MAX
    ) {
      throw new Error('Invalid map size')
    }
    await ctx.db.patch(sessionId, { mapCols, mapRows })
    const chars = await ctx.db
      .query('sessionCharacters')
      .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
      .collect()
    const outOfBounds = filter(chars, (c) => {
      if (!isPlacedCharacter(c)) {
        return false
      }
      const mc = c.mapCol as number
      const mr = c.mapRow as number
      return mc >= mapCols || mr >= mapRows || mc < 0 || mr < 0
    })
    for (const c of outOfBounds) {
      const full = await ctx.db.get(c._id)
      if (full !== null) {
        await writeCharacterWithoutPlacement(ctx, full)
      }
    }
    return { ok: true as const }
  },
})

export const setSessionCharacterMapPlacement = mutation({
  args: {
    sessionId: v.id('sessions'),
    characterId: v.id('sessionCharacters'),
    placement: v.union(
      v.object({ kind: v.literal('hex'), col: v.number(), row: v.number() }),
      v.object({ kind: v.literal('clear') }),
    ),
  },
  handler: async (ctx, { sessionId, characterId, placement }) => {
    const { session } = await requireDmLiveSession(ctx, sessionId)
    const character = await ctx.db.get(characterId)
    if (!character || character.sessionId !== sessionId) {
      throw new Error('Character not found')
    }
    const { cols, rows } = sessionFootprint(session)

    if (placement.kind === 'clear') {
      if (isPlacedCharacter(character)) {
        await writeCharacterWithoutPlacement(ctx, character)
      }
      return { ok: true as const }
    }

    const { col, row } = placement
    if (!Number.isInteger(col) || !Number.isInteger(row)) {
      throw new Error('Invalid coordinates')
    }
    if (col < 0 || col >= cols || row < 0 || row >= rows) {
      throw new Error('Out of bounds')
    }

    const chars = await ctx.db
      .query('sessionCharacters')
      .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
      .collect()
    const occupant = find(
      chars,
      (c) => isPlacedCharacter(c) && c._id !== characterId && c.mapCol === col && c.mapRow === row,
    )
    if (occupant !== undefined) {
      throw new Error('Hex is occupied')
    }

    if (isPlacedCharacter(character) && character.mapCol === col && character.mapRow === row) {
      return { ok: true as const }
    }

    await patchSessionCharacterCanonical(ctx, characterId, { mapCol: col, mapRow: row })
    return { ok: true as const }
  },
})

const statsPatchValidator = v.object({
  hp: v.number(),
  maxHp: v.number(),
})

export const patchSessionCharacterSheet = mutation({
  args: {
    sessionId: v.id('sessions'),
    characterId: v.id('sessionCharacters'),
    name: v.optional(v.string()),
    stats: v.optional(statsPatchValidator),
    sheetPatch: v.optional(characterSheetPatchValidator),
  },
  handler: async (ctx, { sessionId, characterId, name, stats, sheetPatch }) => {
    const identity = await requireIdentitySubject(ctx)
    const session = await ctx.db.get(sessionId)
    if (session === null) {
      throw new Error('Session not found')
    }
    if (session.status !== 'live') {
      throw new Error('Session is not live')
    }
    const membership = await ctx.db
      .query('sessionMembers')
      .withIndex('by_session_and_clerkUserId', (q) =>
        q.eq('sessionId', sessionId).eq('clerkUserId', identity),
      )
      .unique()
    if (membership === null) {
      throw new Error('Forbidden')
    }

    const character = await ctx.db.get(characterId)
    if (character === null || character.sessionId !== sessionId) {
      throw new Error('Character not found')
    }

    const isDm = membership.role === 'dm'
    const isBoundPlayer =
      membership.role === 'player' && membership.boundCharacterId === characterId

    if (!isDm && !isBoundPlayer) {
      throw new Error('Forbidden')
    }

    const updates: Partial<Doc<'sessionCharacters'>> = {}
    if (name !== undefined) {
      const trimmed = name.trim()
      if (trimmed.length === 0 || trimmed.length > 64) {
        throw new Error('Invalid name')
      }
      updates.name = trimmed
    }
    if (stats !== undefined) {
      if (
        !Number.isInteger(stats.hp) ||
        !Number.isInteger(stats.maxHp) ||
        stats.hp < 0 ||
        stats.maxHp < 0 ||
        stats.hp > 99999 ||
        stats.maxHp > 99999
      ) {
        throw new Error('Invalid stats')
      }
      updates.stats = { hp: stats.hp, maxHp: stats.maxHp }
    }
    if (sheetPatch !== undefined) {
      const patchForMerge = isBoundPlayer && !isDm ? omit(sheetPatch, 'classLevels') : sheetPatch
      const patchRec = patchForMerge as Record<string, unknown>
      const merged = merge(
        {},
        character.sheet ?? {},
        omit(patchRec, ['equipmentItems', 'classLevels']),
      ) as Record<string, unknown>
      if (patchRec.equipmentItems !== undefined) {
        merged.equipmentItems = patchRec.equipmentItems
      }
      if (patchRec.classLevels !== undefined) {
        merged.classLevels = patchRec.classLevels
      }
      const finalized = sanitizeCharacterSheetForPersist(merged)
      validateCharacterSheetForPersist(finalized)
      updates.sheet = finalized as Doc<'sessionCharacters'>['sheet']
    }
    if (Object.keys(updates).length === 0) {
      return { ok: true as const }
    }
    await patchSessionCharacterCanonical(ctx, characterId, updates)
    return { ok: true as const }
  },
})
