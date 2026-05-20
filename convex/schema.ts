import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { characterSheetValidator } from './characterSheetValidators'
import { characterClassKeyValidator } from './characterClasses'

const sessionStatus = v.union(v.literal('live'), v.literal('archived'))
const joinRequestStatus = v.union(
  v.literal('pending'),
  v.literal('approved'),
  v.literal('rejected'),
)
const memberRole = v.union(v.literal('dm'), v.literal('player'))

const statsValidator = v.object({
  hp: v.number(),
  maxHp: v.number(),
  tempHp: v.optional(v.number()),
})

export default defineSchema({
  sessions: defineTable({
    title: v.string(),
    status: sessionStatus,
    dmClerkUserId: v.string(),
    joinToken: v.string(),
    createdAt: v.number(),
    /** Battle map width in hex columns (fixed grid origin; grow appends trailing, shrink strips trailing). */
    mapCols: v.optional(v.number()),
    /** Battle map height in hex rows. */
    mapRows: v.optional(v.number()),
    /** Ordered **Session character** ids for **Turn order** (manual **Dungeon Master** queue). */
    turnOrderCharacterIds: v.optional(v.array(v.id('sessionCharacters'))),
    /** **Combat round clock (session)** — active flag. */
    combatRoundActive: v.optional(v.boolean()),
    /** Current combat round (≥1 while active). */
    combatRoundNumber: v.optional(v.number()),
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
    boundCharacterId: v.optional(v.id('sessionCharacters')),
    sessionNickname: v.optional(v.string()),
    /** Player’s preferred **Character class** when joining or before a sheet is bound (optional). */
    preferredCharacterClassKey: v.optional(characterClassKeyValidator),
  })
    .index('by_session', ['sessionId'])
    .index('by_session_and_clerkUserId', ['sessionId', 'clerkUserId'])
    .index('by_clerkUserId', ['clerkUserId']),

  sessionCharacters: defineTable({
    sessionId: v.id('sessions'),
    name: v.string(),
    /** Playable roster flag; authoritative when present. Legacy `isNpc` is migrated on read/write. */
    isPlayable: v.optional(v.boolean()),
    /** @deprecated Legacy inversion of `isPlayable`; stripped on canonical replace. */
    isNpc: v.optional(v.boolean()),
    /** @deprecated Class lives on `sheet.classLevels`; stripped on canonical replace. */
    characterClassKey: v.optional(characterClassKeyValidator),
    stats: statsValidator,
    boundClerkUserId: v.optional(v.string()),
    /** Bumped on server-side sheet recalc so clients re-hydrate after combat mutations. */
    sheetRevision: v.optional(v.number()),
    /** Odd-r offset column within session map footprint; unset means unplaced. */
    mapCol: v.optional(v.number()),
    mapRow: v.optional(v.number()),
    /** D&D 5e PHB-style **Character sheet** (structured header + plain text blocks); see CONTEXT.md. */
    sheet: v.optional(characterSheetValidator),
  }).index('by_session', ['sessionId']),
})
