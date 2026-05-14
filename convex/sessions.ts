import { filter, find, sortBy } from 'lodash'
import { v } from 'convex/values'
import type { Id } from './_generated/dataModel'
import { mutation, query, type MutationCtx } from './_generated/server'

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
        .withIndex('by_session_and_clerkUserId', (q) => q.eq('sessionId', session._id))
        .collect()
      const otherMemberWithCharacter = find(
        membersInSession,
        (m) => m.boundCharacterId === characterId && m.clerkUserId !== joinRequest.clerkUserId,
      )
      if (otherMemberWithCharacter !== undefined) {
        throw new Error('Character is already assigned to another member')
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
      await ctx.db.patch(characterId, { boundClerkUserId: joinRequest.clerkUserId })
    }
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
