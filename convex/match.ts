import { find, findIndex, forEach, map, range, shuffle, sortBy } from 'lodash'
import { v } from 'convex/values'
import { internal } from './_generated/api'
import type { Doc, Id } from './_generated/dataModel'
import { internalMutation, mutation, query, type MutationCtx } from './_generated/server'
import {
  applyPick,
  createDraftRngFromRandom,
  DEFAULT_MATCH_TIME_CAP_MS,
  draftLoadoutToMatchSlots,
  DRAFT_PICK_COUNT,
  earliestWakeAt,
  initializeDraftState,
  isDraftComplete,
  isSeatDraftComplete,
  isSeatWaitingForOpponent,
  ITEM_CATALOG,
  MATCH_LIFE_CAP,
  resolveMatchStep,
  seedFireCapableSlotSchedulesAtMatchStart,
  rollSoulStats,
  soulFavorLine,
  startingLifeFromVitality,
  type BoonKey,
  type DraftSeatState,
  type MatchSeatState,
  type SeatIndex,
  type SoulStats,
} from './matchShared'

const RESULTS_BEAT_MS = 2_000

type StoredDraftSeat = NonNullable<Doc<'sessions'>['matchDraftSeats']>[number]

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

async function requireMemberSession(
  ctx: MutationCtx,
  sessionId: Id<'sessions'>,
): Promise<{ session: Doc<'sessions'>; clerkUserId: string }> {
  const clerkUserId = await requireIdentitySubject(ctx)
  const session = await ctx.db.get(sessionId)
  if (session === null) {
    throw new Error('Session not found')
  }
  const membership = await ctx.db
    .query('sessionMembers')
    .withIndex('by_session_and_clerkUserId', (q) =>
      q.eq('sessionId', sessionId).eq('clerkUserId', clerkUserId),
    )
    .unique()
  if (membership === null) {
    throw new Error('Forbidden')
  }
  return { session, clerkUserId }
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

function playPhaseOf(session: Doc<'sessions'>): 'lobby' | 'draft' | 'match' | 'results' {
  return session.playPhase ?? 'lobby'
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
      soul: stored[0].soul,
    },
    {
      clerkUserId: stored[1].clerkUserId,
      life: engineSeats[1].life,
      shield: engineSeats[1].shield,
      slots: engineSeats[1].slots,
      soul: stored[1].soul,
    },
  ]
}

function soulsFromMatchSeats(
  stored: NonNullable<Doc<'sessions'>['matchSeats']>,
): [SoulStats, SoulStats] {
  return [stored[0].soul, stored[1].soul]
}

function draftSeatFromStored(stored: StoredDraftSeat): DraftSeatState {
  return {
    loadoutKeys: stored.loadoutKeys as BoonKey[],
    godPool: stored.godPool,
    currentOffer:
      stored.currentOffer === undefined
        ? null
        : {
            god: stored.currentOffer.god,
            options: stored.currentOffer.options as BoonKey[],
          },
  }
}

function draftSeatToStored(
  clerkUserId: string,
  seat: DraftSeatState,
  soul: SoulStats,
): StoredDraftSeat {
  return {
    clerkUserId,
    loadoutKeys: seat.loadoutKeys,
    godPool: seat.godPool,
    soul,
    ...(seat.currentOffer === null
      ? {}
      : {
          currentOffer: {
            god: seat.currentOffer.god,
            options: seat.currentOffer.options,
          },
        }),
  }
}

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

function seatIndexForClerk(draftSeats: StoredDraftSeat[], clerkUserId: string): SeatIndex | null {
  const index = findIndex(draftSeats, (seat) => seat.clerkUserId === clerkUserId)
  if (index < 0 || index > 1) {
    return null
  }
  return index as SeatIndex
}

function clearMatchFields() {
  return {
    matchStartedAt: undefined,
    matchSeatResolveOrder: undefined,
    matchDraftSeats: undefined,
    matchSeats: undefined,
    matchLastUpdate: undefined,
    matchOutcome: undefined,
    matchWakeJobId: undefined,
  }
}

