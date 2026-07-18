import { find, forEach, map, range, sample, shuffle, sortBy } from 'lodash'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import { internalMutation, mutation, query, type MutationCtx } from './_generated/server'
import {
  DEFAULT_MATCH_TIME_CAP_MS,
  ITEM_CATALOG,
  ITEM_KEYS,
  MATCH_LIFE_CAP,
  earliestWakeAt,
  resolveMatchStep,
  seedFireCapableSlotSchedulesAtMatchStart,
  type ItemKey,
  type MatchSeatState,
  type SeatIndex,
} from './matchShared'

const RESULTS_BEAT_MS = 2_000
const LOADOUT_SLOT_COUNT = 3

async function requireIdentitySubject(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> }
}): Promise<string> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error('Unauthorized')
  }
  return identity.subject
}

async function requireHostLiveSession(
  ctx: MutationCtx,
  sessionId: Id<'sessions'>,
): Promise<{ session: Doc<'sessions'>; hostClerkUserId: string }> {
  const hostClerkUserId = await requireIdentitySubject(ctx)
  const session = await ctx.db.get(sessionId)
  if (session === null || session.dmClerkUserId !== hostClerkUserId) {
    throw new Error('Forbidden')
  }
  if (session.status !== 'live') {
    throw new Error('Session is not live')
  }
  return { session, hostClerkUserId }
}

async function cancelWakeJob(ctx: MutationCtx, session: Doc<'sessions'>) {
  if (session.matchWakeJobId === undefined) {
    return
  }
  try {
    await ctx.scheduler.cancel(session.matchWakeJobId)
  } catch {
    // Job may already have started or completed.
  }
}

function rollItemKey(): ItemKey {
  return sample(ITEM_KEYS) ?? ITEM_KEYS[0]
}

function rollLoadoutSlots(): MatchSeatState['slots'] {
  return map(range(LOADOUT_SLOT_COUNT), () => ({ itemKey: rollItemKey() }))
}

function engineSeatsFromStored(
  stored: NonNullable<Doc<'sessions'>['matchSeats']>,
): [MatchSeatState, MatchSeatState] {
  return [
    { life: stored[0].life, shield: stored[0].shield, slots: stored[0].slots },
    { life: stored[1].life, shield: stored[1].shield, slots: stored[1].slots },
  ]
}

function mergeSeatsWithClerkIds(
  stored: NonNullable<Doc<'sessions'>['matchSeats']>,
  engineSeats: [MatchSeatState, MatchSeatState],
): NonNullable<Doc<'sessions'>['matchSeats']> {
  return [
    {
      clerkUserId: stored[0].clerkUserId,
      life: engineSeats[0].life,
      shield: engineSeats[0].shield,
      slots: engineSeats[0].slots,
    },
    {
      clerkUserId: stored[1].clerkUserId,
      life: engineSeats[1].life,
      shield: engineSeats[1].shield,
      slots: engineSeats[1].slots,
    },
  ]
}

function playPhaseOf(session: Doc<'sessions'>): 'lobby' | 'match' | 'results' {
  return session.playPhase ?? 'lobby'
}

export const getSessionPlayState = query({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, { sessionId }) => {
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
    const members = await ctx.db
      .query('sessionMembers')
      .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
      .collect()
    const ordered = sortBy(members, [
      (m) => (m.role === 'dm' ? 0 : 1),
      (m) => m._creationTime,
      (m) => String(m._id),
    ])
    const fightingPlayers = map(ordered, (m, index) => ({
      seat: (index === 0 ? 0 : 1) as SeatIndex,
      seatLabel: index === 0 ? 1 : 2,
      clerkUserId: m.clerkUserId,
      role: m.role === 'dm' ? ('host' as const) : ('player' as const),
      isYou: m.clerkUserId === identity.subject,
      sessionNickname: m.sessionNickname,
    }))
    const isHost = session.dmClerkUserId === identity.subject
    return {
      session: {
        _id: session._id,
        title: session.title,
        status: session.status,
        playPhase: playPhaseOf(session),
        ...(isHost ? { joinToken: session.joinToken } : {}),
      },
      membership: {
        role: membership.role === 'dm' ? ('host' as const) : ('player' as const),
        clerkUserId: membership.clerkUserId,
      },
      isHost,
      fightingPlayers,
      fightingCount: fightingPlayers.length,
      canStartMatch:
        isHost &&
        session.status === 'live' &&
        playPhaseOf(session) === 'lobby' &&
        fightingPlayers.length === 2,
      canEndSession:
        isHost && session.status === 'live' && playPhaseOf(session) === 'lobby',
      match:
        playPhaseOf(session) === 'lobby'
          ? null
          : {
              startedAt: session.matchStartedAt ?? null,
              seatResolveOrder: session.matchSeatResolveOrder ?? null,
              seats: session.matchSeats ?? null,
              lastUpdate: session.matchLastUpdate ?? null,
              outcome: session.matchOutcome ?? null,
              timeCapMs: DEFAULT_MATCH_TIME_CAP_MS,
              lifeCap: MATCH_LIFE_CAP,
            },
    }
  },
})

