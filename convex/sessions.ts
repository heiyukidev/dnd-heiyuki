import { filter, find, map, orderBy, sortBy } from 'lodash'
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
      playPhase: 'lobby',
      fightingPlayerCount: 1,
    })
    await ctx.db.insert('sessionMembers', {
      sessionId,
      clerkUserId,
      role: 'dm',
    })
    return { sessionId, joinToken }
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
    const fightingMembers = await ctx.db
      .query('sessionMembers')
      .withIndex('by_session', (q) => q.eq('sessionId', session._id))
      .collect()
    const fightingCount = fightingMembers.length
    const sessionFull = fightingCount >= 2
    const sessionOut = {
      _id: session._id,
      title: session.title,
      status: session.status,
      fightingCount,
      sessionFull,
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
        viewer: {
          kind: 'member' as const,
          role: membership.role === 'dm' ? ('host' as const) : ('player' as const),
        },
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
      throw new Error('Session is archived and is not accepting join requests')
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

    const fightingMembers = await ctx.db
      .query('sessionMembers')
      .withIndex('by_session', (q) => q.eq('sessionId', session._id))
      .collect()
    if (fightingMembers.length >= 2) {
      return { status: 'session_full' as const }
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
  },
  handler: async (ctx, { requestId }) => {
    const hostClerkUserId = await requireIdentitySubject(ctx)
    const joinRequest = await ctx.db.get(requestId)
    if (!joinRequest || joinRequest.status !== 'pending') {
      throw new Error('Invalid join request')
    }
    const session = await ctx.db.get(joinRequest.sessionId)
    if (!session || session.dmClerkUserId !== hostClerkUserId) {
      throw new Error('Forbidden')
    }
    if (session.status !== 'live') {
      throw new Error('Session is archived')
    }
    const playPhase = session.playPhase ?? 'lobby'
    if (playPhase !== 'lobby') {
      throw new Error('Join requests can only be approved from the Lobby')
    }

    const membersInSession = await ctx.db
      .query('sessionMembers')
      .withIndex('by_session', (q) => q.eq('sessionId', session._id))
      .collect()
    const fightingPlayerCount = session.fightingPlayerCount ?? membersInSession.length
    if (fightingPlayerCount >= 2 || membersInSession.length >= 2) {
      throw new Error('Session is full (2/2 fighting Players)')
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

    await ctx.db.patch(session._id, { fightingPlayerCount: fightingPlayerCount + 1 })
    await ctx.db.patch(requestId, { status: 'approved' })
    await ctx.db.insert('sessionMembers', {
      sessionId: session._id,
      clerkUserId: joinRequest.clerkUserId,
      role: 'player',
    })
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

export const listMySessions = query({
  args: v.object({}),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (identity === null) {
      return []
    }
    const clerkUserId = identity.subject
    const memberships = await ctx.db
      .query('sessionMembers')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', clerkUserId))
      .collect()
    const sessions = await Promise.all(map(memberships, (m) => ctx.db.get(m.sessionId)))
    return filter(
      map(memberships, (m, i) => {
        const session = sessions[i]
        if (!session) {
          return null
        }
        return {
          membership: {
            ...m,
            role: m.role === 'dm' ? ('host' as const) : ('player' as const),
          },
          session: {
            _id: session._id,
            title: session.title,
            status: session.status,
            createdAt: session.createdAt,
            joinToken: session.dmClerkUserId === clerkUserId ? session.joinToken : undefined,
          },
        }
      }),
      (row): row is NonNullable<typeof row> => row !== null,
    )
  },
})
