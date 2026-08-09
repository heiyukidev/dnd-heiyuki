import { find, findIndex, forEach, map, shuffle, sortBy } from 'lodash'
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
  effectiveSoul,
  initializeDraftState,
  isDraftComplete,
  isSeatDraftComplete,
  isSeatSpendReady,
  getSeatWaitingReason,
  ITEM_CATALOG,
  MATCH_GOLD_GRANT,
  MATCH_LIFE_CAP,
  resolveMatchStep,
  seedFireCapableSlotSchedulesAtMatchStart,
  rollSoulStats,
  soulFavorLine,
  tryAdjustSoulBump,
  weaponFavorLine,
  generateWeaponOffersFromRandom,
  isValidWeaponPick,
  maxLifeForSeat,
  ZERO_SOUL_BUMPS,
  type BoonKey,
  type DraftSeatState,
  type MatchSeatState,
  type SeatIndex,
  type SoulStats,
  type SoulStatKey,
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

function playPhaseOf(session: Doc<'sessions'>): 'lobby' | 'weapon' | 'draft' | 'match' | 'results' {
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

type StoredWeaponSeat = NonNullable<Doc<'sessions'>['matchWeaponSeats']>[number]

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
      weaponKey: stored[0].weaponKey,
    },
    {
      clerkUserId: stored[1].clerkUserId,
      life: engineSeats[1].life,
      shield: engineSeats[1].shield,
      slots: engineSeats[1].slots,
      soul: stored[1].soul,
      weaponKey: stored[1].weaponKey,
    },
  ]
}

function soulsFromMatchSeats(
  stored: NonNullable<Doc<'sessions'>['matchSeats']>,
): [SoulStats, SoulStats] {
  return [stored[0].soul, stored[1].soul]
}

function weaponKeysFromMatchSeats(
  stored: NonNullable<Doc<'sessions'>['matchSeats']>,
): [string, string] {
  return [stored[0].weaponKey, stored[1].weaponKey]
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
    soulBumps: stored.soulBumps ?? { ...ZERO_SOUL_BUMPS },
    goldRemaining: stored.goldRemaining ?? MATCH_GOLD_GRANT,
    spendConfirmed: stored.spendConfirmed ?? false,
  }
}

