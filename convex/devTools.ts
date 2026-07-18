import { internalMutation } from './_generated/server'

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
    const sessions = await ctx.db.query('sessions').collect()
    for (const row of sessions) {
      await ctx.db.delete(row._id)
    }
    return {
      deleted: {
        joinRequests: joinRequests.length,
        sessionMembers: members.length,
        sessions: sessions.length,
      },
    }
  },
})