export const startMatch = mutation({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, { sessionId }) => {
    const { session, hostClerkUserId } = await requireHostLiveSession(ctx, sessionId)
    if (playPhaseOf(session) !== 'lobby') {
      throw new Error('Match can only start from the Lobby')
    }
    const members = await ctx.db
      .query('sessionMembers')
      .withIndex('by_session', (q) => q.eq('sessionId', sessionId))
      .collect()
    if (members.length !== 2) {
      throw new Error('Match start needs exactly two fighting Players')
    }
    const ordered = sortBy(members, [
      (m) => (m.clerkUserId === hostClerkUserId ? 0 : 1),
      (m) => m._creationTime,
    ])
    const hostMember = findHostMember(ordered, hostClerkUserId)
    const guestMember = findGuestMember(ordered, hostClerkUserId)
    if (hostMember === undefined || guestMember === undefined) {
      throw new Error('Match start needs exactly two fighting Players')
    }

    await cancelWakeJob(ctx, session)

    const matchStartedAt = Date.now()
    const seatResolveOrder = shuffle([0, 1] as SeatIndex[]) as [SeatIndex, SeatIndex]
    const matchSeats: NonNullable<Doc<'sessions'>['matchSeats']> = [
      {
        clerkUserId: hostMember.clerkUserId,
        life: MATCH_LIFE_CAP,
        shield: 0,
        slots: rollLoadoutSlots(),
      },
      {
        clerkUserId: guestMember.clerkUserId,
        life: MATCH_LIFE_CAP,
        shield: 0,
        slots: rollLoadoutSlots(),
      },
    ]
    const engineSeats = engineSeatsFromStored(matchSeats)
    seedFireCapableSlotSchedulesAtMatchStart(engineSeats, matchStartedAt, ITEM_CATALOG)
    forEach([0, 1] as const, (index) => {
      matchSeats[index].slots = engineSeats[index].slots
    })
    const firstWakeAt = earliestWakeAt(engineSeats, matchStartedAt)

    const wakeJobId = await ctx.scheduler.runAt(firstWakeAt, internal.match.wakeMatch, {
      sessionId,
      expectedStartedAt: matchStartedAt,
      wakeAt: firstWakeAt,
    })

    await ctx.db.patch(sessionId, {
      playPhase: 'match',
      matchStartedAt,
      matchSeatResolveOrder: seatResolveOrder,
      matchSeats,
      matchLastUpdate: undefined,
      matchOutcome: undefined,
      matchWakeJobId: wakeJobId,
    })
    return { ok: true as const, matchStartedAt, firstWakeAt }
  },
})

function findHostMember(
  members: Doc<'sessionMembers'>[],
  hostClerkUserId: string,
): Doc<'sessionMembers'> | undefined {
  return find(members, (m) => m.clerkUserId === hostClerkUserId)
}

function findGuestMember(
  members: Doc<'sessionMembers'>[],
  hostClerkUserId: string,
): Doc<'sessionMembers'> | undefined {
  return find(members, (m) => m.clerkUserId !== hostClerkUserId)
}