function draftSeatToStored(
  clerkUserId: string,
  seat: DraftSeatState,
  rolledSoul: SoulStats,
  weaponKey: string,
): StoredDraftSeat {
  return {
    clerkUserId,
    loadoutKeys: seat.loadoutKeys,
    godPool: seat.godPool,
    soul: rolledSoul,
    soulBumps: seat.soulBumps,
    goldRemaining: seat.goldRemaining,
    spendConfirmed: seat.spendConfirmed,
    weaponKey,
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

function seatIndexForClerk(
  seats: Array<{ clerkUserId: string }>,
  clerkUserId: string,
): SeatIndex | null {
  const index = findIndex(seats, (seat) => seat.clerkUserId === clerkUserId)
  if (index < 0 || index > 1) {
    return null
  }
  return index as SeatIndex
}

function bothSeatsChoseWeapon(weaponSeats: StoredWeaponSeat[]): boolean {
  return (
    weaponSeats.length === 2 &&
    weaponSeats[0].chosenWeaponKey !== undefined &&
    weaponSeats[1].chosenWeaponKey !== undefined
  )
}

function clearMatchFields() {
  return {
    matchStartedAt: undefined,
    matchSeatResolveOrder: undefined,
    matchWeaponSeats: undefined,
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
  const matchSeats: NonNullable<Doc<'sessions'>['matchSeats']> = map(draftSeats, (draftSeat) => {
    const combatSoul = effectiveSoul(draftSeat.soul, draftSeat.soulBumps ?? ZERO_SOUL_BUMPS)
    return {
      clerkUserId: draftSeat.clerkUserId,
      life: maxLifeForSeat(combatSoul, draftSeat.weaponKey, MATCH_LIFE_CAP),
      shield: 0,
      soul: combatSoul,
      weaponKey: draftSeat.weaponKey,
      slots: draftLoadoutToMatchSlots(draftSeat.loadoutKeys as BoonKey[]),
    }
  }) as NonNullable<Doc<'sessions'>['matchSeats']>

  const engineSeats = engineSeatsFromStored(matchSeats)
  const souls = soulsFromMatchSeats(matchSeats)
  const weaponKeys = weaponKeysFromMatchSeats(matchSeats)
  seedFireCapableSlotSchedulesAtMatchStart(
    engineSeats,
    fightStartedAt,
    ITEM_CATALOG,
    souls,
    weaponKeys,
  )
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
    const yourWeaponSeatIndex =
      session.matchWeaponSeats === undefined
        ? null
        : seatIndexForClerk(session.matchWeaponSeats, identity.subject)
    const yourDraftSeatIndex =
      session.matchDraftSeats === undefined
        ? null
        : seatIndexForClerk(session.matchDraftSeats, identity.subject)

    const weapon =
      phase === 'weapon' && session.matchWeaponSeats !== undefined
        ? (() => {
            const weaponSeats = session.matchWeaponSeats
            const ownSeat = yourWeaponSeatIndex === null ? null : weaponSeats[yourWeaponSeatIndex]
            const ownStoredSoul =
              yourWeaponSeatIndex === null ? null : weaponSeats[yourWeaponSeatIndex].soul
            return {
              yourSeatIndex: yourWeaponSeatIndex,
              own:
                ownSeat === null
                  ? null
                  : {
                      soul: ownStoredSoul,
                      favorLine: ownStoredSoul === null ? null : soulFavorLine(ownStoredSoul),
                      weaponOffers:
                        ownSeat.chosenWeaponKey === undefined ? ownSeat.weaponOffers : [],
                      chosenWeaponKey: ownSeat.chosenWeaponKey ?? null,
                      weaponFavorLine:
                        ownSeat.chosenWeaponKey === undefined
                          ? null
                          : weaponFavorLine(ownSeat.chosenWeaponKey),
                      waitingForOpponent:
                        ownSeat.chosenWeaponKey !== undefined && !bothSeatsChoseWeapon(weaponSeats),
                    },
            }
          })()
        : null

    const draft =
      phase === 'draft' && session.matchDraftSeats !== undefined
        ? (() => {
            const draftSeats = session.matchDraftSeats
            const ownRolledSoul =
              yourDraftSeatIndex === null ? null : draftSeats[yourDraftSeatIndex].soul
            const ownSeat =
              yourDraftSeatIndex === null
                ? null
                : draftSeatFromStored(draftSeats[yourDraftSeatIndex])
            const ownWeaponKey =
              yourDraftSeatIndex === null ? null : draftSeats[yourDraftSeatIndex].weaponKey
            const draftState = {
              seats: map(draftSeats, draftSeatFromStored) as [DraftSeatState, DraftSeatState],
            }
            const ownDisplaySoul =
              ownRolledSoul === null || ownSeat === null
                ? null
                : effectiveSoul(ownRolledSoul, ownSeat.soulBumps)
            return {
              picksTotal: DRAFT_PICK_COUNT,
              yourSeatIndex: yourDraftSeatIndex,
              own:
                ownSeat === null
                  ? null
                  : {
                      loadoutKeys: ownSeat.loadoutKeys,
                      godPool: ownSeat.godPool,
                      currentOffer: ownSeat.currentOffer,
                      picksMade: ownSeat.loadoutKeys.length,
                      isPicksComplete: isSeatDraftComplete(ownSeat),
                      isSpendReady: isSeatSpendReady(ownSeat),
                      waitingReason:
                        yourDraftSeatIndex === null
                          ? null
                          : getSeatWaitingReason(yourDraftSeatIndex as SeatIndex, draftState),
                      rolledSoul: ownRolledSoul,
                      soul: ownDisplaySoul,
                      soulBumps: ownSeat.soulBumps,
                      goldRemaining: ownSeat.goldRemaining,
                      favorLine:
                        ownRolledSoul === null ? null : soulFavorLine(ownRolledSoul),
                      weaponKey: ownWeaponKey,
                      weaponFavorLine:
                        ownWeaponKey === null ? null : weaponFavorLine(ownWeaponKey),
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
        isHost &&
        session.status === 'live' &&
        (phase === 'weapon' || phase === 'draft' || phase === 'match'),
      canEndSession: isHost && session.status === 'live' && phase === 'lobby',
      weapon,
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

    const matchWeaponSeats: NonNullable<Doc<'sessions'>['matchWeaponSeats']> = [
      {
        clerkUserId: hostMember.clerkUserId,
        soul: rollSoulStats(Math.random),
        weaponOffers: generateWeaponOffersFromRandom(Math.random),
        goldRemaining: MATCH_GOLD_GRANT,
      },
      {
        clerkUserId: guestMember.clerkUserId,
        soul: rollSoulStats(Math.random),
        weaponOffers: generateWeaponOffersFromRandom(Math.random),
        goldRemaining: MATCH_GOLD_GRANT,
      },
    ]

    await ctx.db.patch(sessionId, {
      playPhase: 'weapon',
      ...clearMatchFields(),
      matchWeaponSeats,
    })
    return { ok: true as const }
  },
})

export const pickWeapon = mutation({
  args: {
    sessionId: v.id('sessions'),
    weaponKey: v.string(),
  },
  handler: async (ctx, { sessionId, weaponKey }) => {
    const { session, clerkUserId } = await requireMemberSession(ctx, sessionId)
    if (playPhaseOf(session) !== 'weapon') {
      throw new Error('Weapon picks are only allowed during Equipment pick')
    }
    if (session.matchWeaponSeats === undefined || session.matchWeaponSeats.length !== 2) {
      throw new Error('Weapon pick state is missing')
    }

    const seatIndex = seatIndexForClerk(session.matchWeaponSeats, clerkUserId)
    if (seatIndex === null) {
      throw new Error('You are not seated in this Match')
    }

    const currentSeat = session.matchWeaponSeats[seatIndex]
    if (currentSeat.chosenWeaponKey !== undefined) {
      throw new Error('Weapon is already chosen for your seat')
    }
    if (!isValidWeaponPick(currentSeat.weaponOffers, weaponKey)) {
      throw new Error('Weapon is not in your current offers')
    }

    const nextWeaponSeats = [...session.matchWeaponSeats]
    nextWeaponSeats[seatIndex] = {
      ...currentSeat,
      chosenWeaponKey: weaponKey,
    }

    if (!bothSeatsChoseWeapon(nextWeaponSeats)) {
      await ctx.db.patch(sessionId, { matchWeaponSeats: nextWeaponSeats })
      return { ok: true as const, draftStarted: false as const }
    }

    const rng = createDraftRngFromRandom(Math.random)
    const draftState = initializeDraftState(rng)
    const matchDraftSeats: NonNullable<Doc<'sessions'>['matchDraftSeats']> = [
      draftSeatToStored(
        nextWeaponSeats[0].clerkUserId,
        {
          ...draftState.seats[0],
          goldRemaining: nextWeaponSeats[0].goldRemaining ?? MATCH_GOLD_GRANT,
        },
        nextWeaponSeats[0].soul,
        nextWeaponSeats[0].chosenWeaponKey!,
      ),
      draftSeatToStored(
        nextWeaponSeats[1].clerkUserId,
        {
          ...draftState.seats[1],
          goldRemaining: nextWeaponSeats[1].goldRemaining ?? MATCH_GOLD_GRANT,
        },
        nextWeaponSeats[1].soul,
        nextWeaponSeats[1].chosenWeaponKey!,
      ),
    ]

    await ctx.db.patch(sessionId, {
      playPhase: 'draft',
      matchWeaponSeats: undefined,
      matchDraftSeats,
    })
    return { ok: true as const, draftStarted: true as const }
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
      session.matchDraftSeats[seatIndex].weaponKey,
    )

    await ctx.db.patch(sessionId, { matchDraftSeats: nextDraftSeats })
    return { ok: true as const }
  },
})

const soulStatValidator = v.union(
  v.literal('strength'),
  v.literal('speed'),
  v.literal('vitality'),
)

export const adjustSoulBump = mutation({
  args: {
    sessionId: v.id('sessions'),
    stat: soulStatValidator,
    delta: v.union(v.literal(1), v.literal(-1)),
  },
  handler: async (ctx, { sessionId, stat, delta }) => {
    const { session, clerkUserId } = await requireMemberSession(ctx, sessionId)
    if (playPhaseOf(session) !== 'draft') {
      throw new Error('Soul bumps are only allowed during Draft')
    }
    if (session.matchDraftSeats === undefined || session.matchDraftSeats.length !== 2) {
      throw new Error('Draft state is missing')
    }

    const seatIndex = seatIndexForClerk(session.matchDraftSeats, clerkUserId)
    if (seatIndex === null) {
      throw new Error('You are not seated in this Match')
    }

    const storedSeat = session.matchDraftSeats[seatIndex]
    const currentSeat = draftSeatFromStored(storedSeat)
    if (!isSeatDraftComplete(currentSeat)) {
      throw new Error('Finish Draft picks before spending Gold')
    }
    if (currentSeat.spendConfirmed) {
      throw new Error('Soul spend is already confirmed for your seat')
    }

    const adjustment = tryAdjustSoulBump(
      currentSeat.soulBumps,
      currentSeat.goldRemaining,
      stat as SoulStatKey,
      delta,
    )
    if (adjustment === null) {
      throw new Error('That Soul bump adjustment is not allowed')
    }

    const nextSeat: DraftSeatState = {
      ...currentSeat,
      soulBumps: adjustment.bumps,
      goldRemaining: adjustment.goldRemaining,
    }
    const nextDraftSeats = [...session.matchDraftSeats]
    nextDraftSeats[seatIndex] = draftSeatToStored(
      storedSeat.clerkUserId,
      nextSeat,
      storedSeat.soul,
      storedSeat.weaponKey,
    )

    await ctx.db.patch(sessionId, { matchDraftSeats: nextDraftSeats })
    return { ok: true as const }
  },
})

export const confirmSoulSpend = mutation({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, { sessionId }) => {
    const { session, clerkUserId } = await requireMemberSession(ctx, sessionId)
    if (playPhaseOf(session) !== 'draft') {
      throw new Error('Soul spend confirm is only allowed during Draft')
    }
    if (session.matchDraftSeats === undefined || session.matchDraftSeats.length !== 2) {
      throw new Error('Draft state is missing')
    }

    const seatIndex = seatIndexForClerk(session.matchDraftSeats, clerkUserId)
    if (seatIndex === null) {
      throw new Error('You are not seated in this Match')
    }

    const storedSeat = session.matchDraftSeats[seatIndex]
    const currentSeat = draftSeatFromStored(storedSeat)
    if (!isSeatDraftComplete(currentSeat)) {
      throw new Error('Finish Draft picks before confirming Soul spend')
    }
    if (currentSeat.spendConfirmed) {
      throw new Error('Soul spend is already confirmed for your seat')
    }

    const nextSeat: DraftSeatState = {
      ...currentSeat,
      goldRemaining: 0,
      spendConfirmed: true,
    }
    const nextDraftSeats = [...session.matchDraftSeats]
    nextDraftSeats[seatIndex] = draftSeatToStored(
      storedSeat.clerkUserId,
      nextSeat,
      storedSeat.soul,
      storedSeat.weaponKey,
    )

    const draftState = {
      seats: map(nextDraftSeats, draftSeatFromStored) as [DraftSeatState, DraftSeatState],
    }
    if (isDraftComplete(draftState)) {
      await beginLiveFight(ctx, sessionId, nextDraftSeats)
      return { ok: true as const, fightStarted: true as const }
    }

    await ctx.db.patch(sessionId, { matchDraftSeats: nextDraftSeats })
    return { ok: true as const, fightStarted: false as const }
  },
})

export const cancelMatch = mutation({
  args: { sessionId: v.id('sessions') },
  handler: async (ctx, { sessionId }) => {
    const { session } = await requireHostLiveSession(ctx, sessionId)
    const phase = playPhaseOf(session)
    if (phase !== 'weapon' && phase !== 'draft' && phase !== 'match') {
      throw new Error('Match cancel is only allowed during Weapon pick, Draft, or the live fight')
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
    const weaponKeys = weaponKeysFromMatchSeats(session.matchSeats)
    const update = resolveMatchStep({
      seats: engineSeats,
      t,
      seatResolveOrder,
      catalog: ITEM_CATALOG,
      matchStartedAt: expectedStartedAt,
      timeCapMs: DEFAULT_MATCH_TIME_CAP_MS,
      souls,
      weaponKeys,
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
