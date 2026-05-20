import { internalMutation } from './_generated/server'
import { canonicalSessionCharacterReplace } from './sessionCharacterPersist'

/** Wipes all session-scoped tables (dev only). Run: `npx convex run devTools:devClearAllSessionData` */
export const devClearAllSessionData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const joinRequests = await ctx.db.query('joinRequests').collect()
    for (const row of joinRequests) {
      await ctx.db.delete(row._id)
    }
    const members = await ctx.db.query('sessionMembers').collect()
    for (const row of members) {
      await ctx.db.delete(row._id)
    }
    const characters = await ctx.db.query('sessionCharacters').collect()
    for (const row of characters) {
      await ctx.db.delete(row._id)
    }
    const sessions = await ctx.db.query('sessions').collect()
    for (const row of sessions) {
      await ctx.db.delete(row._id)
    }
    return {
      deleted: {
        joinRequests: joinRequests.length,
        sessionMembers: members.length,
        sessionCharacters: characters.length,
        sessions: sessions.length,
      },
    }
  },
})

/** Strips legacy `characterClassKey` / `isNpc` from every character document. */
export const migrateSessionCharactersLegacyFields = internalMutation({
  args: {},
  handler: async (ctx) => {
    const characters = await ctx.db.query('sessionCharacters').collect()
    let migrated = 0
    for (const c of characters) {
      const raw = c as Record<string, unknown>
      const hasLegacy = raw.characterClassKey !== undefined || raw.isNpc !== undefined
      if (!hasLegacy && c.isPlayable !== undefined) {
        continue
      }
      await canonicalSessionCharacterReplace(ctx, c)
      migrated += 1
    }
    return { total: characters.length, migrated }
  },
})