export const wakeMatch = internalMutation({
  args: {
    sessionId: v.id('sessions'),
    expectedStartedAt: v.number(),
    wakeAt: v.number(),
  },
  handler: async (ctx, { sessionId, expectedStartedAt, wakeAt }) => {
    const session = await ctx.db.get(sessionId)
    if (session === null) {
      return
    }
    if (session.status !== 'live') {
      return
    }
    if (playPhaseOf(session) !== 'match') {
      return
    }
    if (session.matchStartedAt !== expectedStartedAt) {
      return
    }
    if (
      session.matchSeats === undefined ||
      session.matchSeats.length !== 2 ||
      session.matchSeatResolveOrder === undefined ||
      session.matchSeatResolveOrder.length !== 2
    ) {
      return
    }

    const t = wakeAt
    const engineSeats = engineSeatsFromStored(session.matchSeats)
    const seatResolveOrder = session.matchSeatResolveOrder as [SeatIndex, SeatIndex]
    const update = resolveMatchStep({
      seats: engineSeats,
      t,
      seatResolveOrder,
      catalog: ITEM_CATALOG,
      matchStartedAt: expectedStartedAt,
      timeCapMs: DEFAULT_MATCH_TIME_CAP_MS,
    })
    const nextSeats = mergeSeatsWithClerkIds(session.matchSeats, update.seats)

    if (update.outcome.type === 'continue') {
      const timeCapAt = expectedStartedAt + DEFAULT_MATCH_TIME_CAP_MS
      const nextWakeAt = update.nextWakeAt ?? timeCapAt
      const wakeJobId = await ctx.scheduler.runAt(nextWakeAt, internal.match.wakeMatch, {
        sessionId,
        expectedStartedAt,
        wakeAt: nextWakeAt,
      })
      await ctx.db.patch(sessionId, {
        matchSeats: nextSeats,
        matchLastUpdate: {
          atMs: update.atMs,
          fires: update.fires,
          seats: update.seats,
          animationHints: update.animationHints,
          outcome: update.outcome,
          nextWakeAt,
        },
        matchWakeJobId: wakeJobId,
      })
      return
    }

    const terminalOutcome =
      update.outcome.type === 'winner'
        ? { type: 'winner' as const, seat: update.outcome.seat }
        : { type: 'draw' as const }

    const returnJobId = await ctx.scheduler.runAfter(
      RESULTS_BEAT_MS,
      internal.match.returnToLobby,
      { sessionId, expectedStartedAt },
    )

    await ctx.db.patch(sessionId, {
      playPhase: 'results',
      matchSeats: nextSeats,
      matchLastUpdate: {
        atMs: update.atMs,
        fires: update.fires,
        seats: update.seats,
        animationHints: update.animationHints,
        outcome: update.outcome,
      },
      matchOutcome: terminalOutcome,
      matchWakeJobId: returnJobId,
    })
  },
})

export const returnToLobby = internalMutation({
  args: {
    sessionId: v.id('sessions'),
    expectedStartedAt: v.number(),
  },
  handler: async (ctx, { sessionId, expectedStartedAt }) => {
    const session = await ctx.db.get(sessionId)
    if (session === null) {
      return
    }
    if (session.matchStartedAt !== expectedStartedAt) {
      return
    }
    if (playPhaseOf(session) !== 'results') {
      return
    }
    await ctx.db.patch(sessionId, {
      playPhase: 'lobby',
      matchStartedAt: undefined,
      matchSeatResolveOrder: undefined,
      matchSeats: undefined,
      matchLastUpdate: undefined,
      matchOutcome: undefined,
      matchWakeJobId: undefined,
    })
  },
})

export const endSession = mutation({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, { sessionId }) => {
    const { session } = await requireHostLiveSession(ctx, sessionId)
    if (playPhaseOf(session) !== 'lobby') {
      throw new Error('Session can only be ended from the Lobby')
    }
    await cancelWakeJob(ctx, session)
    await ctx.db.patch(sessionId, {
      status: 'archived',
      playPhase: 'lobby',
      matchStartedAt: undefined,
      matchSeatResolveOrder: undefined,
      matchSeats: undefined,
      matchLastUpdate: undefined,
      matchOutcome: undefined,
      matchWakeJobId: undefined,
    })
    return { ok: true as const }
  },
})
