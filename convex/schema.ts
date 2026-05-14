import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

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
})

export default defineSchema({
  sessions: defineTable({
    title: v.string(),
    status: sessionStatus,
    dmClerkUserId: v.string(),
    joinToken: v.string(),
    createdAt: v.number(),
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
  })
    .index('by_session_and_clerkUserId', ['sessionId', 'clerkUserId'])
    .index('by_clerkUserId', ['clerkUserId']),

  sessionCharacters: defineTable({
    sessionId: v.id('sessions'),
    name: v.string(),
    isNpc: v.boolean(),
    stats: statsValidator,
    boundClerkUserId: v.optional(v.string()),
  }).index('by_session', ['sessionId']),
})
