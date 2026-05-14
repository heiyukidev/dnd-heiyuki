<script setup lang="ts">
import { watch, ref } from 'vue'
import { useAuth } from '@clerk/vue'
import { useConvexClient } from '../composables/convexClient'

const client = useConvexClient()
const { isLoaded, isSignedIn, getToken, sessionClaims } = useAuth()
const warnedTokenFailure = ref(false)

watch(
  [isLoaded, isSignedIn, sessionClaims],
  () => {
    if (!isLoaded.value) {
      return
    }
    if (!isSignedIn.value) {
      client.setAuth(async () => null)
      return
    }
    client.setAuth(
      async ({ forceRefreshToken }) => {
        try {
          if (sessionClaims.value?.aud === 'convex') {
            return (await getToken.value({ skipCache: forceRefreshToken })) ?? null
          }
          return (
            (await getToken.value({
              template: 'convex',
              skipCache: forceRefreshToken,
            })) ?? null
          )
        } catch {
          if (import.meta.env.DEV && !warnedTokenFailure.value) {
            warnedTokenFailure.value = true
            console.warn('Clerk token for Convex failed')
          }
          return null
        }
      },
      () => {},
    )
  },
  { immediate: true, flush: 'post' },
)
</script>

<template></template>
