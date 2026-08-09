import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

const sessionStatus = v.union(v.literal('live'), v.literal('archived'))
const joinRequestStatus = v.union(
  v.literal('pending'),
  v.literal('approved'),
  v.literal('rejected'),
)
const memberRole = v.union(v.literal('dm'), v.literal('player'))

const playPhase = v.union(
  v.literal('lobby'),
  v.literal('weapon'),
  v.literal('draft'),
  v.literal('match'),
  v.literal('results'),
)

const godValidator = v.union(
  v.literal('Hermes'),
  v.literal('Dynamite'),
  v.literal('Hygieia'),
  v.literal('Athena'),
  v.literal('Zeus'),
)

const boonOfferValidator = v.object({
  god: godValidator,
  options: v.array(v.string()),
})

const soulValidator = v.object({
  strength: v.number(),
  speed: v.number(),
  vitality: v.number(),
})

const weaponSeatValidator = v.object({
  clerkUserId: v.string(),
  soul: soulValidator,
  weaponOffers: v.array(v.string()),
  chosenWeaponKey: v.optional(v.string()),
})

const draftSeatValidator = v.object({
  clerkUserId: v.string(),
  loadoutKeys: v.array(v.string()),
  godPool: v.array(godValidator),
  currentOffer: v.optional(boonOfferValidator),
  soul: soulValidator,
  weaponKey: v.string(),
})

const seatIndex = v.union(v.literal(0), v.literal(1))

const loadoutSlotValidator = v.object({
  itemKey: v.string(),
  nextReadyAt: v.optional(v.number()),
  lastChargeCooldownMs: v.optional(v.number()),
})

const engineSeatValidator = v.object({
  life: v.number(),
  shield: v.number(),
  slots: v.array(loadoutSlotValidator),
})

const matchSeatValidator = v.object({
  clerkUserId: v.string(),
  life: v.number(),
  shield: v.number(),
  slots: v.array(loadoutSlotValidator),
  soul: soulValidator,
  weaponKey: v.string(),
})

const matchFireValidator = v.object({
  seat: seatIndex,
  slotIndex: v.number(),
  itemKey: v.string(),
  effect: v.union(v.literal('damage'), v.literal('heal'), v.literal('shield')),
  potency: v.number(),
})

const animationHintValidator = v.object({
  kind: v.union(v.literal('damage'), v.literal('heal'), v.literal('shield')),
  seat: seatIndex,
  slotIndex: v.number(),
})

const matchOutcomeValidator = v.union(
  v.object({ type: v.literal('winner'), seat: seatIndex }),
  v.object({ type: v.literal('draw') }),
  v.object({ type: v.literal('continue') }),
)

const matchUpdateValidator = v.object({
  atMs: v.number(),
  fires: v.array(matchFireValidator),
  seats: v.array(engineSeatValidator),
  animationHints: v.array(animationHintValidator),
  outcome: matchOutcomeValidator,
  nextWakeAt: v.optional(v.number()),
})

export default defineSchema({
  sessions: defineTable({
    title: v.string(),
    status: sessionStatus,
    dmClerkUserId: v.string(),
    joinToken: v.string(),
    createdAt: v.number(),
    /** Lobby / Match / brief results beat for the item auto-battler play path. */
    playPhase: v.optional(playPhase),
    /**
     * Admitted fighting Players (Host counts). Patched on approve so concurrent
     * approvals OCC-conflict on the Session doc and cannot seat a third Player.
     */
    fightingPlayerCount: v.optional(v.number()),
    matchStartedAt: v.optional(v.number()),
    matchSeatResolveOrder: v.optional(v.array(seatIndex)),
    matchWeaponSeats: v.optional(v.array(weaponSeatValidator)),
    matchDraftSeats: v.optional(v.array(draftSeatValidator)),
    matchSeats: v.optional(v.array(matchSeatValidator)),
    matchLastUpdate: v.optional(matchUpdateValidator),
    matchOutcome: v.optional(
      v.union(
        v.object({ type: v.literal('winner'), seat: seatIndex }),
        v.object({ type: v.literal('draw') }),
      ),
    ),
    matchWakeJobId: v.optional(v.id('_scheduled_functions')),
  }).index('by_joinToken', ['joinToken']),

  joinRequests: defineTable({
    sessionId: v.id('sessions'),
    clerkUserId: v.string(),
    status: joinRequestStatus,
    createdAt: v.number(),
  })
    .index('by_session_and_status', ['sessionId', 'status'])
    .index('by_session_and_clerkUserId', ['sessionId', 'clerkUserId']),

  sessionMembers: defineTable({
    sessionId: v.id('sessions'),
    clerkUserId: v.string(),
    role: memberRole,
    sessionNickname: v.optional(v.string()),
  })
    .index('by_session', ['sessionId'])
    .index('by_session_and_clerkUserId', ['sessionId', 'clerkUserId'])
    .index('by_clerkUserId', ['clerkUserId']),
})
