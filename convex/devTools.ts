import { internalMutation } from './_generated/server'

/**
 * Wipes all session-scoped tables (dev only).
 *
 * Required before deploying a god catalog rename (schema `godValidator` and catalog keys
 * — e.g. Dynamite→Ares, Hygieia→Apollo): run this, or have every live **Session**
 * **Match cancel** back to **Lobby** and clear in-flight draft/match state, so no
 * persisted old god names or `*_` keys remain. Otherwise in-flight `godPool` /
 * `currentOffer.god` / loadout keys will fail validation or orphan.
 *
 * Run: `npx convex run devTools:devClearAllSessionData`
 */
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