async function beginLiveFight(
  ctx: MutationCtx,
  sessionId: Id<'sessions'>,
  draftSeats: StoredDraftSeat[],
) {
  const fightStartedAt = Date.now()
  const seatResolveOrder = shuffle([0, 1] as SeatIndex[]) as [SeatIndex, SeatIndex]
  const matchSeats: NonNullable<Doc<'sessions'>['matchSeats']> = map(draftSeats, (draftSeat) => ({
    clerkUserId: draftSeat.clerkUserId,
    life: startingLifeFromVitality(draftSeat.soul.vitality, MATCH_LIFE_CAP),
    shield: 0,
    soul: draftSeat.soul,
    slots: draftLoadoutToMatchSlots(draftSeat.loadoutKeys as BoonKey[]),
  })) as NonNullable<Doc<'sessions'>['matchSeats']>

  const engineSeats = engineSeatsFromStored(matchSeats)
  const souls = soulsFromMatchSeats(matchSeats)
  seedFireCapableSlotSchedulesAtMatchStart(engineSeats, fightStartedAt, ITEM_CATALOG, souls)
  forEach([0, 1] as const, (index) => {
    matchSeats[index].slots = engineSeats[index].slots
  })
  const firstWakeAt = earliestWakeAt(engineSeats, fightStartedAt)
  const wakeJobId = await ctx.scheduler.runAt(firstWakeAt, internal.match.wakeMatch, {
    sessionId,
    expectedStartedAt: fightStartedAt,
    wakeAt: firstWakeAt,
  })

  await ctx.db.patch(sessionId, {
    playPhase: 'match',
    matchStartedAt: fightStartedAt,
    matchSeatResolveOrder: seatResolveOrder,
    matchDraftSeats: undefined,
    matchSeats,
    matchLastUpdate: undefined,
    matchOutcome: undefined,
    matchWakeJobId: wakeJobId,
  })

  return { fightStartedAt, firstWakeAt }
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
    const phase = playPhaseOf(session)
    const yourSeatIndex = seatIndexForClerk(session.matchDraftSeats ?? [], identity.subject)

    const draft =
      phase === 'draft' && session.matchDraftSeats !== undefined
        ? (() => {
            const draftSeats = session.matchDraftSeats
            const ownSeat =
              yourSeatIndex === null ? null : draftSeatFromStored(draftSeats[yourSeatIndex])
            const ownStoredSoul =
              yourSeatIndex === null ? null : draftSeats[yourSeatIndex].soul
            const draftState = {
              seats: map(draftSeats, draftSeatFromStored) as [DraftSeatState, DraftSeatState],
            }
            return {
              picksTotal: DRAFT_PICK_COUNT,
              yourSeatIndex,
              own:
                ownSeat === null
                  ? null
                  : {
                      loadoutKeys: ownSeat.loadoutKeys,
                      godPool: ownSeat.godPool,
                      currentOffer: ownSeat.currentOffer,
                      picksMade: ownSeat.loadoutKeys.length,
                      isComplete: isSeatDraftComplete(ownSeat),
                      waitingForOpponent:
                        yourSeatIndex === null
                          ? false
                          : isSeatWaitingForOpponent(ownSeat, draftState),
                      soul: ownStoredSoul,
                      favorLine:
                        ownStoredSoul === null ? null : soulFavorLine(ownStoredSoul),
                    },
              isDraftComplete: isDraftComplete(draftState),
            }
          })()
        : null

    return {
      session: {
        _id: session._id,
        title: session.title,
        status: session.status,
        playPhase: phase,
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
        isHost && session.status === 'live' && phase === 'lobby' && fightingPlayers.length === 2,
      canCancelMatch:
        isHost && session.status === 'live' && (phase === 'draft' || phase === 'match'),
      canEndSession: isHost && session.status === 'live' && phase === 'lobby',
      draft,
      match:
        phase === 'lobby' || phase === 'draft'
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

    const rng = createDraftRngFromRandom(Math.random)
    const draftState = initializeDraftState(rng)
    const matchDraftSeats: NonNullable<Doc<'sessions'>['matchDraftSeats']> = [
      draftSeatToStored(hostMember.clerkUserId, draftState.seats[0], rollSoulStats(Math.random)),
      draftSeatToStored(guestMember.clerkUserId, draftState.seats[1], rollSoulStats(Math.random)),
    ]

    await ctx.db.patch(sessionId, {
      playPhase: 'draft',
      ...clearMatchFields(),
      matchDraftSeats,
    })
    return { ok: true as const }
  },
})

export const pickBoon = mutation({
  args: {
    sessionId: v.id('sessions'),
    boonKey: v.string(),
  },
  handler: async (ctx, { sessionId, boonKey }) => {
    const { session, clerkUserId } = await requireMemberSession(ctx, sessionId)
    if (playPhaseOf(session) !== 'draft') {
      throw new Error('Boon picks are only allowed during Draft')
    }
    if (session.matchDraftSeats === undefined || session.matchDraftSeats.length !== 2) {
      throw new Error('Draft state is missing')
    }

    const seatIndex = seatIndexForClerk(session.matchDraftSeats, clerkUserId)
    if (seatIndex === null) {
      throw new Error('You are not seated in this Match')
    }

    const rng = createDraftRngFromRandom(Math.random)
    const currentSeat = draftSeatFromStored(session.matchDraftSeats[seatIndex])
    if (isSeatDraftComplete(currentSeat)) {
      throw new Error('Draft is already complete for your seat')
    }

    const nextSeat = applyPick(currentSeat, boonKey as BoonKey, rng)
    const nextDraftSeats = [...session.matchDraftSeats]
    nextDraftSeats[seatIndex] = draftSeatToStored(
      session.matchDraftSeats[seatIndex].clerkUserId,
      nextSeat,
      session.matchDraftSeats[seatIndex].soul,
    )

    if (
      isDraftComplete({
        seats: map(nextDraftSeats, draftSeatFromStored) as [DraftSeatState, DraftSeatState],
      })
    ) {
      await beginLiveFight(ctx, sessionId, nextDraftSeats)
      return { ok: true as const, draftComplete: true as const }
    }

    await ctx.db.patch(sessionId, { matchDraftSeats: nextDraftSeats })
    return { ok: true as const, draftComplete: false as const }
  },
})

export const cancelMatch = mutation({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, { sessionId }) => {
    const { session } = await requireHostLiveSession(ctx, sessionId)
    const phase = playPhaseOf(session)
    if (phase !== 'draft' && phase !== 'match') {
      throw new Error('Match cancel is only allowed during Draft or the live fight')
    }
    await cancelWakeJob(ctx, session)
    await ctx.db.patch(sessionId, {
      playPhase: 'lobby',
      ...clearMatchFields(),
    })
    return { ok: true as const }
  },
})

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
    const souls = soulsFromMatchSeats(session.matchSeats)
    const update = resolveMatchStep({
      seats: engineSeats,
      t,
      seatResolveOrder,
      catalog: ITEM_CATALOG,
      matchStartedAt: expectedStartedAt,
      timeCapMs: DEFAULT_MATCH_TIME_CAP_MS,
      souls,
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
      ...clearMatchFields(),
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
      ...clearMatchFields(),
    })
    return { ok: true as const }
  },
})
