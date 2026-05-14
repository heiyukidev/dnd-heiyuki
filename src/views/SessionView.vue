<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { Id } from '../../convex/_generated/dataModel'
import { api } from '../../convex/_generated/api'
import { useConvexClient } from '../composables/convexClient'
import { useConvexQuery } from '../composables/useConvexQuery'

const props = defineProps<{
  id: string
}>()

const client = useConvexClient()
const route = useRoute()

const rawSessionParam = computed(() => (props.id || String(route.params.id ?? '')).trim())

function parseSessionsRouteId(raw: string): Id<'sessions'> | null {
  if (!raw || raw.length > 128) {
    return null
  }
  if (!/^[a-z0-9]+$/i.test(raw)) {
    return null
  }
  return raw as Id<'sessions'>
}

const sessionId = computed(() => parseSessionsRouteId(rawSessionParam.value))

const invalidSessionRoute = computed(() => parseSessionsRouteId(rawSessionParam.value) === null)

const { data: bundle, error: bundleError } = useConvexQuery(
  client,
  api.sessions.getMyMembership,
  () => (sessionId.value !== null ? { sessionId: sessionId.value } : 'skip'),
)

const { data: joinRequests, error: joinRequestsError } = useConvexQuery(
  client,
  api.sessions.listJoinRequests,
  () =>
    bundle.value?.membership?.role === 'dm' && sessionId.value !== null
      ? { sessionId: sessionId.value }
      : 'skip',
)

const joinRequestsList = computed(() => joinRequests.value ?? [])

const joinRequestsLoading = computed(
  () => joinRequests.value === undefined && !joinRequestsError.value,
)

const approveError = ref<string | null>(null)

const joinToken = computed(() => {
  const s = bundle.value?.session
  if (!s || !('joinToken' in s)) {
    return undefined
  }
  return (s as { joinToken?: string }).joinToken
})

function joinHref(token: string) {
  return `${window.location.origin}/join/${token}`
}

async function approve(requestId: Id<'joinRequests'>) {
  approveError.value = null
  try {
    await client.mutation(api.sessions.approveJoinRequest, { requestId })
  } catch {
    approveError.value = 'Could not approve request. Try again.'
  }
}
</script>

<template>
  <div class="page">
    <p v-if="invalidSessionRoute" class="muted">
      This session link is not valid. Check the URL or open the session from your home page.
    </p>
    <p v-else-if="bundleError" class="error">
      Could not load this session. {{ bundleError.message }}
    </p>
    <p v-else-if="bundle === undefined" class="muted">Loading…</p>
    <p v-else-if="!bundle.session" class="muted">
      You do not have access to this session, or it does not exist.
    </p>
    <template v-else>
      <h1>{{ bundle.session.title }}</h1>
      <p class="muted">Status: {{ bundle.session.status }}</p>
      <p v-if="bundle.membership">
        Your role:
        <strong>{{ bundle.membership.role }}</strong>
      </p>
      <section v-if="joinToken" class="card">
        <h2>Join link</h2>
        <p class="mono">{{ joinHref(joinToken) }}</p>
      </section>
      <section v-if="bundle.membership?.role === 'dm'" class="card">
        <h2>Pending join requests</h2>
        <p v-if="joinRequestsError" class="error">
          Could not load join requests. {{ joinRequestsError.message }}
        </p>
        <p v-else-if="joinRequestsLoading" class="muted">Loading…</p>
        <p v-else-if="joinRequests && !joinRequestsList.length" class="muted">
          No pending requests.
        </p>
        <ul v-else-if="joinRequestsList.length" class="list">
          <li v-for="req in joinRequestsList" :key="req._id">
            <span class="mono">{{ req.clerkUserId }}</span>
            <button type="button" class="btn-small" @click="approve(req._id)">Approve</button>
          </li>
        </ul>
        <p v-if="approveError" class="error">{{ approveError }}</p>
      </section>
    </template>
  </div>
</template>

<style scoped>
.page {
  max-width: 720px;
}
.card {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px 20px;
  margin-top: 16px;
  background: color-mix(in srgb, var(--bg) 92%, var(--border));
}
.muted {
  color: var(--text);
  opacity: 0.85;
}
.error {
  color: var(--text);
  font-size: 0.92rem;
}
.mono {
  font-family: var(--mono);
  font-size: 0.85rem;
  word-break: break-all;
}
.list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.list li {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.btn-small {
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--bg);
  padding: 6px 10px;
  font: inherit;
  cursor: pointer;
}
</style>
