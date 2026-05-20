<script setup lang="ts">
import { watch, ref } from 'vue'
import { useAuth, useSession } from '@clerk/vue'
import { useConvexClient } from '../composables/convexClient'
import { provideConvexAuth } from '../composables/convexAuth'

const client = useConvexClient()
const { isLoaded: clerkLoaded, isSignedIn: clerkSignedIn, getToken } = useAuth()
const { session } = useSession()
const convexTokenReady = ref(false)
const warnedTokenFailure = ref(false)

provideConvexAuth({
  clerkLoaded,
  clerkSignedIn,
  convexTokenReady,
})

async function fetchClerkJwt(forceRefreshToken: boolean): Promise<string | null> {
  const sessionRef = session.value
  if (sessionRef !== null && sessionRef !== undefined) {
    try {
      const fromSession = await sessionRef.getToken({
        template: 'convex',
        skipCache: forceRefreshToken,
      })
      if (fromSession) {
        return fromSession
      }
    } catch {
      // fall through
    }
  }
  const getTokenFn = getToken.value
  if (typeof getTokenFn !== 'function') {
    return null
  }
  try {
    const templated = await getTokenFn({ template: 'convex', skipCache: forceRefreshToken })
    if (templated) {
      return templated
    }
  } catch {
    // fall through
  }
  try {
    return (await getTokenFn({ skipCache: forceRefreshToken })) ?? null
  } catch {
    return null
  }
}

watch(
  [clerkLoaded, clerkSignedIn, session],
  () => {
    if (!clerkLoaded.value) {
      convexTokenReady.value = false
      return
    }
    if (!clerkSignedIn.value) {
      convexTokenReady.value = false
      client.setAuth(async () => null)
      return
    }
    client.setAuth(
      async ({ forceRefreshToken }) => {
        const token = await fetchClerkJwt(forceRefreshToken)
        if (token) {
          convexTokenReady.value = true
          return token
        }
        convexTokenReady.value = false
        if (import.meta.env.DEV && !warnedTokenFailure.value) {
          warnedTokenFailure.value = true
          console.warn(
            'Clerk did not return a Convex JWT. In the Clerk dashboard, add a JWT template named "convex" and set CLERK_JWT_ISSUER_DOMAIN in Convex env vars.',
          )
        }
        return null
      },
      () => {
        convexTokenReady.value = false
      },
    )
    // Prime auth without waiting for a query/mutation (avoids "Connecting…" deadlock).
    void fetchClerkJwt(false).then((token) => {
      convexTokenReady.value = token !== null
      if (!token && import.meta.env.DEV && !warnedTokenFailure.value) {
        warnedTokenFailure.value = true
        console.warn(
          'Clerk did not return a Convex JWT. In the Clerk dashboard, add a JWT template named "convex" and set CLERK_JWT_ISSUER_DOMAIN in Convex env vars.',
        )
      }
    })
  },
  { immediate: true, flush: 'post' },
)
</script>

<template>
  <slot />
</template>
